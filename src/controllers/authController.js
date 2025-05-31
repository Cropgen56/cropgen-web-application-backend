import jwt from "jsonwebtoken";
import User from "../models/usersModel.js";
import { getUserDataFromGoogle } from "../utils/getUserData.js";
import { OAuth2Client } from "google-auth-library";
import Organization from "../models/organizationModel.js";

const JWT_SECRET = process.env.JWT_SECRET;

const CLIENT_ID =
  "411399230985-p5tioee7chgpij247th5v51uqpeuj382.apps.googleusercontent.com";

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// Google login controller
export const googleLogin = async (req, res) => {
  try {
    const { token } = req.body;

    // Verify token with Google
    const ticket = await client.verifyIdToken({
      idToken: token,
      audience: CLIENT_ID,
    });

    const payload = ticket.getPayload();
    const { email, name, picture, sub } = payload;

    // Split full name into first and last name
    const nameParts = name.split(" ");
    const firstName = nameParts[0];
    const lastName = nameParts.slice(1).join(" ") || "";

    // Check if the user already exists in the database
    let user = await User.findOne({ email });

    if (!user) {
      // If the user does not exist, create a new one
      user = new User({
        userId: sub,
        firstName,
        lastName,
        email,
        role: "farmer",
        organization: "Cropgen",
        terms: true,
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
    // Extract role and organization from the authenticated user
    const { role, organization } = req.user;

    let users;

    if (role === "admin" || role === "developer") {
      // Admins & Developers: Fetch all users
      users = await User.find();
    } else if (role === "client") {
      // Clients: Fetch users only from their organization
      users = await User.find({ organization: organization });
    } else {
      // Other users: Restrict access
      return res.status(403).json({
        success: false,
        message: "Access denied. You do not have permission to view users !",
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
    const user = await User.findById(id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found.",
      });
    }

    res.status(200).json({
      success: true,
      message: "User fetched successfully.",
      user: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        phone: user.phone,
        role: user.role,
      },
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

export const testApi = async (req, res) => {
  try {
    // Mock user data for demonstration purposes (replace with actual logic if needed)
    const user = {
      id: "1",
      firstName: "John",
      lastName: "Doe",
      email: "admin@example.com",
      role: "admin",
    };

    // Send a success response
    res.status(200).json({
      success: true,
      message: "User fetched successfully.",
      user,
    });
  } catch (err) {
    // Log the error for debugging
    console.error("Error in testApi:", err);

    // Send an error response
    res.status(500).json({
      success: false,
      message: "Failed test API.",
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

  try {
    const user = await User.findByIdAndDelete(id);

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

// mobile application authentication

export const mobileSignup = async (req, res) => {
  const { firstName, lastName, phoneNumber } = req.body;
  const existingUser = await User.findOne({ phoneNumber });

  if (existingUser) {
    return res
      .status(400)
      .json({ message: "User already exists. Please login." });
  }

  const user = new User({ firstName, lastName, phoneNumber });
  await user.save();

  const token = jwt.sign({ id: user._id, phoneNumber }, "your_jwt_secret", {
    expiresIn: "7d",
  });

  res.json({ token });
};

export const mobileSignin = async (req, res) => {
  const { phoneNumber } = req.body;
  const user = await User.findOne({ phoneNumber });

  if (!user)
    return res
      .status(404)
      .json({ message: "User not found. Please sign up first." });

  const token = jwt.sign({ id: user._id, phoneNumber }, "your_jwt_secret", {
    expiresIn: "7d",
  });

  res.json({ token });
};
