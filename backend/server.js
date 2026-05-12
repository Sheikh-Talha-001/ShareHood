// ============================================================
// server.js — Main Entry Point for ShareHood Backend API
// ============================================================

// --- 1. Load Environment Variables ---
require("dotenv").config();

// --- 2. Core Imports ---
const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
const cookieParser = require("cookie-parser");

// --- 3. Internal Imports ---
const connectDB = require("./config/db");
const { notFound, errorHandler } = require("./middleware/errorMiddleware");
const authRoutes = require("./routes/authRoutes");
const itemRoutes = require("./routes/itemRoutes");
const borrowRequestRoutes = require("./routes/borrowRequestRoutes");
const agreementRoutes = require("./routes/agreementRoutes");

// --- 4. Connect to MongoDB ---
connectDB();

// --- 5. Initialize Express App ---
const app = express();

// --- 6. Core Middleware ---
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(
  cors({
    origin: process.env.CLIENT_URL || "http://localhost:3000",
    credentials: true,
  })
);
app.use(morgan("dev"));
app.use(cookieParser());

// --- 7. API Routes ---

// Silence browser auto-requests
app.get("/favicon.ico", (req, res) => res.status(204).end());
app.get("/.well-known/appspecific/com.chrome.devtools.json", (req, res) => res.status(204).end());

// Health check
app.get("/", (req, res) => {
  res.status(200).json({
    success: true,
    message: "ShareHood API Running 🚀",
  });
});

// Auth:  POST /api/auth/register, /login, /logout | GET /api/auth/me
app.use("/api/auth", authRoutes);

// Items: POST/GET /api/items | GET /api/items/my-items | GET/PUT/DELETE /api/items/:id
app.use("/api/items", itemRoutes);

// Requests: POST /api/requests | GET /my-requests, /received | PUT /:id/approve, /reject, /cancel, /return
app.use("/api/requests", borrowRequestRoutes);

// Agreements: GET /api/agreements | GET /:id | GET /:id/download
app.use("/api/agreements", agreementRoutes);

// --- 8. Error Handling (MUST be after all routes) ---
app.use(notFound);
app.use(errorHandler);

// --- 9. Start Server ---
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});
