import jwt from "jsonwebtoken";
import crypto from "crypto";

const ACCESS_SECRET = process.env.JWT_ACCESS_SECRET;
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET + "_r";
const ACCESS_EXPIRES = "15m";
const REFRESH_EXPIRES = "7d";
const REFRESH_COOKIE_NAME = "refreshToken";

export function signAccessToken(payload) {
  return jwt.sign(payload, ACCESS_SECRET, { expiresIn: ACCESS_EXPIRES });
}

/**
 * refresh token includes a random refresh id (rid) so we can store and verify it server-side
 * payload should be minimal: { id: userId, role: userRole } etc.
 */
export function signRefreshToken(payload, refreshId) {
  return jwt.sign({ ...payload, rid: refreshId }, REFRESH_SECRET, {
    expiresIn: REFRESH_EXPIRES,
  });
}

export function generateRefreshId() {
  return crypto.randomBytes(32).toString("hex");
}

export function setRefreshCookie(res, refreshToken) {
  const cookieOptions = {
    httpOnly: true,
    secure: true,
    sameSite: "None",
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: "/",
  };
  console.log("Setting Cookie:", {
    name: REFRESH_COOKIE_NAME,
    options: cookieOptions,
  });
  res.cookie(REFRESH_COOKIE_NAME, refreshToken, cookieOptions);
}

export function clearRefreshCookie(res) {
  res.clearCookie(REFRESH_COOKIE_NAME, {
    httpOnly: true,
    secure: true,
    sameSite: "None",
    path: "/",
  });
}

export function verifyRefreshToken(token) {
  try {
    const decoded = jwt.verify(token, REFRESH_SECRET);
    console.log("Verified Token:", decoded); // Debug log
    return decoded;
  } catch (err) {
    console.error("Token Verification Error:", err.message);
    throw err;
  }
}
