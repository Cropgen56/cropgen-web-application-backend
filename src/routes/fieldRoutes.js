import express from "express";
import {
  addField,
  deleteField,
  getField,
  updateField,
} from "../controllers/fieldController.js";
import isAuthenticated from "../middleware/authMiddleware.js";

const router = express.Router();

// Define the routes
router.post("/add-field/:userId", addField);
router.get("/get-field/:userId", getField);
router.delete("/delete-field/:fieldId", deleteField);
router.patch("/update-field/:fieldId", updateField);

export default router;
