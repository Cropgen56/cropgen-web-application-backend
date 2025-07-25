import jwt from "jsonwebtoken";
import User from "../models/usersModel.js";
import { getUserDataFromGoogle } from "../utils/getUserData.js";
import { OAuth2Client } from "google-auth-library";
import Organization from "../models/organizationModel.js";
import nodemailer from "nodemailer";
import admin from "firebase-admin";
import { loginOtpEmail, signupOtpEmail, welcomeEmail } from "../utils/email.js";

const JWT_SECRET = process.env.JWT_SECRET;

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const clientMobile = new OAuth2Client(process.env.MOBILE_GOOGLE_CLIENT_ID);

// Google login controller
export const googleLogin = async (req, res) => {
  try {
    const { token } = req.body;

    // Verify token with Google
    const ticket = await client.verifyIdToken({
      idToken: token,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();

    const { email, name, picture, sub } = payload;

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
    const accessToken = jwt.sign(
      { id: user._id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: "15d" }
    );

    res.json({ success: true, accessToken, user });
  } catch (error) {
    res
      .status(400)
      .json({ success: false, message: "Invalid Google Token", error });
  }
};

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

// web login api for both singup and login
export const auth = async (req, res) => {
  try {
    const { email, password, terms, organizationCode } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required.",
      });
    }

    // Check for existing user
    const existingUser = await User.findOne({ email });

    if (existingUser) {
      if (password !== existingUser.password) {
        return res.status(401).json({
          success: false,
          message: "Invalid password.",
        });
      }

      // Fetch organization code from the database
      const organization = await Organization.findById(
        existingUser.organization
      );
      if (!organization) {
        return res.status(404).json({
          success: false,
          message: "Organization not found.",
        });
      }
      const orgCode = organization.organizationCode;

      const token = jwt.sign(
        {
          id: existingUser._id,
          email: existingUser.email,
          role: existingUser.role,
          organization: existingUser.organization,
        },
        process.env.JWT_SECRET,
        { expiresIn: "15d" }
      );

      return res.status(200).json({
        success: true,
        message: "User signed in successfully.",
        token,
        role: existingUser.role,
        user: {
          id: existingUser._id,
          email: existingUser.email,
          role: existingUser.role,
          organizationCode: orgCode,
        },
      });
    }

    // Signup flow
    if (terms !== true) {
      return res.status(400).json({
        success: false,
        message: "Terms must be accepted for signup.",
      });
    }

    // Use provided organizationCode or default to 'CROPGEN'
    const orgCode = organizationCode
      ? organizationCode.toUpperCase()
      : "CROPGEN";

    // Find organization by code
    const organization = await Organization.findOne({
      organizationCode: orgCode,
    });
    if (!organization) {
      return res.status(404).json({
        success: false,
        message: `Organization '${orgCode}' not found.`,
      });
    }

    // Create new user, setting optional fields to empty strings if not provided
    const newUser = await User.create({
      firstName: req.body.firstName || "",
      lastName: req.body.lastName || "",
      email,
      phone: req.body.phone || "",
      password,
      role: req.body.role || "farmer",
      terms,
      organization: organization._id,
    });

    const token = jwt.sign(
      {
        id: newUser._id,
        email: newUser.email,
        role: newUser.role,
        organization: newUser.organization,
      },
      process.env.JWT_SECRET,
      { expiresIn: "15d" }
    );

    return res.status(201).json({
      success: true,
      message: "User registered and signed in successfully.",
      token,
      role: newUser.role,
      user: {
        id: newUser._id,
        email: newUser.email,
        role: newUser.role,
        organizationCode: orgCode,
      },
    });
  } catch (error) {
    console.error("Auth Error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error.",
      error: error.message,
    });
  }
};

