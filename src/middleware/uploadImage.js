import multer from "multer";
import { CloudinaryStorage } from "multer-storage-cloudinary";
import cloudinary from "../config/cloudinaryConfig.js";
import path from "path";

// Configure Cloudinary storage for crops
const cropStorage = new CloudinaryStorage({
  cloudinary,
  params: async (req, file) => ({
    folder: "farm_images",
    allowed_formats: ["jpg", "png", "jpeg"],
    public_id: `crop_${Date.now()}_${file.originalname}`,
    transformation: [
      { width: 800, height: 800, crop: "limit", quality: "auto" },
    ],
  }),
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
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB limit
  fileFilter,
});

// Middleware for crop image uploads
export const uploadCropImages = (req, res, next) => {
  cropUpload.any()(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      if (err.code === "LIMIT_FILE_SIZE") {
        return res.status(400).json({
          success: false,
          message: `File too large. Maximum size is 5 MB.`,
        });
      }
      return res.status(400).json({
        success: false,
        message: err.message || "Error uploading images",
      });
    } else if (err) {
      console.error("Upload error:", err);
      return res.status(400).json({
        success: false,
        message: "Error uploading images to Cloudinary",
      });
    }

    if (req.files) {
      const groupedFiles = {
        cropImage: req.files
          .filter((file) => file.fieldname === "cropImage")
          .slice(0, 1),
        pestImages: req.files.filter((file) =>
          file.fieldname.startsWith("pestImages")
        ),
        diseaseImages: req.files.filter((file) =>
          file.fieldname.startsWith("diseaseImages")
        ),
        newPestImages: req.files.filter((file) =>
          file.fieldname.startsWith("newPestImages")
        ),
        newDiseaseImages: req.files.filter((file) =>
          file.fieldname.startsWith("newDiseaseImages")
        ),
      };
      req.files = groupedFiles;
    }
    next();
  });
};

// Middleware for blog image upload (unchanged)
export const uploadBlogImages = cropUpload.single("blogImage");

export default { uploadCropImages, uploadBlogImages };
