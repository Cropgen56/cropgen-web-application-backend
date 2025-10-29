import express from "express";
import {
  signin,
  getAllUsers,
  getUserById,
  deleteUserById,
  updateUserById,
  deleteUserByEmail,
  googleLoginMobile,
  checkUser,
  signupWithFirebase,
  isUserExist,
  loginWithPhone,
  forgotPassword,
  resetPassword,
  getUser,
} from "../controllers/authController.js";

import {
  requestOtp,
  verifyOtp,
  refreshTokenHandler,
  completeProfile,
  cropydealsRegisterLogin,
  logoutHandler,
  loginWithGoogleWeb,
} from "../controllers/authcontroller/index.js";

import { requireAuth } from "../middleware/authMiddleware.js";

import {
  isAuthenticated,
  authorizeRoles,
  checkApiKey,
} from "../middleware/authMiddleware.js";

const router = express.Router();

// login with google mobile application
router.post("/google-mobile", googleLoginMobile);

// admin panel login route
router.post("/signin", signin);

// forgot password controller
router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPassword);

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

// mobile application authentication routes
router.post("/signup/check-user", checkUser);
router.post("/signup/mobile", signupWithFirebase);
router.post("/login/is-exist", isUserExist);
router.post("/login/mobile", loginWithPhone);

// web application login and the singup routes
router.post("/otp", requestOtp);
router.post("/verify", verifyOtp);
router.post("/complete-profile", requireAuth, completeProfile);
router.post("/refresh", refreshTokenHandler);
router.post("/logout", logoutHandler);

// login with google routes web application
router.post("/google", loginWithGoogleWeb);

// cropydeals register login api
router.post("/cropydeal-register-login", cropydealsRegisterLogin);
export default router;
