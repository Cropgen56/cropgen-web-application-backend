import express from "express";
import {
  addOperation,
  getOperationsByFarmField,
  getOperationById,
  updateOperation,
  deleteOperation,
} from "../controllers/operationController.js";

import { isAuthenticated } from "../middleware/authMiddleware.js";

const router = express.Router();

// Define the routes
router.post("/:farmFieldId/create", isAuthenticated, addOperation);
router.get("/:farmFieldId/get", isAuthenticated, getOperationsByFarmField);
router.get("/:operationId", isAuthenticated, getOperationById);
router.put("/:operationId", isAuthenticated, updateOperation);
router.delete("/:operationId", isAuthenticated, deleteOperation);

export default router;
