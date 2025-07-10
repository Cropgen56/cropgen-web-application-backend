import express from "express";
import {
  signup,
  signin,
  getAllUsers,
  getUserById,
  googleLogin,
  registerUser,
  deleteUserById,
  updateUserById,
  deleteUserByEmail,
  signupRequest,
  loginRequest,
  verifyLoginOTP,
  verifySignupOTP,
  signupPhoneRequest,
  verifyUser,
  googleLoginMobile,
} from "../controllers/authController.js";

import {
  isAuthenticated,
  authorizeRoles,
  checkApiKey,
} from "../middleware/authMiddleware.js";
const router = express.Router();

// login with google routes
router.post("/google", googleLogin);

// login with goolge mobile
router.post("/google-mobile", googleLoginMobile);

// common routes
router.post("/signup", signup);
router.post("/signin", signin);
router.get(
  "/users",
  isAuthenticated,
  authorizeRoles("admin", "developer", "client"),
  getAllUsers
);
router.get("/user", isAuthenticated, getUserById);
router.delete(
  "/delete-user/:id",
  isAuthenticated,
  authorizeRoles("admin", "developer", "client"),
  deleteUserById
);
router.delete("/delete-user-by-email/:email", checkApiKey, deleteUserByEmail);
router.patch(
  "/update-user/:id",
  isAuthenticated,
  authorizeRoles("admin", "developer", "client"),
  updateUserById
);
// cropydeals auth routes
router.post("/register-user", registerUser);

// mobile application authentication routes
router.post("/signup/request", signupRequest);
router.post("/login/request", loginRequest);
router.post("/signup/verify", verifySignupOTP);
router.post("/login/verify", verifyLoginOTP);

// mobile application authentication routes
router.post("/signup/mobile/request", signupPhoneRequest);
router.post("/verify/mobile/request", verifyUser);

export default router;
