import User from "../../models/usersModel.js"
import Organization from "../../models/organizationModel.js";

export const updateUserById = async (req, res) => {
  const { id } = req.params;
  let updateData = req.body;

  try {
    // Handle organizationCode if provided
    if (updateData.organizationCode) {
      const organization = await Organization.findOne({
        organizationCode: updateData.organizationCode.toUpperCase(),
      });

      if (!organization) {
        return res.status(404).json({
          success: false,
          message: `Organization '${updateData.organizationCode}' not found.`,
        });
      }

      updateData.organization = organization._id;

      delete updateData.organizationCode;
    }

    const user = await User.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true,
    }).populate({
      path: "organization",
      select: "organizationCode",
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "User updated successfully",
      user,
    });
  } catch (error) {
    console.error("Error updating user:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update user",
      error: error.message,
    });
  }
};