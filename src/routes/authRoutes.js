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
  signupRequest,
  loginRequest,
  verifyLoginOTP,
  verifySignupOTP,
  googleLoginMobile,
  checkUser,
  signupWithFirebase,
  isUserExist,
  loginWithPhone,
  forgotPassword,
  auth,
  resetPassword,
  getUser,
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

router.post("/signin", signin);

// forgot passwrod controller
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
router.post("/signup/request", signupRequest);
router.post("/login/request", loginRequest);
router.post("/signup/verify", verifySignupOTP);
router.post("/login/verify", verifyLoginOTP);

export default router;
