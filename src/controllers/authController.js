import jwt from "jsonwebtoken";
import User from "../models/usersModel.js";
import Organization from "../models/organizationModel.js";
import { OAuth2Client } from "google-auth-library";
import nodemailer from "nodemailer";
import admin from "firebase-admin";
import crypto from "crypto";

const clientMobile = new OAuth2Client(process.env.MOBILE_GOOGLE_CLIENT_ID);

// Configure nodemailer transport
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// Google login controller
export const googleLoginMobile = async (req, res) => {
  try {
    const { token } = req.body;

    // Verify token with Google
    const ticket = await clientMobile.verifyIdToken({
      idToken: token,
      audience: process.env.MOBILE_GOOGLE_CLIENT_ID,
    });

    const payloadData = ticket.getPayload();

    const { email, name, picture, sub } = payloadData;

    // Split full name into first and last name
    const nameParts = name.split(" ");
    const firstName = nameParts[0];
    const lastName = nameParts.slice(1).join(" ") || "";

    // Check if the user already exists in the database
    let user = await User.findOne({ email });

    // Convert code to uppercase or default to 'CROPGEN'
    const orgCode = "CROPGEN";

    // Find organization (case-insensitive, always uppercase)
    const organization = await Organization.findOne({
      organizationCode: orgCode,
    });

    if (!organization) {
      return res.status(404).json({
        success: false,
        message: `Organization '${orgCode}' not found.`,
      });
    }

    if (!user) {
      // If the user does not exist, create a new one
      user = new User({
        firstName,
        lastName,
        email,
        role: "farmer",
        terms: true,
        organization: organization._id,
      });

      await user.save();
    }

    // Generate JWT Token for authentication
    const payload = {
      id: user._id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      role: user.role,
      organization: user.organization,
    };
    const accessToken = jwt.sign(payload, JWT_SECRET, { expiresIn: "15d" });

    res.json({ success: true, accessToken, user });
  } catch (error) {
    res
      .status(400)
      .json({ success: false, message: "Invalid Google Token", error });
  }
};

// admin login
export const signin = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required.",
      });
    }

    // Check for existing user
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found.",
      });
    }

    // Verify password
    if (password !== user.password) {
      return res.status(401).json({
        success: false,
        message: "Invalid password.",
      });
    }

    // Fetch organization
    const organization = await Organization.findById(user.organization);
    if (!organization) {
      return res.status(404).json({
        success: false,
        message: "Organization not found.",
      });
    }

    // Generate JWT token
    const token = jwt.sign(
      {
        id: user._id,
        email: user.email,
        role: user.role,
        organization: user.organization,
      },
      process.env.JWT_ACCESS_SECRET,
      { expiresIn: "15d" }
    );

    // Return response
    return res.status(200).json({
      success: true,
      message: "User signed in successfully.",
      token,
      role: user.role,
      user: {
        id: user._id,
        email: user.email,
        role: user.role,
        organizationCode: organization.organizationCode,
      },
    });
  } catch (error) {
    console.error("Login Error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error.",
      error: error.message,
    });
  }
};