// Signup controller
export const signup = async (req, res) => {
  try {
    const {
      firstName,
      lastName,
      email,
      phone,
      password,
      role,
      terms,
      organizationCode,
    } = req.body;

    // Validate required fields
    if (!firstName || !email || !phone || !password || terms !== true) {
      return res.status(400).json({
        success: false,
        message: "Required fields: firstName, email, phone, password, terms",
      });
    }

    // Convert code to uppercase or default to 'CROPGEN'
    const orgCode = organizationCode
      ? organizationCode.toUpperCase()
      : "CROPGEN";

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

    // Check for existing user
    const existingUser = await User.findOne({ email });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: "Email already exists.",
      });
    }

    // Create user
    const newUser = await User.create({
      firstName,
      lastName,
      email,
      phone,
      password,
      role: role || "farmer",
      terms,
      organization: organization._id,
    });

    return res.status(201).json({
      success: true,
      message: "User registered successfully.",
      user: {
        id: newUser._id,
        firstName: newUser.firstName,
        lastName: newUser.lastName,
        email: newUser.email,
        role: newUser.role,
        organizationCode: orgCode,
      },
    });
  } catch (error) {
    console.error("Signup Error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error.",
      error: error.message,
    });
  }
};

// Signin controller
export const signin = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required.",
      });
    }

    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found.",
      });
    }

    if (password !== user.password) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password.",
      });
    }

    const token = jwt.sign(
      {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role,
        organization: user.organization,
      },
      JWT_SECRET,
      {
        expiresIn: "15d",
      }
    );

    res.status(200).json({
      message: "User signed in successfully.",
      success: true,
      token,
      role: user.role,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Internal server error.",
      error: error.message,
    });
  }
};

// Fetch all users from the database
export const getAllUsers = async (req, res) => {
  try {
    const { role, organization } = req.user;

    let users;

    if (role === "admin" || role === "developer") {
      users = await User.find().populate({
        path: "organization",
        select: "organizationCode",
      });
    } else if (role === "client") {
      users = await User.find({ organization: organization }).populate({
        path: "organization",
        select: "organizationCode",
      });
    } else {
      // Other users: Restrict access
      return res.status(403).json({
        success: false,
        message: "Access denied. You do not have permission to view users!",
      });
    }

    // Check if users exist
    if (!users || users.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No users found.",
      });
    }

    res.status(200).json({
      success: true,
      message: "Users fetched successfully.",
      users: users,
    });
  } catch (error) {
    console.error("Error fetching users:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch users.",
      error: error.message,
    });
  }
};

