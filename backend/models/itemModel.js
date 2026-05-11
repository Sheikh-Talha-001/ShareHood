// ============================================================
// models/itemModel.js — Item Database Schema
// ============================================================
// RELATIONSHIP (ObjectId Reference):
//   The "owner" field stores a User's _id. This creates a link
//   between the items and users collections:
//     items.owner → users._id
//
//   Using .populate("owner", "name email") replaces the raw _id
//   with the actual user data when we query items.
// ============================================================

const mongoose = require("mongoose");

const itemSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Please provide an item title"],
      trim: true,
      maxlength: [100, "Title cannot exceed 100 characters"],
    },

    description: {
      type: String,
      trim: true,
      maxlength: [1000, "Description cannot exceed 1000 characters"],
      default: "",
    },

    category: {
      type: String,
      required: [true, "Please provide a category"],
      trim: true,
    },

    condition: {
      type: String,
      enum: ["new", "like-new", "good", "fair", "poor"],
      default: "good",
    },

    // -------------------------------------------------------
    // Image Fields — We store the Cloudinary URL, not the file
    // -------------------------------------------------------
    // image: The public URL where the image can be viewed
    //   e.g. "https://res.cloudinary.com/your-cloud/image/upload/v123/sharehood/abc.jpg"
    //
    // imagePublicId: Cloudinary's unique identifier for the image
    //   e.g. "sharehood/abc"
    //   We need this to DELETE the image from Cloudinary later.
    //   Without it, deleted items would leave orphan files in the cloud.
    image: {
      type: String,
      default: "",
    },

    imagePublicId: {
      type: String,
      default: "",
    },

    availability: {
      type: Boolean,
      default: true,
    },

    location: {
      type: String,
      trim: true,
      default: "",
    },

    // RELATIONSHIP: Who owns this item?
    // type: ObjectId → stores a MongoDB _id
    // ref: "User" → tells Mongoose which collection to populate from
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Item must have an owner"],
    },
  },
  {
    timestamps: true,
  }
);

const Item = mongoose.model("Item", itemSchema);

module.exports = Item;
