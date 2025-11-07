import express from "express";
import {
  getAllUsers,
  getUserById,
  deleteUserById,
  updateUserById,
  deleteUserByEmail,
  checkUser,
  signupWithFirebase,
  isUserExist,
  loginWithPhone,
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
  loginWithGoogleMobile,
  requestAdminOtp,
} from "../controllers/authcontroller/index.js";

import { requireAuth } from "../middleware/authMiddleware.js";

import {
  isAuthenticated,
  authorizeRoles,
  checkApiKey,
} from "../middleware/authMiddleware.js";

const router = express.Router();

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
router.post("/google-mobile", loginWithGoogleMobile);

// web application login and the singup routes
router.post("/otp", requestOtp);
router.post("/verify", verifyOtp);
router.post("/complete-profile", requireAuth, completeProfile);
router.post("/refresh", refreshTokenHandler);
router.post("/logout", logoutHandler);

// login with google routes web application
router.post("/google", loginWithGoogleWeb);

// request admin otp
router.post("/admin-otp", requestAdminOtp);

// cropydeals register login api
router.post("/cropydeal-register-login", cropydealsRegisterLogin);
export default router;
