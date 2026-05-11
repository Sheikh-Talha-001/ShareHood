// ============================================================
// utils/generateToken.js — JWT Token Generator
// ============================================================
// JWT = JSON Web Token
//
// Think of a JWT like a signed wristband at a concert.
// When you log in, the server hands you this wristband (token).
// On every future request, you show the wristband — the server
// verifies it's real (by checking the signature) and lets you in.
//
// A JWT has 3 parts separated by dots:
//   HEADER.PAYLOAD.SIGNATURE
//
// The PAYLOAD contains your data (e.g. user ID).
// The SIGNATURE proves the token was created by OUR server
// (only we know the JWT_SECRET).
//
// JWTs are STATELESS — the server doesn't need to remember
// anything. All the info is inside the token itself.
// ============================================================

const jwt = require("jsonwebtoken");

// generateToken takes a user ID and returns a signed JWT string
const generateToken = (userId) => {
  return jwt.sign(
    { id: userId },              // PAYLOAD — data we embed in the token
    process.env.JWT_SECRET,      // SECRET — used to sign (and later verify) the token
    { expiresIn: process.env.JWT_EXPIRES_IN || "7d" } // Token expires after 7 days
  );
};

module.exports = generateToken;
