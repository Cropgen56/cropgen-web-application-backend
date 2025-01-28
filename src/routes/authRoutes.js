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
const router = express.Router();

// Define the routes
router.post("/google-login", googleLogin);
router.post("/signup", signup);
router.post("/signin", signin);
router.get("/users", getAllUsers);
router.get("/users/:id", getUserById);
router.delete("/delete-user/:id", deleteUserById);
router.patch("/update-user/:id", updateUserById);
router.get("/test-api", testApi);

// cropidill auth routes
router.post("/register-user", registerUser);

export default router;
