import User from "../../models/usersModel.js";
import {
  verifyRefreshToken,
  clearRefreshCookie,
  signAccessToken,
  generateRefreshId,
  signRefreshToken,
  setRefreshCookie,
} from "../../utils/authUtils.js";

export const refreshTokenHandler = async (req, res) => {
  try {
    const token = req.cookies?.refreshToken;

    if (!token) {
      return res
        .status(401)
        .json({ success: false, message: "No refresh token" });
    }

    let decoded;
    try {
      decoded = verifyRefreshToken(token);
    } catch (err) {
      clearRefreshCookie(res);
      return res
        .status(403)
        .json({ success: false, message: "Invalid refresh token" });
    }

    const userId = decoded.id || decoded._id || decoded.userId;
    const tokenRid = decoded.rid;
    if (!userId || !tokenRid) {
      clearRefreshCookie(res);
      return res
        .status(403)
        .json({ success: false, message: "Invalid refresh token payload" });
    }

    const user = await User.findById(userId);
    if (!user || !user.refreshTokenId) {
      clearRefreshCookie(res);
      return res
        .status(403)
        .json({ success: false, message: "Refresh token not recognized" });
    }

    if (user.refreshTokenId !== tokenRid) {
      // token replay or revoked - revoke server-side
      user.refreshTokenId = null;
      await user.save();
      clearRefreshCookie(res);
      return res
        .status(403)
        .json({ success: false, message: "Refresh token revoked" });
    }

    // Rotate refresh id for better security
    const newRefreshId = generateRefreshId();
    user.refreshTokenId = newRefreshId;
    await user.save();

    const payload = {
      id: user._id,
      role: user.role,
      organization: user.organization,
    };
    const newAccessToken = signAccessToken(payload);
    const newRefreshToken = signRefreshToken(payload, newRefreshId);

    setRefreshCookie(res, newRefreshToken);

    // Send consistent key expected by the client
    return res.json({
      success: true,
      accessToken: newAccessToken,
      user: { id: user._id, role: user.role, organization: user.organization },
    });
  } catch (err) {
    console.error("refreshToken error:", err);
    clearRefreshCookie(res);
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};
