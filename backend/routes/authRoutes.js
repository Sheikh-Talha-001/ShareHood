// ============================================================
// routes/authRoutes.js — Auth URL Definitions
// ============================================================
// Routes define WHICH URL + HTTP METHOD triggers WHICH controller.
// We keep routes thin — they just connect URLs to controller functions.
//
// Express Router lets us group related routes together and
// mount them at a base path in server.js (e.g. /api/auth)
// ============================================================

const express = require("express");
const router = express.Router();

// Import controller functions (the actual logic)
const { registerUser, loginUser, getMe } = require("../controllers/authController");

// Import the protect middleware to guard private routes
const { protect } = require("../middleware/authMiddleware");

// ------------------------------------------------------------
// Public Routes — No token required
// ------------------------------------------------------------

// POST /api/auth/register → create a new user account
router.post("/register", registerUser);

// POST /api/auth/login → authenticate and get a token
router.post("/login", loginUser);

// ------------------------------------------------------------
// Private Routes — Valid JWT token REQUIRED
// ------------------------------------------------------------
// "protect" runs first; if the token is valid it calls next()
// and getMe runs. If the token is missing/invalid, protect
// sends an error response and getMe never runs.

// GET /api/auth/me → get the logged-in user's profile
router.get("/me", protect, getMe);

module.exports = router;
