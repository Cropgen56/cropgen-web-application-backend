import FarmField from "../models/fieldModel.js";
import User from "../models/usersModel.js";

// Add a new farm field for a particular user
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

    // Validate the input fields all are required
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
    // Check if the user exists
    const user = await User.findById(userId);
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    // Create the new farm field
    const newFarmField = new FarmField({
      field: latlng,
      user: userId,
      cropName,
      variety,
      sowingDate,
      typeOfIrrigation,
      fieldName: farmName,
      acre: acre,
      typeOfFarming,
    });

    // Save the farm field in the database
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

// Get all farm fields for a particular user
export const getField = async (req, res) => {
  try {
    const { userId } = req.params;

    if (!userId) {
      return res.status(400).json({ message: "User ID is required" });
    }

    const user = await User.findById(userId);

    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    const farmFields = await FarmField.find({ user: userId });

    if (farmFields.length === 0) {
      return res
        .status(404)
        .json({ message: "No farm fields found for this user" });
    }

    res.status(200).json({
      message: "Farm fields retrieved successfully",
      farmFields,
    });
  } catch (error) {
    console.error("Error fetching farm fields:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// get all field
export const getAllField = async (req, res) => {
  try {
    const farms = await FarmField.find();

    // Check if there are users found
    if (!farms || farms.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No users found.",
      });
    }

    // Return the complete user data as-is
    res.status(200).json({
      success: true,
      message: "Farms fetched successfully.",
      farms: farms,
    });
  } catch (error) {
    console.error("Error fetching Farms:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch Farms.",
      error: error.message,
    });
  }
};

// Delete a specific farm field by its ID
export const deleteField = async (req, res) => {
  try {
    const farmFieldId = req.params.fieldId;

    if (!farmFieldId) {
      return res.status(400).json({ message: "Farm field ID is required" });
    }

    const deletedFarmField = await FarmField.findByIdAndDelete(farmFieldId);

    if (!deletedFarmField) {
      return res.status(404).json({ message: "Farm field not found" });
    }

    res.status(200).json({
      message: "Farm field deleted successfully",
      farmField: deletedFarmField,
    });
  } catch (error) {
    console.error("Error deleting farm field:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Update a specific farm field by its ID
export const updateField = async (req, res) => {
  const { fieldId } = req.params;
  const updateData = req.body;

  try {
    // Validate if fieldId is provided
    if (!fieldId) {
      return res
        .status(400)
        .json({ success: false, message: "Field ID is required." });
    }

    // Validate if update data is not empty
    if (!updateData || Object.keys(updateData).length === 0) {
      return res
        .status(400)
        .json({ success: false, message: "Update data cannot be empty." });
    }

    // Check if the field exists
    const fieldExists = await FarmField.findById(fieldId);
    if (!fieldExists) {
      return res
        .status(404)
        .json({ success: false, message: "Farm field not found." });
    }

    // Perform the update
    const updatedField = await FarmField.findByIdAndUpdate(
      fieldId,
      { $set: updateData },
      { new: true, runValidators: true }
    );

    // Respond with the updated field
    return res.status(200).json({
      success: true,
      message: "Farm field updated successfully.",
      farmField: updatedField,
    });
  } catch (error) {
    console.error("Error updating farm field:", error.message);
    // Handle specific Mongoose validation errors
    if (error.name === "ValidationError") {
      return res.status(400).json({
        success: false,
        message: "Validation error.",
        error: error.message,
      });
    }

    // Handle other server errors
    return res.status(500).json({
      success: false,
      message: "Server error occurred while updating the farm field.",
      error: error.message,
    });
  }
};
