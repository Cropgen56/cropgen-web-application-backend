import express from "express";
import {
  addField,
  deleteField,
  getField,
} from "../controllers/fieldController.js";

const router = express.Router();

// Define the routes
router.post("/add-field/:userId", addField);
router.get("/get-field/:userId", getField);
router.delete("/delte-field/:fieldId", deleteField);

export default router;
