import User from "../../models/usersModel.js";
import {
  generateRefreshId,
  signAccessToken,
  signRefreshToken,
  setRefreshCookie,
} from "../../utils/auth.utils.js";
import { htmlWelcomeBack, compare } from "../../utils/auth.js";

export const verifyOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp)
      return res
        .status(400)
        .json({ success: false, message: "Email and OTP are required." });

    const user = await User.findOne({ email }).populate("organization");
    if (!user || !user.otp || !user.otpExpires) {
      return res.status(400).json({
        success: false,
        message: "No pending OTP. Please request a new OTP.",
      });
    }

    // expired?
    if (user.otpExpires.getTime() < Date.now()) {
      user.otp = null;
      user.otpExpires = null;
      await user.save();
      return res.status(400).json({
        success: false,
        message: "OTP expired. Please request a new OTP.",
      });
    }

    // attempts guard
    if (user.otpAttemptCount >= 5) {
      user.otp = null;
      user.otpExpires = null;
      await user.save();
      return res.status(429).json({
        success: false,
        message: "Too many attempts. Request a new OTP.",
      });
    }

    const ok = await compare(otp, user.otp);
    if (!ok) {
      user.otpAttemptCount += 1;
      await user.save();
      return res.status(401).json({ success: false, message: "Invalid OTP." });
    }

    // success → clear OTP meta
    user.otp = null;
    user.otpExpires = null;
    user.otpAttemptCount = 0;

    const isExisting = !!user.organization && user.terms === true;

    // generate refreshId & store on user for revocation/rotation
    const refreshId = generateRefreshId();
    user.refreshTokenId = refreshId;
    if (isExisting) user.lastLoginAt = new Date();
    await user.save();

    // minimal payload for access token
    const payload = {
      id: user._id,
      role: user.role,
      organization: user.organization,
    };

    const onboardingRequired = !isExisting;
    const accessToken = signAccessToken({ ...payload, onboardingRequired });
    const refreshToken = signRefreshToken(payload, refreshId);

    // set HttpOnly refresh cookie
    setRefreshCookie(res, refreshToken);

    const orgCode = user.organization?.organizationCode || "CROPGEN";

    // welcome back (non-critical)
    if (isExisting) {
      try {
        await sendBasicEmail({
          to: email,
          subject: "Signed in to CropGen",
          html: htmlWelcomeBack(user.firstName || user.email),
          text: "You're signed in to CropGen.",
        });
      } catch (e) {
        // ignore email errors
      }
    }

    return res.json({
      success: true,
      message: isExisting
        ? "signed in successfully"
        : "OTP verified successfully",
      accessToken: accessToken,
      role: user.role,
      user: isExisting
        ? {
            id: user._id,
            email: user.email,
            role: user.role,
            organizationCode: orgCode,
          }
        : { id: user._id, email: user.email },
      onboardingRequired,
    });
  } catch (e) {
    console.error("verifyOtp:", e);
    return res
      .status(500)
      .json({ success: false, message: "Internal server error." });
  }
};