// get user by id
export const getUserById = async (req, res) => {
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

// Cropy deals all auth apis
export const registerUser = async (req, res) => {
  try {
    const {
      firstName,
      lastName,
      email,
      phone,
      role,
      organization,
      terms,
      userId,
    } = req.body;

    // Validate required fields
    if (!userId || !organization || !phone || !terms) {
      return res
        .status(400)
        .json({ message: "All required fields must be filled." });
    }

    // Optimize validation with a single query
    const existingUser = await User.findOne({
      $or: [{ phone }, { userId }],
    });

    if (existingUser) {
      return res.status(200).json({
        message: "User already exists.",
        data: existingUser,
      });
    }

    if (email) {
      const emailExists = await User.findOne({ email });
      if (emailExists) {
        return res.status(409).json({
          message: "Email already exists, please try another.",
        });
      }
    }

    // Create a new user
    const newUser = new User({
      userId,
      firstName: firstName || undefined,
      lastName: lastName || undefined,
      email: email || undefined,
      phone,
      role: role || "farmer",
      organization,
      terms,
    });

    // Save user to database
    await newUser.save();

    res.status(201).json({
      success: true,
      message: "User registered successfully!",
      data: newUser,
    });
  } catch (error) {
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      return res.status(409).json({
        message: `${field} already exists. Please use a different ${field}.`,
      });
    }
    console.error("Error during user registration:", error);
    res
      .status(500)
      .json({ message: "Internal server error. Please try again later." });
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

// Update a user by ID
export const updateUserById = async (req, res) => {
  const { id } = req.params;
  const updateData = req.body;

  try {
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

// mobile singup api controller
// export const loginWithPhone = async (req, res) => {
//   const { phone } = req.body;

//   try {
//     // Validate phone format
//     const phoneRegex = /^\+91\d{10}$/;
//     if (!phone || !phoneRegex.test(phone)) {
//       return res.status(400).json({
//         success: false,
//         message: "Phone number must be in +91XXXXXXXXXX format",
//         data: null,
//       });
//     }

//     // Check if user exists
//     const user = await User.findOne({ phone });

//     if (!user) {
//       return res.status(404).json({
//         success: false,
//         message: "User not found",
//         data: null,
//       });
//     }

//     // Generate JWT and send to the client for login
//     const payload = {
//       id: user._id,
//       firstName: user.firstName,
//       lastName: user.lastName,
//       email: user.email,
//       role: user.role,
//       organization: user.organization,
//     };

//     const accessToken = jwt.sign(payload, process.env.JWT_SECRET, {
//       expiresIn: "15d",
//     });

//     return res.status(200).json({
//       success: true,
//       message: "User Login successful",
//       data: { accessToken, user },
//     });
//   } catch (error) {
//     console.error("Login Error:", error);
//     return res.status(500).json({
//       success: false,
//       message: "Server error",
//       data: null,
//     });
//   }
// };

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

// Configure nodemailer transport
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// Generate 4-digit OTP
const generateOTP = () => {
  return Math.floor(1000 + Math.random() * 9000).toString();
};

// signup api with email otp
export const signupRequest = async (req, res) => {
  try {
    // 1. Take required fields
    const { email, firstName, lastName, phone, terms, organizationCode } =
      req.body;

    // 2. Validate required fields
    if (!email || !firstName || !lastName || !phone || terms === undefined) {
      return res
        .status(400)
        .json({ success: false, message: "All fields are required" });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid email format" });
    }

    // Validate phone format (matches schema: 10-15 digits)
    const phoneRegex = /^[0-9]{10,15}$/;
    if (!phoneRegex.test(phone)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid phone number" });
    }

    // 3. Validate terms
    if (!terms) {
      return res.status(400).json({
        success: false,
        message: "You must accept the terms and conditions",
      });
    }

    // 4. Convert code to uppercase or default to 'CROPGEN'
    const orgCode = organizationCode
      ? organizationCode.toUpperCase()
      : "CROPGEN";

    // 5. Find organization
    const organization = await Organization.findOne({
      organizationCode: orgCode,
    });
    if (!organization) {
      return res.status(404).json({
        success: false,
        message: `Organization '${orgCode}' not found`,
      });
    }

    // 6. Check if email already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      if (!existingUser.otp) {
        // Fully registered user
        return res.status(400).json({
          success: false,
          message: "User already exists",
        });
      }
      if (existingUser.otpExpires > new Date()) {
        // Active OTP
        return res.status(400).json({
          success: false,
          message: "Please verify the existing OTP or wait for it to expire",
        });
      }

      await User.deleteOne({ _id: existingUser._id });
    }

    // 7. Generate OTP and create temporary user
    const otp = generateOTP();
    const otpExpires = new Date(Date.now() + 5 * 60 * 1000);

    const tempUser = new User({
      email,
      firstName,
      lastName,
      phone,
      terms,
      organization: organization._id,
      otp,
      otpExpires,
    });

    await tempUser.save();

    // 8. Send OTP email
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: "Your OTP for Signup",
      html: signupOtpEmail(otp),
    };

    await transporter.sendMail(mailOptions);

    // 9. Respond with success
    res.status(200).json({
      success: true,
      message: "OTP sent to email",
      userId: tempUser._id,
      email: tempUser.email,
    });
  } catch (error) {
    console.error("Signup request error:", {
      message: error.message,
      stack: error.stack,
    });
    res
      .status(500)
      .json({ success: false, message: "Server error during signup request" });
  }
};

// Login request OTP
export const loginRequest = async (req, res) => {
  try {
    // 1. Take email
    const { email } = req.body;

    // 2. Validate email
    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }

    // 3. Check if user exists
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // 4. Generate and send OTP
    const otp = generateOTP();
    const otpExpires = new Date(Date.now() + 5 * 60 * 1000);

    // Update user with OTP and expiration
    user.otp = otp;
    user.otpExpires = otpExpires;
    await user.save();

    // Schedule cleanup of OTP if not verified
    setTimeout(async () => {
      try {
        const userCheck = await User.findById(user._id);
        if (userCheck && userCheck.otp && userCheck.otpExpires < new Date()) {
          userCheck.otp = null;
          userCheck.otpExpires = null;
          await userCheck.save();
        }
      } catch (error) {
        console.error("Error during cleanup of unverified OTP:", error);
      }
    }, 5 * 60 * 1000);

    // Send OTP email
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: "Your OTP for Login",
      html: loginOtpEmail(otp),
    };

    await transporter.sendMail(mailOptions);

    res.status(200).json({
      message: "OTP sent to email",
      userId: user._id,
    });
  } catch (error) {
    console.error("Login request error:", error);
    res.status(500).json({ message: "Server error during login request" });
  }
};

