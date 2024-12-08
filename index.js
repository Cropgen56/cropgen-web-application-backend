import express from "express";
import dotenv from "dotenv";
import sequelize from "./src/config/db.js";
import authRoutes from "./src/routes/authRoutes.js";
import cors from "cors";

dotenv.config();

const app = express();

// Middleware
app.use(express.json());
app.use(cors());

// Routes
app.use("/api/auth", authRoutes);

// Start Server and Sync Database
const startServer = async () => {
  try {
    // Test DB connection
    await sequelize.authenticate();
    console.log("Database connected successfully.");

    // Sync models to database
    await sequelize.sync({ alter: true });
    console.log("Database synchronized successfully.");

    // Start the server
    const PORT = process.env.PORT || 5000;
    app.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error("Error starting server or syncing database:", error.message);
  }
};

startServer();
