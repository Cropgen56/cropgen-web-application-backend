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
router.post("/:farmFieldId/create", addOperation);
router.get("/:farmFieldId/get", getOperationsByFarmField);
router.get("/:operationId", getOperationById);
router.put("/:operationId", updateOperation);
router.delete("/:operationId", deleteOperation);

export default router;
