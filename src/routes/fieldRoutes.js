import express from "express";
import {
  addField,
  deleteField,
  getField,
} from "../controllers/fieldController.js";
import isAuthenticated from "../middleware/authMiddleware.js";

const router = express.Router();

// Define the routes
router.post("/add-field/:userId", addField);
router.get("/get-field/:userId", getField);
router.delete("/delete-field/:fieldId", deleteField);

export default router;
