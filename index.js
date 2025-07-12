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
import { createToken } from "./src/utils/tokenUtility.js";
dotenv.config();

const app = express();

// Use the CORS middleware with the specified options
const corsOptions = {
  origin: function (origin, callback) {
    const allowedOrigins = [
      "https://admin.cropgenapp.com",
      "https://www.cropgenapp.com",
      "https://app.cropgenapp.com",
      "https://cropydeals.cropgenapp.com",
      "http://localhost:3000",
      "http://localhost:5173",
    ];
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error("CORS policy violation: Origin not allowed"));
    }
  },
  credentials: true,
};

app.use(cors(corsOptions));

app.use(express.json());

// Routes
app.use("/v1/api/auth", authRoutes);
app.use("/v1/api/field", fieldRoutes);
app.use("/v1/api/blog", blogRoutes);
app.use("/v1/api/org", organizationRoutes);
app.use("/v1/api/operation", operationRoutes);
app.use("/v1/api/crop", cropRoutes);

// createToken("vishal");

// Start Server and Sync Database`
const startServer = async () => {
  try {
    connectToDatabase();
    const PORT = process.env.PORT || 5000;
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error("Error starting server or syncing database:", error.message);
  }
};

startServer();
