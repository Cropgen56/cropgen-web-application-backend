import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import { connectToDatabase } from "./src/config/db.js";
import authRoutes from "./src/routes/authRoutes.js";
import fieldRoutes from "./src/routes/fieldRoutes.js";
import blogRoutes from "./src/routes/blogRoutes.js";
import organizationRoutes from "./src/routes/organizationRoutes.js";
import operationRoutes from "./src/routes/operationRoutes.js";
import cropRoutes from "./src/routes/cropRoutes.js";
import "./src/config/firebaseConfig.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// CORS setup
const corsOptions = {
  origin: [
    "https://admin.cropgenapp.com",
    "https://www.cropgenapp.com",
    "https://app.cropgenapp.com",
    "https://cropydeals.cropgenapp.com",
    "http://localhost:3000",
    "http://localhost:5173",
    "https://eelabcarbon.cropgenapp.com",
  ],
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
  allowedHeaders: ["Content-Type", "Authorization"],
};
app.use(cors(corsOptions));
app.options("*", cors(corsOptions));
app.use(express.json());

// Routes
app.use("/v1/api/auth", authRoutes);
app.use("/v1/api/field", fieldRoutes);
app.use("/v1/api/blog", blogRoutes);
app.use("/v1/api/org", organizationRoutes);
app.use("/v1/api/operation", operationRoutes);
app.use("/v1/api/crop", cropRoutes);

const startServer = async () => {
  try {
    await connectToDatabase();
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error("Server failed to start:", error.message);
    process.exit(1);
  }
};

startServer();
