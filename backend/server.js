// ============================================================
// server.js — Main Entry Point for ShareHood Backend API
// ============================================================
// This file boots up our Express server. Think of it as the
// "main()" of our backend application.
// ============================================================

// --- 1. Load Environment Variables ---
// dotenv reads the .env file and makes those values available
// via process.env.VARIABLE_NAME throughout the entire app.
// MUST be the very first import so all other modules can access env vars.
require("dotenv").config();

// --- 2. Core Imports ---
const express = require("express");   // The web framework
const cors = require("cors");         // Handles cross-origin requests (e.g. React frontend calling this API)
const morgan = require("morgan");     // HTTP request logger — shows every incoming request in the terminal
const cookieParser = require("cookie-parser"); // Parses cookies attached to client requests

// --- 3. Internal Imports ---
const connectDB = require("./config/db");                 // Our MongoDB connection helper
const { notFound, errorHandler } = require("./middleware/errorMiddleware"); // Custom error handlers
const authRoutes = require("./routes/authRoutes");         // Auth routes (register/login/me)

// ============================================================
// 4. Connect to MongoDB
// ============================================================
// We call this before starting the server so that the database
// is ready before we accept any requests.
connectDB();

// ============================================================
// 5. Initialize Express App
// ============================================================
const app = express();

// ============================================================
// 6. Core Middleware
// ============================================================
// Middleware are functions that run between receiving a request
// and sending a response. They form a pipeline:
//
//   Request → [middleware 1] → [middleware 2] → Route Handler → Response
//

// Enable JSON body parsing — allows us to read req.body in POST/PUT routes
app.use(express.json());

// Enable URL-encoded body parsing — handles HTML form submissions
app.use(express.urlencoded({ extended: true }));

// Enable CORS (Cross-Origin Resource Sharing)
// Without this, a browser running on localhost:3000 (React) would be
// BLOCKED from calling our API on localhost:5000.
app.use(
  cors({
    origin: process.env.CLIENT_URL || "http://localhost:3000",
    credentials: true, // Allow cookies to be sent with requests
  })
);

// Morgan logger — logs every request to the terminal in "dev" format
// Example output: GET / 200 5.234 ms - 58
app.use(morgan("dev"));

// Cookie parser — parses the Cookie header and populates req.cookies
app.use(cookieParser());

// ============================================================
// 7. API Routes
// ============================================================

// Silence common browser auto-requests that create noisy 404 logs
app.get("/favicon.ico", (req, res) => res.status(204).end());
app.get("/.well-known/appspecific/com.chrome.devtools.json", (req, res) => res.status(204).end());

// Root health-check route — useful to verify the server is alive
// Visiting http://localhost:5000/ will return this JSON response
app.get("/", (req, res) => {
  res.status(200).json({
    success: true,
    message: "ShareHood API Running 🚀",
  });
});

// ============================================================
// Auth Routes
// ============================================================
// All requests to /api/auth/... are handled by authRoutes.
// Examples:
//   POST http://localhost:5000/api/auth/register
//   POST http://localhost:5000/api/auth/login
//   GET  http://localhost:5000/api/auth/me
app.use("/api/auth", authRoutes);

// TODO: Add more feature routes here as you build them, e.g.:
// const listingRoutes = require('./routes/listingRoutes');
// app.use('/api/listings', listingRoutes);

// ============================================================
// 8. Error Handling Middleware
// ============================================================
// These MUST come AFTER all routes. Express identifies error
// middleware by its 4-parameter signature (err, req, res, next).

// 404 — catches any request to a route that doesn't exist
app.use(notFound);

// Global error handler — catches errors thrown anywhere in the app
app.use(errorHandler);

// ============================================================
// 9. Start the Server
// ============================================================
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});
