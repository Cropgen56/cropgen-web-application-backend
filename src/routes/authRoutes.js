import express from "express";

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
  getAvatarPresignedUrl,
  getProfile,
  getAllUsers,
  getUserById,
  deleteUserById,
  updateUserById,
  deleteUserByEmail,
  checkUser,
  signupWithFirebase,
  isUserExist,
  loginWithPhone,
  // whatsapp 
  sendWhatsappOtp,
  verifyWhatsappOtp,
  sendCustomMessage
} from "../controllers/authcontroller/index.js";

import { verifyWhatsappWebhook,receiveWhatsappWebhook } from "../controllers/webhookcontroller/whatsappwebhook.controller.js";

import { requireAuth } from "../middleware/authMiddleware.js";
import { updateUserActivity } from "../middleware/updateUserActivity.js";

import {
  isAuthenticated,
  authorizeRoles,
  checkApiKey,
} from "../middleware/authMiddleware.js";

const router = express.Router();

router.get(
  "/users",
  isAuthenticated,
  updateUserActivity,
  authorizeRoles("admin", "developer", "client"),
  getAllUsers
);

router.post("/avatar-presign", isAuthenticated,updateUserActivity, getAvatarPresignedUrl);

router.get("/profile", isAuthenticated,updateUserActivity, getProfile);

router.get(
  "/user/:id",
  isAuthenticated,
  updateUserActivity,
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
  updateUserActivity,
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
router.post("/google", loginWithGoogleWeb);

// request admin otp
router.post("/admin-otp", requestAdminOtp);

// cropydeals register login api
router.post("/cropydeal-register-login", cropydealsRegisterLogin);

// whatsapp routes
router.post("/send-otp", sendWhatsappOtp);
router.post("/verify-otp", verifyWhatsappOtp);
router.get("/webhook/whatsapp", verifyWhatsappWebhook);
router.post("/webhook/whatsapp", receiveWhatsappWebhook);


router.post("/send-weather-alert",sendCustomMessage)

export default router;
