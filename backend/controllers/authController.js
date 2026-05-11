// ============================================================
// controllers/authController.js — Auth Business Logic
// ============================================================
// Controllers contain the actual logic for each route.
// They are kept separate from routes to keep code clean and
// easy to test individually.
//
// Think of it this way:
//   routes/authRoutes.js   → "WHAT URL triggers this action?"
//   controllers/authController.js → "WHAT happens when it triggers?"
// ============================================================

const User = require("../models/userModel");
const generateToken = require("../utils/generateToken");
const asyncHandler = require("../utils/asyncHandler");
const ErrorResponse = require("../utils/errorResponse");

// ============================================================
// Helper: Send token response
// ============================================================
// DRY principle — both register and login send the same response
// format, so we extract it into one reusable function.
const sendTokenResponse = (user, statusCode, res) => {
  // Generate the JWT token using the user's MongoDB _id
  const token = generateToken(user._id);

  res.status(statusCode).json({
    success: true,
    token,
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      isVerified: user.isVerified,
      createdAt: user.createdAt,
    },
  });
};

// ============================================================
// @route   POST /api/auth/register
// @desc    Register a new user
// @access  Public (anyone can register)
// ============================================================
const registerUser = asyncHandler(async (req, res, next) => {
  // --- Step 1: Extract fields from request body ---
  // When the client sends: { "name": "Ali", "email": "ali@mail.com", "password": "123456" }
  // Express parses it and puts it in req.body
  const { name, email, password } = req.body;

  // --- Step 2: Validate required fields ---
  if (!name || !email || !password) {
    return next(new ErrorResponse("Please provide name, email and password", 400));
  }

  // --- Step 3: Check if email is already registered ---
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    return next(new ErrorResponse("An account with this email already exists", 400));
  }

  // --- Step 4: Create the user ---
  // The password is automatically hashed by our pre-save middleware
  // in userModel.js before it hits the database.
  const user = await User.create({ name, email, password });

  // --- Step 5: Send token + user info ---
  sendTokenResponse(user, 201, res); // 201 = "Created"
});

// ============================================================
// @route   POST /api/auth/login
// @desc    Login with email and password
// @access  Public
// ============================================================
const loginUser = asyncHandler(async (req, res, next) => {
  const { email, password } = req.body;

  // --- Step 1: Validate inputs ---
  if (!email || !password) {
    return next(new ErrorResponse("Please provide email and password", 400));
  }

  // --- Step 2: Find the user by email ---
  // We use .select("+password") because the password field has
  // `select: false` in the schema — it's hidden by default.
  const user = await User.findOne({ email }).select("+password");

  // --- Step 3: Check if user exists ---
  if (!user) {
    // Use a vague message intentionally — don't tell hackers
    // whether the email OR password was wrong (security best practice)
    return next(new ErrorResponse("Invalid email or password", 401));
  }

  // --- Step 4: Compare the entered password with the hashed one ---
  // user.comparePassword() is the instance method we defined in userModel.js
  const isPasswordMatch = await user.comparePassword(password);

  if (!isPasswordMatch) {
    return next(new ErrorResponse("Invalid email or password", 401));
  }

  // --- Step 5: Send token + user info ---
  sendTokenResponse(user, 200, res); // 200 = "OK"
});

// ============================================================
// @route   GET /api/auth/me
// @desc    Get the currently logged-in user's profile
// @access  Private (requires valid JWT token)
// ============================================================
const getMe = asyncHandler(async (req, res, next) => {
  // req.user was attached by the protect middleware (authMiddleware.js)
  // We query fresh from DB to get the latest data
  const user = await User.findById(req.user.id);

  res.status(200).json({
    success: true,
    user,
  });
});

module.exports = { registerUser, loginUser, getMe };
