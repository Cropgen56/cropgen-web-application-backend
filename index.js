import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import { connectToDatabase } from "./src/config/db.js";
import authRoutes from "./src/routes/authRoutes.js";
import fieldRoutes from "./src/routes/fieldRoutes.js";
import { createToken } from "./src/utils/tokenUtility.js";
dotenv.config();

const app = express();

// Use the CORS middleware with the specified options
app.use(cors());
app.use(express.json());

// Routes
app.use("/v1/api/auth", authRoutes);
app.use("/v1/api/field", fieldRoutes);

createToken("vishal");

// Start Server and Sync Database
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
