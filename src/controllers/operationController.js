import Operation from "../models/operationModel.js";
import FarmField from "../models/fieldModel.js";

// Create a new operation for a specific farm field
export const addOperation = async (req, res) => {
  try {
    const { farmFieldId } = req.params;

    const {
      supervisorName,
      operationType,
      chemicalUsed,
      chemicalQuantity,
      progress,
      labourMale,
      labourFemale,
      estimatedCost,
      comments,
      operationDate,
      operationTime,
    } = req.body;

    // Validate required fields
    if (!farmFieldId || !operationType || !operationDate || !operationTime) {
      return res.status(400).json({ message: "Required fields are missing" });
    }

    // Validate date format (YYYY-MM-DD)
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(operationDate)) {
      return res
        .status(400)
        .json({ message: "operationDate must be in YYYY-MM-DD format" });
    }

    // Validate time format (HH:mm:ss)
    const timeRegex = /^\d{2}:\d{2}:\d{2}$/;
    if (!timeRegex.test(operationTime)) {
      return res
        .status(400)
        .json({ message: "operationTime must be in HH:mm:ss format" });
    }

    // Check if the farm field exists
    const farmField = await FarmField.findById(farmFieldId);

    if (!farmField) {
      return res
        .status(404)
        .json({ success: false, message: "Farm field not found" });
    }

    // Create the new operation
    const newOperation = new Operation({
      farmField: farmFieldId,
      supervisorName,
      operationType,
      chemicalUsed,
      chemicalQuantity,
      progress,
      labourMale: labourMale ? Number(labourMale) : undefined,
      labourFemale: labourFemale ? Number(labourFemale) : undefined,
      estimatedCost: estimatedCost ? Number(estimatedCost) : undefined,
      comments,
      operationDate,
      operationTime,
    });

    // Save the operation in the database
    const savedOperation = await newOperation.save();

    // Respond with success
    res.status(201).json({
      success: true,
      message: "Operation created successfully",
      operation: savedOperation,
    });
  } catch (error) {
    console.error("Error adding operation:", error);
    res
      .status(500)
      .json({ success: false, message: "Server error", error: error.message });
  }
};

// Get all operations for a specific farm field
export const getOperationsByFarmField = async (req, res) => {
  try {
    const { farmFieldId } = req.params;

    // Check if the farm field exists
    const farmField = await FarmField.findById(farmFieldId);
    if (!farmField) {
      return res
        .status(404)
        .json({ success: false, message: "Farm field not found" });
    }

    // Query operations with selective fields for optimization
    const operations = await Operation.find({ farmField: farmFieldId })
      .select(
        "supervisorName operationType progress chemicalUsed chemicalQuantity labourMale labourFemale estimatedCost comments createdAt operationDate operationTime"
      )
      .lean();

    res.status(200).json({
      success: true,
      operations,
    });
  } catch (error) {
    console.error("Error fetching operations:", error);
    res
      .status(500)
      .json({ success: false, message: "Server error", error: error.message });
  }
};

// Get a single operation by ID
export const getOperationById = async (req, res) => {
  try {
    const { operationId } = req.params;

    // Find operation with selective fields
    const operation = await Operation.findById(operationId)
      .select(
        "supervisorName operationType progress chemicalUsed chemicalQuantity labourMale labourFemale estimatedCost comments farmField createdAt"
      )
      .populate("farmField", "fieldName cropName")
      .lean();

    if (!operation) {
      return res
        .status(404)
        .json({ success: false, message: "Operation not found" });
    }

    res.status(200).json({
      success: true,
      operation,
    });
  } catch (error) {
    console.error("Error fetching operation:", error);
    res
      .status(500)
      .json({ success: false, message: "Server error", error: error.message });
  }
};

// Update an existing operation
export const updateOperation = async (req, res) => {
  try {
    const { operationId } = req.params;
    const {
      supervisorName,
      operationType,
      chemicalUsed,
      chemicalQuantity,
      progress,
      labourMale,
      labourFemale,
      estimatedCost,
      comments,
    } = req.body;

    // Validate required fields
    if (!supervisorName || !operationType || !progress) {
      return res.status(400).json({ message: "Required fields are missing" });
    }

    // Find and update operation
    const updatedOperation = await Operation.findByIdAndUpdate(
      operationId,
      {
        supervisorName,
        operationType,
        chemicalUsed,
        chemicalQuantity,
        progress,
        labourMale: labourMale ? Number(labourMale) : undefined,
        labourFemale: labourFemale ? Number(labourFemale) : undefined,
        estimatedCost: estimatedCost ? Number(estimatedCost) : undefined,
        comments,
      },
      { new: true, runValidators: true } // Return updated document and run schema validators
    );

    if (!updatedOperation) {
      return res
        .status(404)
        .json({ success: false, message: "Operation not found" });
    }

    res.status(200).json({
      success: true,
      message: "Operation updated successfully",
      operation: updatedOperation,
    });
  } catch (error) {
    console.error("Error updating operation:", error);
    res
      .status(500)
      .json({ success: false, message: "Server error", error: error.message });
  }
};

// Delete an operation
export const deleteOperation = async (req, res) => {
  try {
    const { operationId } = req.params;

    // Find and delete operation
    const deletedOperation = await Operation.findByIdAndDelete(operationId);

    if (!deletedOperation) {
      return res
        .status(404)
        .json({ success: false, message: "Operation not found" });
    }

    res.status(200).json({
      success: true,
      message: "Operation deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting operation:", error);
    res
      .status(500)
      .json({ success: false, message: "Server error", error: error.message });
  }
};

// Refreshed addField controller (optimized)
export const addField = async (req, res) => {
  try {
    const { userId } = req.params;
    const {
      latlng,
      cropName,
      variety,
      sowingDate,
      typeOfIrrigation,
      farmName,
      acre,
      typeOfFarming,
    } = req.body;

    // Validate required fields
    if (
      !userId ||
      !latlng ||
      !cropName ||
      !variety ||
      !sowingDate ||
      !typeOfIrrigation ||
      !farmName ||
      !acre ||
      !typeOfFarming
    ) {
      return res.status(400).json({ message: "All fields are required" });
    }

    // Validate latlng format
    if (
      !Array.isArray(latlng) ||
      latlng.some((coord) => !coord.lat || !coord.lng)
    ) {
      return res.status(400).json({ message: "Invalid latlng format" });
    }

    // Check if the user exists
    const user = await User.findById(userId).select("_id").lean();
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    // Create the new farm field
    const newFarmField = new FarmField({
      field: latlng,
      user: userId,
      fieldName: farmName,
      cropName,
      variety,
      sowingDate,
      typeOfIrrigation,
      acre: Number(acre),
      typeOfFarming,
    });

    // Save the farm field
    const savedFarmField = await newFarmField.save();

    // Respond with success
    res.status(201).json({
      success: true,
      message: "Farm field created successfully",
      farmField: savedFarmField,
    });
  } catch (error) {
    console.error("Error adding farm field:", error);
    res
      .status(500)
      .json({ success: false, message: "Server error", error: error.message });
  }
};
