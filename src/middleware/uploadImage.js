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

// Initialize multer for crops with flexible field handling
const cropUpload = multer({
  storage: cropStorage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter,
});

// Middleware for crop image uploads (handles cropImageFile, pestImages, diseaseImages)
export const uploadCropImages = (req, res, next) => {
  cropUpload.any()(req, res, (err) => {
    if (err) {
      console.error("Multer error:", err);
      return res.status(400).json({
        success: false,
        message: err.message || "Error uploading images",
      });
    }

    // Map and group files based on client-side field names
    if (req.files) {
      const groupedFiles = {
        cropImage: req.files
          .filter((file) => file.fieldname === "cropImage")
          .slice(0, 1), // Map cropImageFile to cropImage
        pestImages: req.files.filter((file) =>
          file.fieldname.startsWith("pestImages")
        ),
        diseaseImages: req.files.filter((file) =>
          file.fieldname.startsWith("diseaseImages")
        ),
      };

      // Limit the number of files
      groupedFiles.pestImages = groupedFiles.pestImages.slice(0, 5);
      groupedFiles.diseaseImages = groupedFiles.diseaseImages.slice(0, 5);

      req.files = groupedFiles; // Replace req.files with the mapped structure
    }
    next();
  });
};

// Middleware for blog image upload (1 blogImage)
export const uploadBlogImages = cropUpload.single("blogImage");

export default { uploadCropImages, uploadBlogImages };
