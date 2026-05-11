// ============================================================
// middleware/authMiddleware.js — JWT Route Protection
// ============================================================
// This middleware "guards" private routes. It:
//   1. Reads the JWT token from the Authorization header
//   2. Verifies it is valid and not expired
//   3. Looks up the user in the database
//   4. Attaches the user to req.user so route handlers can use it
//
// HOW PROTECTED ROUTES WORK:
//
//   Client                    Server
//     |                          |
//     |-- POST /api/auth/login -->|
//     |<-- { token: "abc..." } --|
//     |                          |
//     |-- GET /api/auth/me ------>|  ← must include token
//     |   Authorization: Bearer abc...
//     |                          |-- protect() runs --
//     |                          |   ✅ token valid → attach user → handler runs
//     |<-- { user data } --------|
//
// ============================================================

const jwt = require("jsonwebtoken");
const asyncHandler = require("../utils/asyncHandler");
const ErrorResponse = require("../utils/errorResponse");
const User = require("../models/userModel");

// ------------------------------------------------------------
// protect — Verifies JWT and attaches user to req.user
// ------------------------------------------------------------
const protect = asyncHandler(async (req, res, next) => {
  let token;

  // Tokens are sent in the "Authorization" HTTP header as:
  //   Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5...
  // We check it starts with "Bearer" then extract the token part.
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    token = req.headers.authorization.split(" ")[1]; // Get the part after "Bearer "
  }

  // No token was provided — reject the request
  if (!token) {
    return next(new ErrorResponse("Not authorised — no token provided", 401));
  }

  // jwt.verify() decodes the token AND checks the signature.
  // If the token was tampered with or expired, it throws an error
  // which asyncHandler passes to the global error handler.
  const decoded = jwt.verify(token, process.env.JWT_SECRET);

  // decoded.id is the user ID we embedded when we created the token
  // We fetch the user from DB to make sure they still exist
  const user = await User.findById(decoded.id);

  if (!user) {
    return next(new ErrorResponse("User no longer exists", 401));
  }

  // Attach the full user object to the request — route handlers
  // can now access req.user to know who is making the request
  req.user = user;

  next(); // All checks passed — continue to the route handler
});

// ------------------------------------------------------------
// authorize — Restrict access by role (e.g. admin only)
// ------------------------------------------------------------
// Usage: router.delete('/user/:id', protect, authorize('admin'), deleteUser);
//
// ...rest is ES6 "rest parameters" — collects all arguments into an array
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return next(
        new ErrorResponse(
          `Role "${req.user.role}" is not allowed to access this route`,
          403
        )
      );
    }
    next();
  };
};

module.exports = { protect, authorize };
