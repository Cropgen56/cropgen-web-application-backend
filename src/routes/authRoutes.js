import express from "express";
import {
  signup,
  signin,
  getAllUsers,
  getUserById,
} from "../controllers/authController.js";
import isAuthenticated from "../middleware/authMiddleware.js";

const router = express.Router();

// Define the routes
router.post("/signup", signup);
router.post("/signin", signin);
router.get("/users", getAllUsers);
router.get("/users/:id", getUserById);

export default router;
