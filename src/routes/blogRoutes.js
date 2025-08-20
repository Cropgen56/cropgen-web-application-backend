import express from "express";
import {
  createBlog,
  deleteBlog,
  getAllBlogs,
  getBlogById,
  updateBlog,
  uploadBlogImage,
} from "../controllers/blogController.js";
import {
  isAuthenticated,
  authorizeRoles,
} from "../middleware/authMiddleware.js";
import { uploadBlogImages } from "../middleware/uploadImage.js";

const router = express.Router();

router.post("/create", isAuthenticated, authorizeRoles("admin"), createBlog);
router.get("/", getAllBlogs);
router.get("/:id", getBlogById);
router.put("/:id", isAuthenticated, authorizeRoles("admin"), updateBlog);
router.delete("/:id", isAuthenticated, authorizeRoles("admin"), deleteBlog);
router.post(
  "/upload-image",
  isAuthenticated,
  uploadBlogImages,
  uploadBlogImage
);

export default router;
