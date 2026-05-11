// ============================================================
// routes/authRoutes.js — Auth URL Definitions
// ============================================================

const express = require("express");
const router = express.Router();

const { registerUser, loginUser, getMe, logoutUser } = require("../controllers/authController");
const { protect } = require("../middleware/authMiddleware");

// Public
router.post("/register", registerUser);
router.post("/login", loginUser);

// Private
router.get("/me", protect, getMe);
router.post("/logout", protect, logoutUser);

module.exports = router;
