import express from "express";
import { createOrganization } from "../controllers/organizationController.js";

const router = express.Router();

router.post("/", createOrganization);

export default router;
