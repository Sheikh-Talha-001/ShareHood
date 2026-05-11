// ============================================================
// routes/itemRoutes.js — Item URL Definitions
// ============================================================
// MULTER IN ROUTES:
//   upload.single("image") is a middleware that:
//     1. Looks for a file field named "image" in the request
//     2. Extracts the file and puts it in req.file
//     3. Extracts text fields and puts them in req.body
//
//   It only runs on routes that accept file uploads (POST, PUT).
//   GET and DELETE don't need it.
//
// IMPORTANT: /my-items MUST come BEFORE /:id
//   Otherwise Express treats "my-items" as an ID parameter.
// ============================================================

const express = require("express");
const router = express.Router();

// Import controller functions
const {
  createItem,
  getAllItems,
  getSingleItem,
  updateItem,
  deleteItem,
  getMyItems,
} = require("../controllers/itemController");

// Import protect middleware (JWT verification)
const { protect } = require("../middleware/authMiddleware");

// Import multer upload middleware (file handling)
const upload = require("../middleware/uploadMiddleware");

// ------------------------------------------------------------
// Public Routes — No token required
// ------------------------------------------------------------

// GET /api/items — browse all available items
router.get("/", getAllItems);

// ------------------------------------------------------------
// Private Routes — Valid JWT required
// ------------------------------------------------------------

// POST /api/items — create a new item with optional image
// protect: verifies JWT → upload.single("image"): handles file → createItem: business logic
router.post("/", protect, upload.single("image"), createItem);

// GET /api/items/my-items — get items owned by logged-in user
// ⚠️ Must be ABOVE the /:id route
router.get("/my-items", protect, getMyItems);

// ------------------------------------------------------------
// Routes with :id parameter
// ------------------------------------------------------------

// GET /api/items/:id — get single item (public)
router.get("/:id", getSingleItem);

// PUT /api/items/:id — update item with optional new image (owner only)
router.put("/:id", protect, upload.single("image"), updateItem);

// DELETE /api/items/:id — delete item and its cloud image (owner only)
router.delete("/:id", protect, deleteItem);

module.exports = router;
