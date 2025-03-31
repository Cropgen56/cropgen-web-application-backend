import Blog from "../models/blogModel.js";
import cloudinary from "../config/cloudinaryConfig.js";

// Create a Blog
export const createBlog = async (req, res) => {
  try {
    const { title, description, author } = req.body;

    // Check if required fields are provided
    if (!title || !description || !author) {
      return res.status(400).json({
        success: false,
        message: "Title, description, and author are required.",
      });
    }

    // Check if image file is uploaded
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Image is required.",
      });
    }

    // Cloudinary stores the file and returns a URL
    const imageUrl = req.file.path;

    // Create and save the new blog post
    const newBlog = new Blog({ title, description, image: imageUrl, author });
    await newBlog.save();

    res.status(201).json({
      success: true,
      message: "Blog created successfully!",
      blog: newBlog,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get All Blogs
export const getAllBlogs = async (req, res) => {
  try {
    const blogs = await Blog.find().sort({ createdAt: -1 });
    res.status(200).json({ blogs });
  } catch (error) {
    res.status(500).json({ error: "Internal Server Error" });
  }
};

//  Get a Single Blog by ID
export const getBlogById = async (req, res) => {
  try {
    const { blogId } = req.params;
    const blog = await Blog.findById(blogId);

    if (!blog) {
      return res.status(404).json({ error: "Blog not found" });
    }

    res.status(200).json({ blog });
  } catch (error) {
    res.status(500).json({ error: "Internal Server Error" });
  }
};

// Update a Blog
export const updateBlog = async (req, res) => {
  try {
    const { blogId } = req.params;
    const { title, description, author } = req.body;

    // Find the existing blog post
    const existingBlog = await Blog.findById(blogId);
    if (!existingBlog) {
      return res
        .status(404)
        .json({ success: false, message: "Blog not found" });
    }

    let imageUrl = existingBlog.image;

    // If a new image is uploaded, upload it to Cloudinary
    if (req.file) {
      // Delete the old image from Cloudinary
      if (existingBlog.image) {
        const publicId = existingBlog.image.split("/").pop().split(".")[0];
        await cloudinary.uploader.destroy(`blog_images/${publicId}`);
      }

      // Upload the new image to Cloudinary
      imageUrl = req.file.path;
    }

    // Update the blog post
    const updatedBlog = await Blog.findByIdAndUpdate(
      blogId,
      { title, description, author, image: imageUrl },
      { new: true, runValidators: true }
    );

    res.status(200).json({
      success: true,
      message: "Blog updated successfully",
      blog: updatedBlog,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

//  Delete a Blog
export const deleteBlog = async (req, res) => {
  try {
    const { blogId } = req.params;
    const deletedBlog = await Blog.findByIdAndDelete(blogId);

    if (!deletedBlog) {
      return res.status(404).json({ error: "Blog not found" });
    }

    res.status(200).json({ message: "Blog deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: "Internal Server Error" });
  }
};

// Add a Comment to a Blog
export const addCommentToBlog = async (req, res) => {
  try {
    const { blogId } = req.params;
    const { user, message } = req.body;

    if (!user || !message) {
      return res.status(400).json({ error: "User and message are required" });
    }

    const blog = await Blog.findById(blogId);
    if (!blog) {
      return res.status(404).json({ error: "Blog not found" });
    }

    // Add the comment
    const newComment = { user, message, commentedAt: new Date() };
    blog.comments.push(newComment);
    await blog.save();

    res.status(201).json({ message: "Comment added successfully", blog });
  } catch (error) {
    res.status(500).json({ error: "Internal Server Error" });
  }
};
