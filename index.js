// index.js (ESM)
import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import cookieParser from "cookie-parser";

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

const app = express();
const PORT = process.env.PORT ? Number(process.env.PORT) : 7070;

// === CORS configuration ===
// Allowed origins (exact match) — include HTTPS localhost origins for mkcert setup
const allowedOrigins = [
  "https://admin.cropgenapp.com",
  "https://www.cropgenapp.com",
  "https://app.cropgenapp.com",
  "https://cropydeals.cropgenapp.com",
  // Local dev (HTTP and HTTPS)
  "http://localhost:3000",
  "http://localhost:5173",
  "http://localhost:7070",
  "https://localhost:3000",
  "https://localhost:5173",
  "https://localhost:7070",
];

const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like Postman or server-to-server)
    if (!origin) return callback(null, true);

    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    console.log(`Blocked origin: ${origin}`);
    return callback(new Error("Not allowed by CORS"));
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
  allowedHeaders: [
    "Content-Type",
    "Authorization",
    "x-api-key",
    "X-Requested-With",
  ],
  preflightContinue: false,
  optionsSuccessStatus: 204,
};

// Apply middleware
app.use(cors(corsOptions));
app.options("*", cors(corsOptions)); // handle preflight
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
app.use("/v1/api/user-subscriptions", userSubscriptionRoutes);

app.get("/v1/api/test-cookies", (req, res) => {
  console.log("Cookies:", req.cookies);
  res.json({ cookies: req.cookies });
});

// Health check
app.get("/", (req, res) => {
  res.send("Server is up");
});

// Start HTTP server
const startServer = async () => {
  try {
    await connectToDatabase();
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`✅ HTTP Server running at http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error("Server failed to start:", error.message);
    process.exit(1);
  }
};

startServer();
