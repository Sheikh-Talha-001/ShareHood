// models/userModel.js
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Please provide a name"],
      trim: true,
    },
    email: {
      type: String,
      required: [true, "Please provide an email"],
      unique: true,
      lowercase: true,
      trim: true,
      match: [
        /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
        "Please provide a valid email",
      ],
    },
    password: {
      type: String,
      required: [true, "Please provide a password"],
      minlength: [8, "Password must be at least 8 characters"],
      select: false,
    },
    role: {
      type: String,
      enum: ["user", "admin"],
      default: "user",
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// ------------------------------------------------------------
// FIXED: Removed 'next' from async function arguments
// ------------------------------------------------------------
userSchema.pre("save", async function () {
  // If password is not modified, just finish
  if (!this.isModified("password")) {
    return;
  }

  // Generate salt and hash
  const salt = await bcrypt.genSalt(10);
  this.password = bcrypt.hash(this.password, salt);
  
  // NOTE: In async pre-hooks, you don't call next(). 
  // Returning from the function is enough for Mongoose.
});

userSchema.methods.comparePassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

const User = mongoose.model("User", userSchema);

module.exports = User;
