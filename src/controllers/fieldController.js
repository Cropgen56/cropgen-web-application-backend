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
    } = req.body;
    // Validate the input fields
    if (
      !userId ||
      !latlng ||
      !cropName ||
      !variety ||
      !sowingDate ||
      !typeOfIrrigation ||
      !farmName
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