// Verify OTP and complete signup
export const verifySignupOTP = async (req, res) => {
  try {
    const { userId, otp } = req.body;

    if (!userId || !otp) {
      return res.status(400).json({ message: "User ID and OTP are required" });
    }

    // Find user by ID
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Match OTP
    if (user.otp !== otp || user.otpExpires < new Date()) {
      // Delete user if OTP is invalid or expired
      await User.deleteOne({ _id: user._id });
      return res.status(400).json({ message: "Invalid or expired OTP" });
    }

    // Clear OTP fields
    user.otp = null;
    user.otpExpires = null;

    // Generate JWT
    const payload = {
      id: user._id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      role: user.role,
      organization: user.organization,
    };

    const token = jwt.sign(payload, process.env.JWT_SECRET, {
      expiresIn: "7d",
    });

    // Save user with cleared OTP fields
    await user.save();

    // Send welcome email
    const welcomeMailOptions = {
      from: process.env.EMAIL_USER,
      to: user.email,
      subject: "Welcome to CropGen!",
      html: welcomeEmail(user.firstName),
    };

    await transporter.sendMail(welcomeMailOptions);

    res.status(201).json({
      success: true,
      message: "User Created Successfully !",
      token,
    });
  } catch (error) {
    console.error("OTP verification error:", error);
    res.status(500).json({ message: "Server error during OTP verification" });
  }
};

// Verify OTP for login
export const verifyLoginOTP = async (req, res) => {
  try {
    const { userId, otp } = req.body;

    // Validate input
    if (!userId || !otp) {
      return res.status(400).json({
        success: false,
        message: "User ID and OTP are required",
      });
    }

    // Find user by ID
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Match OTP
    if (user.otp !== otp || user.otpExpires < new Date()) {
      // Clear OTP fields if invalid or expired
      user.otp = null;
      user.otpExpires = null;
      await user.save();
      return res.status(400).json({
        success: false,
        message: "Invalid or expired OTP",
      });
    }

    // Clear OTP fields
    user.otp = null;
    user.otpExpires = null;
    await user.save();

    // Generate JWT
    const payload = {
      id: user._id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      role: user.role,
      organization: user.organization,
    };

    const token = jwt.sign(payload, process.env.JWT_SECRET, {
      expiresIn: "7d",
    });

    // Respond with success
    res.status(200).json({
      success: true,
      message: "Login successful",
      token,
    });
  } catch (error) {
    console.error("Login OTP verification error:", {
      message: error.message,
      stack: error.stack,
    });
    res.status(500).json({
      success: false,
      message: "Server error during OTP verification",
    });
  }
};
