import express from "express";
import {
  addField,
  deleteField,
  getField,
  updateField,
  getAllField,
} from "../controllers/fieldController.js";

const router = express.Router();

// Define the routes
router.post("/add-field/:userId", addField);
router.get("/get-field/:userId", getField);
router.get("/get-all-field", getAllField);
router.delete("/delete-field/:fieldId", deleteField);
router.patch("/update-field/:fieldId", updateField);

export default router;
