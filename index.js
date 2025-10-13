import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import cookieParser from "cookie-parser";
import https from "https";
import http from "http";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

import { connectToDatabase } from "./src/config/db.js";
import authRoutes from "./src/routes/authRoutes.js";
import fieldRoutes from "./src/routes/fieldRoutes.js";
import blogRoutes from "./src/routes/blogRoutes.js";
import organizationRoutes from "./src/routes/organizationRoutes.js";
import operationRoutes from "./src/routes/operationRoutes.js";
import cropRoutes from "./src/routes/cropRoutes.js";
import emailRoutes from "./src/routes/emailRoutes.js";
import "./src/config/firebaseConfig.js";
import subscriptionRoutes from "./src/routes/subscriptionPlans.js";
import userSubscriptionRoutes from "./src/routes/userSubscriptions.js";

dotenv.config();

// Resolve __dirname for ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT ? Number(process.env.PORT) : 7070;
const NODE_ENV = process.env.NODE_ENV || "development";

// === CORS configuration ===
const allowedOrigins = [
  "https://admin.cropgenapp.com",
  "https://www.cropgenapp.com",
  "https://app.cropgenapp.com",
  "https://cropydeals.cropgenapp.com",
  // Local dev (HTTP and HTTPS)
  "http://localhost:3000",
  "http://localhost:5173",
  "https://localhost:3000",
  NODE_ENV === "development" ? "https://localhost:3000" : undefined,
  NODE_ENV === "development" ? "https://localhost:5173" : undefined,
  NODE_ENV === "development" ? "https://localhost:7070" : undefined,
].filter(Boolean);

const corsOptions = {
  origin: function (origin, callback) {
    console.log("Request Origin:", origin); // Debug log for origin
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, origin || allowedOrigins[0]); // Return exact origin
    } else {
      console.error(`Blocked origin: ${origin}`);
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
  allowedHeaders: [
    "Content-Type",
    "Authorization",
    "x-api-key",
    "X-Requested-With",
  ],
  optionsSuccessStatus: 204,
  exposedHeaders: ["Set-Cookie"], // Ensure Set-Cookie is exposed
};

// Apply middleware
app.use(cors(corsOptions));
app.options("*", cors(corsOptions));
app.use(express.json());
app.use(cookieParser());

// Middleware to log response headers for debugging
app.use((req, res, next) => {
  res.on("finish", () => {
    console.log("Response Headers:", res.getHeaders());
  });
  next();
});

// Routes
app.use("/v1/api/auth", authRoutes);
app.use("/v1/api/field", fieldRoutes);
app.use("/v1/api/blog", blogRoutes);
app.use("/v1/api/org", organizationRoutes);
app.use("/v1/api/operation", operationRoutes);
app.use("/v1/api/crop", cropRoutes);
app.use("/v1/api/email", emailRoutes);
app.use("/v1/api/subscription", subscriptionRoutes);
app.use("/v1/api/user-subscriptions", userSubscriptionRoutes);

app.get("/v1/api/test-cookies", (req, res) => {
  console.log("Received Cookies:", req.cookies);
  res.json({ cookies: req.cookies });
});

// Health check
app.get("/health", (req, res) => {
  res.send("Server is up");
});

// Start server (HTTPS for development, HTTP for production)
const startServer = async () => {
  try {
    await connectToDatabase();

    if (NODE_ENV === "development") {
      // Load SSL certificates for HTTPS
      const options = {
        key: fs.readFileSync(
          path.join(__dirname, "src/certs/localhost+2-key.pem")
        ),
        cert: fs.readFileSync(
          path.join(__dirname, "src/certs/localhost+2.pem")
        ),
      };
      https.createServer(options, app).listen(PORT, "0.0.0.0", () => {
        console.log(`✅ HTTPS Server running at https://localhost:${PORT}`);
      });
    } else {
      // Use HTTP for production
      http.createServer(app).listen(PORT, "0.0.0.0", () => {
        console.log(`✅ HTTP Server running at http://localhost:${PORT}`);
      });
    }
  } catch (error) {
    console.error("Server failed to start:", error.message);
    process.exit(1);
  }
};

startServer();