// Forgot Password Handler
export const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    // Check if user exists
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Generate reset token (store directly without hashing)
    const resetToken = crypto.randomBytes(32).toString("hex");

    // Set token and expiry on user
    user.resetPasswordToken = resetToken;
    user.resetPasswordExpires = Date.now() + 3600000;
    await user.save();

    // Create reset URL
    const resetUrl = `${process.env.FRONTEND_URL}/reset-password/${resetToken}`;

    // Email configuration
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: "Password Reset Request",
      html: `
        <h2>Password Reset</h2>
        <p>You requested a password reset. Click the link below to reset your password:</p>
        <a href="${resetUrl}">Reset Password</a>
        <p>This link will expire in 1 hour.</p>
        <p>If you didn't request this, please ignore this email.</p>
      `,
    };

    // Send email
    await transporter.sendMail(mailOptions);

    res.status(200).json({ message: "Password reset email sent" });
  } catch (error) {
    console.error("Error in forgotPassword:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Reset Password Handler
export const resetPassword = async (req, res) => {
  try {
    const { token, newPassword } = req.body;

    // Find user with valid token and non-expired
    const user = await User.findOne({
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({ message: "Invalid or expired token" });
    }

    // Directly save the new password (no hashing)
    user.password = newPassword;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    res.status(200).json({ message: "Password reset successful" });
  } catch (error) {
    console.error("Error in resetPassword:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Fetch all users (paginated by default). Admins/developers can pass ?all=true to fetch every user.
export const getAllUsers = async (req, res) => {
  try {
    const { role, organization } = req.user;
    const { page = 1, limit = 10, all = "false" } = req.query;

    // Role check: only these roles can view users at all
    if (!["admin", "developer", "client"].includes(role)) {
      return res.status(403).json({
        success: false,
        message: "Access denied. You do not have permission to view users!",
      });
    }

    // Base query: clients only see users from their organization
    const baseQuery = role === "client" ? { organization } : {};

    // If "all=true" requested, only allow for admin/developer
    const wantsAll = String(all).toLowerCase() === "true";
    if (wantsAll && !["admin", "developer"].includes(role)) {
      return res.status(403).json({
        success: false,
        message: "Only admin or developer can fetch all users.",
      });
    }

    // Build query and options
    const finalQuery = { ...baseQuery };

    // sanitize and parse pagination params
    const parsedLimit = Math.max(0, parseInt(limit, 10) || 10);
    const parsedPage = Math.max(1, parseInt(page, 10) || 1);

    let users;
    let totalUsers;

    if (wantsAll) {
      // Fetch every matching user (no pagination). Be careful with very large collections.
      users = await User.find(finalQuery)
        .select("-password -__v")
        .populate({ path: "organization", select: "organizationCode" })
        .lean();
      totalUsers = users.length;
    } else {
      const skip = (parsedPage - 1) * parsedLimit;

      // fetch paginated results
      users = await User.find(finalQuery)
        .select("-password -__v")
        .populate({ path: "organization", select: "organizationCode" })
        .skip(skip)
        .limit(parsedLimit)
        .lean();

      totalUsers = await User.countDocuments(finalQuery);
    }

    // If you prefer empty result rather than 404 when no users found, change status accordingly.
    if (!users || users.length === 0) {
      return res.status(200).json({
        success: true,
        message: "No users found.",
        users: [],
        pagination: wantsAll
          ? { returned: 0, totalUsers: 0 }
          : {
              currentPage: parsedPage,
              totalPages:
                parsedLimit > 0 ? Math.ceil(totalUsers / parsedLimit) : 1,
              totalUsers,
              limit: parsedLimit,
            },
      });
    }

    // Success response
    return res.status(200).json({
      success: true,
      message: "Users fetched successfully.",
      users,
      pagination: wantsAll
        ? { returned: users.length, totalUsers }
        : {
            currentPage: parsedPage,
            totalPages:
              parsedLimit > 0 ? Math.ceil(totalUsers / parsedLimit) : 1,
            totalUsers,
            limit: parsedLimit,
          },
    });
  } catch (error) {
    console.error("Error fetching users:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch users.",
      error: error.message,
    });
  }
};

// get user by id pass by toke
export const getUser = async (req, res) => {
  const { id } = req.user;

  try {
    const user = await User.findById(id).populate("organization");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found.",
      });
    }

    res.status(200).json({
      success: true,
      message: "User fetched successfully.",
      user,
    });
  } catch (error) {
    console.error(`Error fetching user with ID ${id}:`, error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch user.",
      error: error.message,
    });
  }
};

// get user by the id
export const getUserById = async (req, res) => {
  const { id } = req.params;

  try {
    const user = await User.findById(id).populate("organization");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found.",
      });
    }

    res.status(200).json({
      success: true,
      message: "User fetched successfully.",
      user,
    });
  } catch (error) {
    console.error(`Error fetching user with ID ${id}:`, error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch user.",
      error: error.message,
    });
  }
};

// Delete a user by ID
export const deleteUserById = async (req, res) => {
  const { id } = req.params;
  const requestingUser = req.user;

  try {
    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Check the role of the requesting user
    if (requestingUser.role === "client") {
      // For client: reassign user to organization with code "CROPGEN"
      if (
        !user.organization ||
        user.organization.toString() !== requestingUser.organization.toString()
      ) {
        return res.status(403).json({
          success: false,
          message: "You can only remove users from your own organization",
        });
      }

      // Find the CROPGEN organization
      const cropgenOrg = await Organization.findOne({
        organizationCode: "CROPGEN",
      });
      if (!cropgenOrg) {
        return res.status(404).json({
          success: false,
          message: "CROPGEN organization not found",
        });
      }

      // Reassign user to CROPGEN organization
      user.organization = cropgenOrg._id;
      await user.save();

      return res.status(200).json({
        success: true,
        message: "User reassigned to CROPGEN organization successfully",
        user,
      });
    } else if (["admin", "developer"].includes(requestingUser.role)) {
      // For admin or developer: perform hard delete
      await User.findByIdAndDelete(id);

      return res.status(200).json({
        success: true,
        message: "User permanently deleted successfully",
        user,
      });
    } else {
      return res.status(403).json({
        success: false,
        message: "Unauthorized to delete users",
      });
    }
  } catch (error) {
    console.error("Error processing user deletion:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to process user deletion",
      error: error.message,
    });
  }
};

// Delete a user by email
export const deleteUserByEmail = async (req, res) => {
  const { email } = req.params;

  try {
    // Find and delete user by email
    const user = await User.findOneAndDelete({ email });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "User deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting user:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete user",
      error: error.message,
    });
  }
};

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

// mobile application api controller
export const checkUser = async (req, res) => {
  const { phone, organizationCode } = req.body;

  try {
    if (!phone) {
      return res.status(400).json({
        success: false,
        message: "Phone number is required",
        data: null,
      });
    }

    const user = await User.findOne({ phone });
    if (user) {
      return res.status(400).json({
        success: false,
        message: "User already registered",
        data: null,
      });
    }

    if (organizationCode) {
      const organization = await Organization.findOne({ organizationCode });
      if (!organization) {
        return res.status(400).json({
          success: false,
          message: "Invalid organization code",
          data: null,
        });
      }
    }

    return res.status(200).json({
      success: true,
      message: "User can proceed with signup",
      data: { allowed: true },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Server error",
      data: null,
    });
  }
};

