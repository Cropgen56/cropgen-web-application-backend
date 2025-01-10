import express from "express";
import {
  signup,
  signin,
  getAllUsers,
  getUserById,
  testApi,
  googleLogin,
  registerUser,
} from "../controllers/authController.js";
const router = express.Router();

// Define the routes
router.post("/google-login", googleLogin);
router.post("/signup", signup);
router.post("/signin", signin);
router.get("/users", getAllUsers);
router.get("/users/:id", getUserById);
router.get("/test-api", testApi);

// cropidill auth routes
router.post("/register-user", registerUser);

export default router;
