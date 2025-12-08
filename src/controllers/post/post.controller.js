import Post from "../../models/postsModel.js";
import Comment from "../../models/commentModel.js";
import mongoose from "mongoose";

export const createPost = async (req, res) => {
  try {
    const { content, images, tags } = req.body;

    if (!content || !content.trim()) {
      return res.status(400).json({ message: "Content is required" });
    }

    const post = await Post.create({
      author: req.user.id,
      content: content.trim(),
      images: images || [],
      tags: tags || [],
    });

    await post.populate("author", "name avatar");

    return res.status(201).json({
      message: "Post created successfully",
      data: post,
    });
  } catch (error) {
    console.error("createPost error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const getPosts = async (req, res) => {
  try {
    const page = parseInt(req.query.page || "1", 10);
    const limit = parseInt(req.query.limit || "10", 10);
    const skip = (page - 1) * limit;

    const [posts, total] = await Promise.all([
      Post.find({})
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate({
          path: "author",
          // return everything except sensitive/internal fields
          select:
            "-otp -otpExpires -otpAttemptCount -lastOtpSentAt -refreshTokenId -firebaseUid -__v",
        })
        .lean(),
      Post.countDocuments(),
    ]);

    return res.status(200).json({
      data: posts,
      pagination: {
        page,
        limit,
        total,
        hasMore: skip + posts.length < total,
      },
    });
  } catch (error) {
    console.error("getPosts error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const getPostById = async (req, res) => {
  try {
    const { postId } = req.params;

    const post = await Post.findById(postId)
      .populate("author", "name avatar")
      .lean();

    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }

    const comments = await Comment.find({ post: postId })
      .sort({ createdAt: 1 })
      .populate("author", "name avatar")
      .lean();

    return res.status(200).json({
      data: {
        post,
        comments,
      },
    });
  } catch (error) {
    console.error("getPostById error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const deletePost = async (req, res) => {
  try {
    const { postId } = req.params;

    // 1. Validate ObjectId first → avoids CastError
    if (!mongoose.Types.ObjectId.isValid(postId)) {
      return res.status(400).json({ message: "Invalid post id" });
    }

    // 2. Make sure auth middleware set req.user
    if (!req.user || !req.user.id) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const post = await Post.findById(postId);

    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }

    // ❗ Adjust this field name based on your schema
    // If your Post schema uses createdBy / userId / user instead of author, change it here.
    const ownerId = post.author || post.createdBy || post.userId || post.user;

    if (!ownerId) {
      // Fallback if the document really has no owner field
      return res
        .status(500)
        .json({ message: "Post has no owner field (check schema)" });
    }

    const isOwner = ownerId.toString() === req.user.id?.toString();
    const isAdmin = req.user.role === "admin";

    if (!isOwner && !isAdmin) {
      return res
        .status(403)
        .json({ message: "Not authorized to delete this post" });
    }

    // Delete post
    await Post.deleteOne({ _id: postId });

    // Optionally delete comments related to this post
    await Comment.deleteMany({ post: postId });

    return res.status(200).json({ message: "Post deleted successfully" });
  } catch (error) {
    console.error("deletePost error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const toggleLike = async (req, res) => {
  try {
    const { postId } = req.params;

    // 1. Validate postId
    if (!mongoose.Types.ObjectId.isValid(postId)) {
      return res.status(400).json({ message: "Invalid post id" });
    }

    // 2. Get user id from auth (IMPORTANT)
    const userId = req.user?.id;

    if (!userId) {
      return res
        .status(401)
        .json({ message: "Unauthorized: user not found in request" });
    }

    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }

    // 3. Clean any null/undefined from existing likes
    post.likes = (post.likes || []).filter((id) => !!id);

    const userIdStr = userId.toString();

    const alreadyLiked = post.likes.some((id) => id.toString() === userIdStr);

    if (alreadyLiked) {
      // unlike
      post.likes = post.likes.filter((id) => id.toString() !== userIdStr);
    } else {
      // like
      post.likes.push(userId);
    }

    await post.save();

    return res.status(200).json({
      message: "Like status updated",
      data: {
        liked: !alreadyLiked,
        likesCount: post.likes.length,
      },
    });
  } catch (error) {
    console.error("toggleLike error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};
