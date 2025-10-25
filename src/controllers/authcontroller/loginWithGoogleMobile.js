import { OAuth2Client } from "google-auth-library";
import User from "../../models/usersModel.js";
import Organization from "../../models/organizationModel.js";
import { sendBasicEmail } from "../../config/sesClient.js";
import { htmlWelcomeBack, htmlWelcome } from "../../utils/emailTemplate.js";
import jwt from "jsonwebtoken";

const clientMobile = new OAuth2Client(process.env.MOBILE_GOOGLE_CLIENT_ID);

export const loginWithGoogleMobile = async (req, res) => {
  try {
    const { token } = req.body;

    // Verify token with Google
    const ticket = await clientMobile.verifyIdToken({
      idToken: token,
      audience: process.env.MOBILE_GOOGLE_CLIENT_ID,
    });

    const payloadData = ticket.getPayload();
    const { email, name, picture, sub } = payloadData;

    const nameParts = name.split(" ");
    const firstName = nameParts[0];
    const lastName = nameParts.slice(1).join(" ") || "";

    let user = await User.findOne({ email }).populate("organization");
    const isExisting = !!user && !!user.organization && user.terms === true;

    const orgCode = "CROPGEN";

    const organization = await Organization.findOne({
      organizationCode: orgCode,
    });

    if (!organization) {
      return res.status(404).json({
        success: false,
        message: `Organization '${orgCode}' not found.`,
      });
    }

    // Prepare email details based on user status
    const emailDetails = isExisting
      ? {
          to: email,
          subject: "Signed in to CropGen",
          html: htmlWelcomeBack(user.firstName || user.email),
          text: "You're signed in to CropGen.",
          errorMessage: "Welcome back email error:",
        }
      : {
          to: email,
          subject: "Welcome to CropGen",
          html: htmlWelcome(firstName || "Farmer"),
          text: "Thank you for registering with CropGen!",
          errorMessage: "Welcome email error:",
        };

    // Create new user if they don't exist
    if (!user) {
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

    // Send appropriate email (non-critical)
    try {
      await sendBasicEmail({
        to: emailDetails.to,
        subject: emailDetails.subject,
        html: emailDetails.html,
        text: emailDetails.text,
      });
    } catch (e) {
      console.error(emailDetails.errorMessage, e);
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
    const accessToken = jwt.sign(payload, process.env.JWT_ACCESS_SECRET, {
      expiresIn: "15d",
    });

    res.json({ success: true, accessToken, user });
  } catch (error) {
    console.error("loginWithGoogleMobile:", error.message, error.stack);
    res
      .status(400)
      .json({ success: false, message: "Invalid Google Token", error });
  }
};
