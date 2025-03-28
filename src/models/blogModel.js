import mongoose from "mongoose";

const blogSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      required: true,
    },
    image: {
      type: String,
      required: true,
    },
    author: {
      type: String,
      enum: ["admin", "farmer", "client", "developer"],
      required: true,
    },
    comments: [
      {
        user: {
          type: String,
          required: true,
        },
        message: {
          type: String,
          required: true,
        },
        commentedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
  },
  { timestamps: true }
);

const Blog = mongoose.model("Blog", blogSchema);
export default Blog;
