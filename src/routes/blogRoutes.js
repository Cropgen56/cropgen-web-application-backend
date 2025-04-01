import express from "express";
import {
  createBlog,
  getAllBlogs,
  getBlogById,
  updateBlog,
  deleteBlog,
  addCommentToBlog,
} from "../controllers/blogController.js";
import { isAuthenticated, checkApiKey } from "../middleware/authMiddleware.js";
import upload from "../middleware/uploadImage.js";

const router = express.Router();

router.post("/create", isAuthenticated, upload.single("image"), createBlog);
router.get("/list", checkApiKey, getAllBlogs);
router.get("/details/:blogId", checkApiKey, getBlogById);
router.put(
  "/update/:blogId",
  isAuthenticated,
  upload.single("image"),
  updateBlog
);
router.delete("/delete/:blogId", isAuthenticated, deleteBlog);
router.post("/comment/:blogId", checkApiKey, addCommentToBlog);

export default router;
