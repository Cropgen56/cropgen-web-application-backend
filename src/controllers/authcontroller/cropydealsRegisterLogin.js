import mongoose from "mongoose";
import {
  signAccessToken,
  signRefreshToken,
  generateRefreshId,
  setRefreshCookie,
} from "../../utils/auth.utils.js";

const User = mongoose.model("User");
const Organization = mongoose.model("Organization");

export const cropydealsRegisterLogin = async (req, res) => {
  try {
    const { firstName, lastName, phone, email, organizationCode, terms } =
      req.body;

    // Input validation
    if (!phone || !organizationCode || terms === undefined) {
      return res.status(400).json({
        error:
          "Phone number, organization code, and terms acceptance are required",
      });
    }

    if (!/^\+\d{10,12}$/.test(phone)) {
      return res.status(400).json({ error: "Invalid phone number format" });
    }

    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ error: "Invalid email format" });
    }

    if (typeof terms !== "boolean" || !terms) {
      return res.status(400).json({ error: "You must accept the terms" });
    }

    // Validate organizationCode
    const organization = await Organization.findOne({
      organizationCode: organizationCode.toUpperCase(),
    });
    if (!organization) {
      return res.status(400).json({ error: "Invalid organization code" });
    }

    // Check if user exists by phone number
    let user = await User.findOne({ phone });

    if (user) {
      const refreshId = generateRefreshId();
      user.lastLoginAt = new Date();
      user.refreshTokenId = refreshId;
      await user.save();

      // Generate tokens
      const payload = {
        id: user._id,
        email: user.email || null,
        role: user.role,
        organization: user.organization,
      };

      const accessToken = signAccessToken(payload);
      const refreshToken = signRefreshToken(payload, refreshId);

      // Set refresh token in cookie
      setRefreshCookie(res, refreshToken);

      return res.status(200).json({
        message: "Login successful",
        accessToken,
        user: {
          id: user._id,
          firstName: user.firstName,
          lastName: user.lastName,
          phone: user.phone,
          email: user.email,
          role: user.role,
          organization: user.organization,
          subscriptionStatus: user.subscriptionStatus,
        },
      });
    } else {
      // Register new user
      const refreshId = generateRefreshId();

      user = new User({
        firstName,
        lastName,
        phone,
        email,
        organization: organization._id,
        terms,
        role: "farmer",
        refreshTokenId: refreshId,
        lastLoginAt: new Date(),
      });

      await user.save();

      const payload = {
        id: user._id,
        email: user.email || null,
        role: user.role,
        organization: user.organization,
      };

      const accessToken = signAccessToken(payload);
      const refreshToken = signRefreshToken(payload, refreshId);

      // Set refresh token in cookie
      setRefreshCookie(res, refreshToken);

      return res.status(201).json({
        message: "Registration successful",
        accessToken,
        user: {
          id: user._id,
          firstName: user.firstName,
          lastName: user.lastName,
          phone: user.phone,
          email: user.email,
          role: user.role,
          organization: user.organization,
          subscriptionStatus: user.subscriptionStatus,
        },
      });
    }
  } catch (error) {
    if (error.code === 11000) {
      return res
        .status(400)
        .json({ error: "Phone number or email already exists" });
    }
    if (error.name === "ValidationError") {
      const errors = Object.values(error.errors).map((err) => err.message);
      return res
        .status(400)
        .json({ error: `Validation failed: ${errors.join(", ")}` });
    }
    console.error("Error in cropydealsRegisterLogin:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};
