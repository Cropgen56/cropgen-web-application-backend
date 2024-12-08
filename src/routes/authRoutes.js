import express from "express";
import { signup, signin } from "../controllers/authController.js";
import isAuthenticated from "../middleware/authMiddleware.js";

const router = express.Router();

// Define the routes
router.post("/signup", signup);
router.post("/signin", signin);

export default router;
