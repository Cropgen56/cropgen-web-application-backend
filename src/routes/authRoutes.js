import express from "express";
import {
  signin,
  getAllUsers,
  getUserById,
  googleLogin,
  registerUser,
  deleteUserById,
  updateUserById,
  deleteUserByEmail,
  // signupRequest,
  // loginRequest,
  // verifyLoginOTP,
  // verifySignupOTP,
  googleLoginMobile,
  checkUser,
  signupWithFirebase,
  isUserExist,
  loginWithPhone,
  forgotPassword,
  auth,
  resetPassword,
  getUser,
  requestOtp,
  verifyOtp,
  completeProfile,
  refreshTokenHandler,
  logoutHandler,
} from "../controllers/authController.js";

import { requireAuth } from "../middleware/authMiddleware.js";

import {
  isAuthenticated,
  authorizeRoles,
  checkApiKey,
} from "../middleware/authMiddleware.js";
const router = express.Router();

// login with google routes web application
router.post("/google", googleLogin);

// login with google mobile application
router.post("/google-mobile", googleLoginMobile);

router.post("/signin", signin);

// forgot password controller
router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPassword);

// web login api
router.post("/authenticate", auth);

router.get(
  "/users",
  isAuthenticated,
  authorizeRoles("admin", "developer", "client"),
  getAllUsers
);

// get the user by id with the help of the token
router.get("/user", isAuthenticated, getUser);
router.get(
  "/user/:id",
  isAuthenticated,
  authorizeRoles("admin", "developer", "client"),
  getUserById
);

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
  authorizeRoles("admin", "developer", "client", "farmer"),
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
// router.post("/signup/request", signupRequest);
// router.post("/login/request", loginRequest);
// router.post("/signup/verify", verifySignupOTP);
// router.post("/login/verify", verifyLoginOTP);

// web application login and the singup routes
router.post("/otp", requestOtp);
router.post("/verify", verifyOtp);
router.post("/complete-profile", requireAuth, completeProfile);
router.post("/refresh", refreshTokenHandler);
router.post("/logout", logoutHandler);

export default router;
