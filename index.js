import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import cluster from "cluster";
import { cpus } from "os";
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

const numCPUs = cpus().length;
const PORT = process.env.PORT || 5000;

if (cluster.isPrimary) {
  console.log(`Primary ${process.pid} is running`);

  // Fork workers equal to the number of CPU cores
  for (let i = 0; i < 2; i++) {
    cluster.fork();
  }

  // Handle worker exit and restart
  cluster.on("exit", (worker, code, signal) => {
    console.log(
      `Worker ${worker.process.pid} died with code: ${code}, signal: ${signal}`
    );
    console.log("Starting a new worker");
    cluster.fork();
  });
} else {
  const app = express();

  // CORS configuration
  const corsOptions = {
    origin: function (origin, callback) {
      const allowedOrigins = [
        "https://admin.cropgenapp.com",
        "https://www.cropgenapp.com",
        "https://app.cropgenapp.com",
        "https://cropydeals.cropgenapp.com",
        "http://localhost:3000",
        "http://localhost:5173",
        "https://eelabcarbon.cropgenapp.com",
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

  // Start Server and Sync Database for each worker
  const startServer = async () => {
    try {
      await connectToDatabase();
      app.listen(PORT, "0.0.0.0", () => {
        console.log(
          `Worker ${process.pid} running on http://localhost:${PORT}`
        );
      });
    } catch (error) {
      console.error(`Worker ${process.pid} failed to start:`, error.message);
      process.exit(1);
    }
  };

  startServer();
}
