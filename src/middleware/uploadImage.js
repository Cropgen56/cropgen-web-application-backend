import multer from "multer";
import { CloudinaryStorage } from "multer-storage-cloudinary";
import cloudinary from "../config/cloudinaryConfig.js";
import path from "path";

// Configure Cloudinary storage for crops
const cropStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: "farm_images",
    allowed_formats: ["jpg", "png", "jpeg"],
    transformation: [
      { width: 800, height: 800, crop: "limit", quality: "auto" },
    ],
  },
});

// Configure Cloudinary storage for blogs
const blogStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: "blog_images",
    allowed_formats: ["jpg", "png", "jpeg"],
    transformation: [
      { width: 800, height: 800, crop: "limit", quality: "auto" },
    ],
  },
});

// File filter for image validation
const fileFilter = (req, file, cb) => {
  const filetypes = /jpeg|jpg|png/;
  const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = filetypes.test(file.mimetype);
  if (extname && mimetype) {
    return cb(null, true);
  }
  cb(new Error("Only JPEG and PNG images are allowed"));
};

// Initialize multer for crops
const cropUpload = multer({
  storage: cropStorage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter,
});

// Initialize multer for blogs
const blogUpload = multer({
  storage: blogStorage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter,
});

// Middleware for crop image uploads (1 cropImage, up to 5 pestImages, 5 diseaseImages)
export const uploadCropImages = (req, res, next) => {
  cropUpload.fields([
    { name: "cropImage", maxCount: 1 },
    { name: "pestImages", maxCount: 5 },
    { name: "diseaseImages", maxCount: 5 },
  ])(req, res, (err) => {
    if (err) {
      console.error("Multer error:", err); // Log the Multer error
      return res.status(400).json({
        success: false,
        message: err.message || "Error uploading images",
      });
    }
    next();
  });
};

// Middleware for blog image upload (1 blogImage)
export const uploadBlogImages = blogUpload.single("blogImage");

export default { uploadCropImages, uploadBlogImages };