// check phone number is exist or not to send the otp
export const isUserExist = async (req, res) => {
  const { phone } = req.body;

  try {
    // Basic input validation
    if (!phone || typeof phone !== "string" || phone.trim() === "") {
      return res.status(400).json({
        success: false,
        message: "Phone number is required",
        data: null,
      });
    }

    // Check if phone starts with +91 and has 13 characters (+91 followed by 10 digits)
    const phoneRegex = /^\+91\d{10}$/;
    if (!phoneRegex.test(phone)) {
      return res.status(400).json({
        success: false,
        message: "Phone number must be in +91XXXXXXXXXX format",
        data: null,
      });
    }

    // Check if user exists
    const user = await User.findOne({ phone });

    if (user) {
      return res.status(200).json({
        success: true,
        message: "User exists can process",
        data: { exists: true },
      });
    } else {
      return res.status(404).json({
        success: true,
        message: "User does not exist. Proceed with signup.",
        data: { exists: false },
      });
    }
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      data: null,
    });
  }
};

// mobile singup api controller
export const signupWithFirebase = async (req, res) => {
  try {
    const { firstName, lastName, terms, organizationCode, idToken } = req.body;

    // Validate required fields
    if (!firstName || !idToken || terms !== true) {
      return res.status(400).json({
        success: false,
        message: "Required fields: firstName, idToken, terms",
      });
    }

    // Verify Firebase ID token
    let decodedToken;
    try {
      decodedToken = await admin.auth().verifyIdToken(idToken);
    } catch (error) {
      console.log(error);
      return res.status(401).json({
        success: false,
        message: "Invalid or expired ID token",
      });
    }

    const { phone_number, uid } = decodedToken;

    if (!phone_number) {
      return res.status(400).json({
        success: false,
        message: "Phone number not found in ID token",
      });
    }

    // Check for existing user
    const query = {
      $or: [{ firebaseUid: uid }, { phone: phone_number }],
    };

    const existingUser = await User.findOne(query);

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: "User already exists.",
      });
    }

    // Handle organization code
    const orgCode = organizationCode
      ? organizationCode.toUpperCase()
      : "CROPGEN";

    const organization = await Organization.findOne({
      organizationCode: orgCode,
    });

    if (!organization) {
      return res.status(404).json({
        success: false,
        message: `Organization '${orgCode}' not found.`,
      });
    }

    // Create user
    const newUser = await User.create({
      firstName,
      lastName,
      phone: phone_number,
      role: "farmer",
      terms,
      organization: organization._id,
      firebaseUid: uid,
    });

    // Generate JWT Token for authentication
    const payload = {
      id: newUser._id,
      firstName: newUser.firstName,
      lastName: newUser.lastName,
      phone: newUser.phone,
      role: newUser.role,
      organization: newUser.organization,
      firebaseUid: newUser.firebaseUid,
    };
    const accessToken = jwt.sign(payload, JWT_SECRET, { expiresIn: "15d" });

    return res.status(201).json({
      success: true,
      message: "User registered successfully.",
      accessToken,
      user: {
        id: newUser._id,
        firstName: newUser.firstName,
        lastName: newUser.lastName,
        email: newUser.email,
        phone: newUser.phone,
        role: newUser.role,
        organizationCode: orgCode,
      },
    });
  } catch (error) {
    console.error("Signup Mobile Error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error.",
      error: error.message,
    });
  }
};

export const loginWithPhone = async (req, res) => {
  const { phone } = req.body;

  try {
    // Validate phone format
    const phoneRegex = /^\+91\d{10}$/;
    if (!phone || !phoneRegex.test(phone)) {
      return res.status(400).json({
        success: false,
        message: "Phone number must be in +91XXXXXXXXXX format",
        data: null,
      });
    }

    // Check if user exists
    let user = await User.findOne({ phone });

    if (!user) {
      // Find default organization
      const orgCode = "CROPGEN";
      const organization = await Organization.findOne({
        organizationCode: orgCode,
      });

      if (!organization) {
        return res.status(404).json({
          success: false,
          message: `Default organization '${orgCode}' not found.`,
          data: null,
        });
      }

      // Create new user with default values
      user = await User.create({
        firstName: "User",
        lastName: "",
        phone,
        role: "farmer",
        terms: true,
        organization: organization._id,
      });
    }

    // Generate JWT for login
    const payload = {
      id: user._id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      role: user.role,
      organization: user.organization,
    };

    const accessToken = jwt.sign(payload, process.env.JWT_SECRET, {
      expiresIn: "15d",
    });

    return res.status(200).json({
      success: true,
      message: user.lastName
        ? "User login successful"
        : "User registered and logged in successfully",
      data: { accessToken, user },
    });
  } catch (error) {
    console.error("Login Error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error",
      data: null,
    });
  }
};
