import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import cookieParser from "cookie-parser";
import http from "http";
import { fileURLToPath } from "url";
import path from "path";
import bodyParser from "body-parser";
import { connectToDatabase } from "./src/config/db.js";
import authRoutes from "./src/routes/authRoutes.js";
import fieldRoutes from "./src/routes/fieldRoutes.js";
import blogRoutes from "./src/routes/blogRoutes.js";
import organizationRoutes from "./src/routes/organizationRoutes.js";
import operationRoutes from "./src/routes/operationRoutes.js";
import cropRoutes from "./src/routes/cropRoutes.js";
import emailRoutes from "./src/routes/emailRoutes.js";
import "./src/config/firebaseConfig.js";
import subscriptionRoutes from "./src/routes/subscriptionPlansRoutes.js";
import razorpayRoutes from "./src/routes/razorpayRoutes.js";

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
  NODE_ENV === "development" ? "https://localhost:3000" : undefined,
  NODE_ENV === "development" ? "https://localhost:5173" : undefined,
  NODE_ENV === "development" ? "https://localhost:7070" : undefined,
].filter(Boolean);

const corsOptions = {
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, origin || allowedOrigins[0]);
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
  exposedHeaders: ["Set-Cookie"],
};

// Apply middleware
app.use(cors(corsOptions));
app.options("*", cors(corsOptions));

app.use("/v1/api/user-subscriptions/webhook", (req, res, next) => {
  bodyParser.raw({ type: "application/json" })(req, res, () => {
    req.rawBody = req.body;
    try {
      req.body = JSON.parse(req.body.toString());
    } catch (err) {
      return res.status(400).json({ error: "Invalid JSON" });
    }
    next();
  });
});

app.use(express.json());
app.use(cookieParser());

// Routes
app.use("/v1/api/auth", authRoutes);
app.use("/v1/api/field", fieldRoutes);
app.use("/v1/api/blog", blogRoutes);
app.use("/v1/api/org", organizationRoutes);
app.use("/v1/api/operation", operationRoutes);
app.use("/v1/api/crop", cropRoutes);
app.use("/v1/api/email", emailRoutes);
app.use("/v1/api/subscription", subscriptionRoutes);
app.use("/v1/api/user-subscriptions", razorpayRoutes);

// Health check
app.get("/health", (req, res) => {
  return res.status(200).json({
    status: true,
    message: "server is good and running ",
    cookies: req.cookies,
  });
});

// Start server
const startServer = async () => {
  try {
    await connectToDatabase();
    http.createServer(app).listen(PORT, "0.0.0.0", () => {
      console.log(`✅ HTTP Server running at http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error("Server failed to start:", error.message);
    process.exit(1);
  }
};

startServer();
