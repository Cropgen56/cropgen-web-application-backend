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
const router = express.Router();

router.post("/create", uploadCropImages, createCrop);
router.get("/get-all", getAllCrops);
router.get("/get-crop-list", isAuthenticated, getCropNamesAndImages);
router.get("/get/:id", getCropById);
router.delete("/delete/:id", deleteCropById);
router.patch("/update/:id", uploadCropImages, updateCrop);

export default router;
