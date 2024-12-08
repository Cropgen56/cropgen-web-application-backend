import jwt from "jsonwebtoken";
import User from "../models/usersModel.js";

const JWT_SECRET = process.env.JWT_SECRET;

// Signup controller
export const signup = async (req, res) => {
  try {
    const { firstName, lastName, email, phone, password, role, terms } =
      req.body;

    if (!firstName || !lastName || !email || !phone || !password) {
      return res.status(400).json({ message: "All fields are required." });
    }

    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      return res.status(409).json({ message: "Email already in use." });
    }

    // hash the password before store in database
    // const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = await User.create({
      firstName,
      lastName,
      email,
      phone,
      password,
      role: role || "farmer",
      terms,
    });

    res.status(201).json({
      message: "User registered successfully.",
      user: {
        id: newUser.id,
        firstName: newUser.firstName,
        lastName: newUser.lastName,
        email: newUser.email,
        role: newUser.role,
      },
    });
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ message: "Internal server error.", error: error.message });
  }
};

// Signin controller
export const signin = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res
        .status(400)
        .json({ message: "Email and password are required." });
    }

    const user = await User.findOne({ where: { email } });
    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    if (password !== user.password) {
      return res.status(401).json({ message: "Invalid email or password." });
    }

    // const isMatch = await bcrypt.compare(password, user.password);
    // if (!isMatch) {
    //   return res.status(401).json({ message: "Invalid email or password." });
    // }

    const token = jwt.sign({ id: user.id, role: user.role }, JWT_SECRET, {
      expiresIn: "1h",
    });

    res.status(200).json({
      message: "User signed in successfully.",
      token,
      user: {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ message: "Internal server error.", error: error.message });
  }
};
