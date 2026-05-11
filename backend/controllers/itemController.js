// ============================================================
// controllers/itemController.js — Item CRUD + Image Upload
// ============================================================
// CLOUDINARY UPLOAD FLOW:
//   1. Multer receives the image and stores it in memory (req.file.buffer)
//   2. We convert the buffer to a base64 "data URI" string
//   3. We call cloudinary.uploader.upload() with that string
//   4. Cloudinary stores the image and returns { secure_url, public_id }
//   5. We save the URL and public_id in MongoDB
//
// CLOUD CLEANUP:
//   When an item is updated with a new image, we DELETE the old
//   image from Cloudinary first. When an item is deleted entirely,
//   we also delete its Cloudinary image. This prevents "orphan"
//   files sitting on the cloud forever, wasting storage.
// ============================================================

const Item = require("../models/itemModel");
const asyncHandler = require("../utils/asyncHandler");
const ErrorResponse = require("../utils/errorResponse");
const cloudinary = require("../config/cloudinary");

// ============================================================
// Helper: Upload image buffer to Cloudinary
// ============================================================
// Cloudinary's upload() function expects a file path OR a base64
// data URI. Since we use multer memoryStorage (no file on disk),
// we convert the buffer to a data URI string.
const uploadToCloudinary = (fileBuffer, mimetype) => {
  return new Promise((resolve, reject) => {
    const base64 = fileBuffer.toString("base64");
    const dataUri = `data:${mimetype};base64,${base64}`;

    cloudinary.uploader.upload(
      dataUri,
      {
        folder: "sharehood",       // All images go into a "sharehood" folder
        resource_type: "image",
      },
      (error, result) => {
        if (error) reject(error);
        else resolve(result);
      }
    );
  });
};

// ============================================================
// @route   POST /api/items
// @desc    Create a new item listing (with optional image)
// @access  Private (logged-in users only)
// ============================================================
const createItem = asyncHandler(async (req, res, next) => {
  // Set the owner to the currently logged-in user
  req.body.owner = req.user._id;

  // If user uploaded an image file, upload it to Cloudinary
  if (req.file) {
    const result = await uploadToCloudinary(req.file.buffer, req.file.mimetype);
    req.body.image = result.secure_url;       // The public URL
    req.body.imagePublicId = result.public_id; // ID for future deletion
  }

  const item = await Item.create(req.body);

  res.status(201).json({
    success: true,
    message: "Item created successfully",
    data: item,
  });
});

// ============================================================
// @route   GET /api/items
// @desc    Get all items (public — anyone can browse)
// @access  Public
// ============================================================
const getAllItems = asyncHandler(async (req, res, next) => {
  // .populate() replaces the owner ObjectId with actual user data
  const items = await Item.find().populate("owner", "name email");

  res.status(200).json({
    success: true,
    count: items.length,
    data: items,
  });
});

// ============================================================
// @route   GET /api/items/:id
// @desc    Get a single item by its ID
// @access  Public
// ============================================================
const getSingleItem = asyncHandler(async (req, res, next) => {
  const item = await Item.findById(req.params.id).populate("owner", "name email");

  if (!item) {
    return next(new ErrorResponse("Item not found", 404));
  }

  res.status(200).json({
    success: true,
    data: item,
  });
});

// ============================================================
// @route   PUT /api/items/:id
// @desc    Update an item (with optional new image)
// @access  Private (only the owner can update)
// ============================================================
const updateItem = asyncHandler(async (req, res, next) => {
  let item = await Item.findById(req.params.id);

  if (!item) {
    return next(new ErrorResponse("Item not found", 404));
  }

  // --- OWNERSHIP CHECK ---
  if (item.owner.toString() !== req.user._id.toString()) {
    return next(new ErrorResponse("You are not authorized to update this item", 403));
  }

  // --- If user uploaded a NEW image, replace the old one ---
  if (req.file) {
    // Step 1: Delete the OLD image from Cloudinary (cleanup)
    if (item.imagePublicId) {
      await cloudinary.uploader.destroy(item.imagePublicId);
    }

    // Step 2: Upload the NEW image
    const result = await uploadToCloudinary(req.file.buffer, req.file.mimetype);
    req.body.image = result.secure_url;
    req.body.imagePublicId = result.public_id;
  }

  // Update the item in MongoDB
  item = await Item.findByIdAndUpdate(req.params.id, req.body, {
    new: true,           // Return the updated document
    runValidators: true, // Re-run schema validations
  });

  res.status(200).json({
    success: true,
    message: "Item updated successfully",
    data: item,
  });
});

// ============================================================
// @route   DELETE /api/items/:id
// @desc    Delete an item (and its Cloudinary image)
// @access  Private (only the owner can delete)
// ============================================================
const deleteItem = asyncHandler(async (req, res, next) => {
  const item = await Item.findById(req.params.id);

  if (!item) {
    return next(new ErrorResponse("Item not found", 404));
  }

  // --- OWNERSHIP CHECK ---
  if (item.owner.toString() !== req.user._id.toString()) {
    return next(new ErrorResponse("You are not authorized to delete this item", 403));
  }

  // --- Delete the image from Cloudinary (prevent orphan files) ---
  if (item.imagePublicId) {
    await cloudinary.uploader.destroy(item.imagePublicId);
  }

  // Delete the item document from MongoDB
  await Item.findByIdAndDelete(req.params.id);

  res.status(200).json({
    success: true,
    message: "Item deleted successfully",
    data: {},
  });
});

// ============================================================
// @route   GET /api/items/my-items
// @desc    Get only the logged-in user's items
// @access  Private
// ============================================================
const getMyItems = asyncHandler(async (req, res, next) => {
  const items = await Item.find({ owner: req.user._id }).populate("owner", "name email");

  res.status(200).json({
    success: true,
    count: items.length,
    data: items,
  });
});

module.exports = {
  createItem,
  getAllItems,
  getSingleItem,
  updateItem,
  deleteItem,
  getMyItems,
};
