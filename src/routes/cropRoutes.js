import express from "express";
import {
  createCrop,
  deleteCropById,
  getAllCrops,
  getCropById,
  getCropNamesAndImages,
  updateCrop,
} from "../controllers/cropController.js";
import { isAuthenticated } from "../middleware/authMiddleware.js";
import { uploadCropImages } from "../middleware/uploadImage.js";
import { generateAdvisory } from "../controllers/advisoryController.js";
const router = express.Router();

router.post("/create", uploadCropImages, createCrop);
router.get("/get-all", getAllCrops);
router.get("/get-crop-list", getCropNamesAndImages);
router.get("/get/:id", getCropById);
router.delete("/delete/:id", deleteCropById);
router.patch("/update/:id", uploadCropImages, updateCrop);
router.post("/generate-advisory", generateAdvisory);

export default router;
