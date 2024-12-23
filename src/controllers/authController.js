import jwt from "jsonwebtoken";
import User from "../models/usersModel.js";
import { getUserDataFromGoogle } from "../utils/getUserData.js";
import { OAuth2Client } from "google-auth-library";

const JWT_SECRET = process.env.JWT_SECRET;

// Google login controller
export const googleLogin = async (req, res) => {
  const { access_token } = req.body;
  if (!access_token) {
    return res.status(400).json({
      success: false,
      message: "Access token is required.",
    });
  }

  try {
    const userInfo = await getUserDataFromGoogle(access_token);
    const { email, given_name, family_name } = userInfo;

    // Check if the user exists in the database
    let user = await User.findOne({ email });

    if (!user) {
      // If the user does not exist, create a new user
      user = new User({
        firstName: given_name,
        lastName: family_name,
        email,
        role: "farmer",
        terms: true,
      });

      // Save the new user to the database
      await user.save();
    }

    // Generate a JWT token for the user
    const token = jwt.sign(
      {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role,
      },
      process.env.JWT_SECRET,
      { expiresIn: "15d" }
    );

    return res.status(200).json({
      success: true,
      message: "User logged in successfully.",
      token,
    });
  } catch (error) {
    console.error("Error during Google login:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error during Google login.",
      error: error.message,
    });
  }
};

// Signup controller
export const signup = async (req, res) => {
  try {
    const { firstName, lastName, email, phone, password, role, terms } =
      req.body;

    // Validate required fields
    if (!firstName || !lastName || !email || !phone || !password) {
      return res.status(400).json({
        success: false,
        message: "All fields are required.",
      });
    }

    // Check if the email already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: "Email already exists!",
      });
    }

    // Create new user
    const newUser = await User.create({
      firstName,
      lastName,
      email,
      phone,
      password,
      role: role || "farmer",
      terms,
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
      },
    });
  } catch (error) {
    console.error(error);
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
    const users = await User.find();

    res.status(200).json({
      success: true,
      message: "Users fetched successfully.",
      users: users.map((user) => ({
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role,
      })),
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
  const { id } = req.params;

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
