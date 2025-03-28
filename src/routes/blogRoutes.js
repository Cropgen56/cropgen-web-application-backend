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

const router = express.Router();

router.post("/create", isAuthenticated, createBlog);
router.get("/list", checkApiKey, getAllBlogs);
router.get("/details/:blogId", isAuthenticated, getBlogById);
router.put("/update/:blogId", isAuthenticated, updateBlog);
router.delete("/delete/:blogId", isAuthenticated, deleteBlog);
router.post("/comment/:blogId", checkApiKey, addCommentToBlog);

export default router;
