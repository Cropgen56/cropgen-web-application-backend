// middlewares/uploadMiddleware.js
import multer from "multer";
import path from "path";
import fs from "fs";
import { uploadFileToS3 } from "../utils/s3.js"; // we'll create this

// Multer temp storage
const tempStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = "uploads/";
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath);
    }
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
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

const upload = multer({
  storage: tempStorage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
  fileFilter,
});

// ==================== CROP IMAGE UPLOAD ====================
export const uploadCropImages = (req, res, next) => {
  upload.any()(req, res, async (err) => {
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
        message: "Error uploading images",
      });
    }

    try {
      // Upload each file to S3 according to folder logic
      const s3Uploads = await Promise.all(
        req.files.map(async (file) => {
          let folder = "misc";
          if (file.fieldname === "cropImage") folder = "crops";
          else if (file.fieldname.startsWith("pestImages")) folder = "pests";
          else if (file.fieldname.startsWith("diseaseImages"))
            folder = "diseases";
          else if (file.fieldname.startsWith("newPestImages"))
            folder = "newPests";
          else if (file.fieldname.startsWith("newDiseaseImages"))
            folder = "newDiseases";

          const key = await uploadFileToS3(file, folder);
          return { fieldname: file.fieldname, key };
        })
      );

      // Group the uploaded files as before
      const groupedFiles = {
        cropImage: s3Uploads
          .filter((f) => f.fieldname === "cropImage")
          .slice(0, 1),
        pestImages: s3Uploads.filter((f) =>
          f.fieldname.startsWith("pestImages")
        ),
        diseaseImages: s3Uploads.filter((f) =>
          f.fieldname.startsWith("diseaseImages")
        ),
        newPestImages: s3Uploads.filter((f) =>
          f.fieldname.startsWith("newPestImages")
        ),
        newDiseaseImages: s3Uploads.filter((f) =>
          f.fieldname.startsWith("newDiseaseImages")
        ),
      };

      req.files = groupedFiles;
      next();
    } catch (uploadErr) {
      console.error("S3 upload error:", uploadErr);
      return res
        .status(500)
        .json({ success: false, message: "Failed to upload to S3" });
    }
  });
};

// ==================== BLOG IMAGE UPLOAD ====================
export const uploadBlogImages = (req, res, next) => {
  upload.single("blogImage")(req, res, async (err) => {
    if (err)
      return res.status(400).json({ success: false, message: err.message });

    try {
      const key = await uploadFileToS3(req.file, "blogs");
      req.file.key = key;
      next();
    } catch (uploadErr) {
      console.error("S3 upload error:", uploadErr);
      return res
        .status(500)
        .json({ success: false, message: "Failed to upload blog image" });
    }
  });
};

export default { uploadCropImages, uploadBlogImages };
