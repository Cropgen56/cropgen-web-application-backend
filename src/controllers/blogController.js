import Blog from "../models/blogModel.js";

//  Create a Blog
export const createBlog = async (req, res) => {
  try {
    const { title, description, image, author } = req.body;
    if (!title || !description || !image || !author) {
      return res.status(400).json({
        success: false,
        message: "All fields are required.",
      });
    }

    const newBlog = new Blog({ title, description, image, author });
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
    const { title, image, author, description } = req.body;

    const updatedBlog = await Blog.findByIdAndUpdate(
      blogId,
      { title, image, author, description },
      { new: true, runValidators: true }
    );

    if (!updatedBlog) {
      return res.status(404).json({ error: "Blog not found" });
    }

    res
      .status(200)
      .json({ message: "Blog updated successfully", blog: updatedBlog });
  } catch (error) {
    res.status(500).json({ error: "Internal Server Error" });
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
