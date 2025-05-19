import Organization from "../models/organizationModel.js";

export const createOrganization = async (req, res) => {
  try {
    const { organizationName, organizationCode, address, email, phoneNumber } =
      req.body;

    // Check required fields
    if (!organizationName || !organizationCode) {
      return res.status(400).json({
        success: false,
        message: "Organization name and code are required.",
      });
    }

    // Check for existing organization code
    const existingOrg = await Organization.findOne({
      organizationCode: organizationCode.toUpperCase(),
    });

    if (existingOrg) {
      return res.status(409).json({
        success: false,
        message: "Organization code already exists.",
      });
    }

    // Create organization
    const organization = await Organization.create({
      organizationName,
      organizationCode,
      address,
      email,
      phoneNumber,
    });

    return res.status(201).json({
      success: true,
      message: "Organization created successfully.",
      data: organization,
    });
  } catch (error) {
    console.error("Create Organization Error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error.",
      error: error.message,
    });
  }
};
