import express from "express";
import {
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
  googleLoginMobile,
  checkUser,
  signupWithFirebase,
  isUserExist,
  loginWithPhone,
  auth,
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

// web login api
router.post("/authenticate", auth);

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
router.post("/signup/check-user", checkUser);
router.post("/signup/mobile", signupWithFirebase);
router.post("/login/is-exist", isUserExist);
router.post("/login/mobile", loginWithPhone);

// apis for nodemailer
router.post("/signup/request", signupRequest);
router.post("/login/request", loginRequest);
router.post("/signup/verify", verifySignupOTP);
router.post("/login/verify", verifyLoginOTP);

export default router;
