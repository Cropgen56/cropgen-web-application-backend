import express from "express";
import {
  signup,
  signin,
  getAllUsers,
  getUserById,
  testApi,
  googleLogin,
  registerUser,
  deleteUserById,
  updateUserById,
  mobileSignup,
  mobileSignin,
  deleteUserByEmail,
} from "../controllers/authController.js";

import {
  isAuthenticated,
  authorizeRoles,
  checkApiKey,
} from "../middleware/authMiddleware.js";
const router = express.Router();

// login with google routes
router.post("/google", googleLogin);

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
router.get("/test-api", testApi);
// cropydeals auth routes
router.post("/register-user", registerUser);

// mobile application authentication routes
router.post("/mobile-signup", mobileSignup);
router.post("/mobile-signin", mobileSignin);

export default router;
