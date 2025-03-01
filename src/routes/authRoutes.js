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
} from "../controllers/authController.js";

import {
  isAuthenticated,
  authorizeRoles,
} from "../middleware/authMiddleware.js";
const router = express.Router();

// Define the routes
router.post("/google-login", googleLogin);
router.post("/signup", signup);
router.post("/signin", signin);
router.get(
  "/users",
  isAuthenticated,
  authorizeRoles("admin", "developer", "client"),
  getAllUsers
);
router.get("/users/:id", getUserById);
router.delete(
  "/delete-user/:id",
  isAuthenticated,
  authorizeRoles("admin", "developer", "client"),
  deleteUserById
);
router.patch(
  "/update-user/:id",
  isAuthenticated,
  authorizeRoles("admin", "developer", "client"),
  updateUserById
);
router.get("/test-api", testApi);

// cropydeals auth routes
router.post("/register-user", registerUser);

export default router;
