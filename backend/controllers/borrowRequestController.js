// ============================================================
// controllers/borrowRequestController.js — Borrow Request Logic
// ============================================================
//
// WORKFLOW OVERVIEW:
//   This controller manages the full lifecycle of borrowing an
//   item from another user. Every action enforces strict business
//   rules to prevent invalid state transitions.
//
//   HAPPY PATH:
//     1. Borrower creates a request             → status: pending
//     2. Owner approves the request              → status: approved
//        (item.availability flips to false)
//     3. Owner marks the item as returned        → status: returned
//        (item.availability flips back to true)
//
//   ALTERNATIVE PATHS:
//     - Owner rejects  → status: rejected   (no availability change)
//     - Borrower cancels → status: cancelled (no availability change)
//
// WHY BUSINESS RULES MATTER:
//   Without strict rules, bad things happen:
//     - A user could borrow their own item (nonsensical)
//     - Multiple people could "borrow" the same item (conflict)
//     - A random user could approve someone else's request (security)
//     - A rejected request could be marked as returned (invalid state)
//   Each function below has checks to prevent these scenarios.
//
// POPULATE STRATEGY:
//   Every response populates related data so the frontend doesn't
//   need extra API calls:
//     - borrower → name, email
//     - owner    → name, email
//     - item     → title, image
// ============================================================

const BorrowRequest = require("../models/borrowRequestModel");
const Item = require("../models/itemModel");
const asyncHandler = require("../utils/asyncHandler");
const ErrorResponse = require("../utils/errorResponse");

// ============================================================
// POPULATE OPTIONS — Reusable configuration for .populate()
// ============================================================
// Instead of repeating these long populate strings in every
// function, we define them once and reuse them. This follows
// the DRY (Don't Repeat Yourself) principle.
//
// WHY SELECTIVE FIELDS?
//   We only populate specific fields (name, email, title, image)
//   instead of the entire document. This:
//     1. Reduces response size (less data over the network)
//     2. Avoids leaking sensitive data (e.g., password hashes)
//     3. Keeps the API response clean and predictable
// ============================================================
const POPULATE_OPTIONS = [
  { path: "borrower", select: "name email" },
  { path: "owner", select: "name email" },
  { path: "item", select: "title image" },
];

// ============================================================
// @route   POST /api/requests
// @desc    Create a new borrow request for an item
// @access  Private (authenticated users only)
// ============================================================
//
// BUSINESS RULES ENFORCED:
//   1. The item must exist
//   2. The item must be available (not already lent out)
//   3. You cannot request your own item
//   4. You cannot have a duplicate pending request for the same item
//
// WHY CHECK ALL THESE?
//   Each check prevents a specific real-world problem:
//     - Item doesn't exist → prevents requests for deleted items
//     - Item unavailable   → prevents double-booking
//     - Own item           → nonsensical operation
//     - Duplicate pending  → prevents spam requests
// ============================================================
const createBorrowRequest = asyncHandler(async (req, res, next) => {
  const { item: itemId, message, startDate, expectedReturnDate } = req.body;
  const borrowerId = req.user._id;

  // --- RULE 1: Item must exist ---
  const item = await Item.findById(itemId);
  if (!item) {
    return next(new ErrorResponse("Item not found", 404));
  }

  // --- RULE 2: Cannot request your own item ---
  // Why? It makes no sense to borrow something you already own.
  // We compare as strings because ObjectIds are objects, not primitives.
  if (item.owner.toString() === borrowerId.toString()) {
    return next(new ErrorResponse("You cannot request your own item", 400));
  }

  // --- RULE 3: Item must be available ---
  // If availability is false, someone else already has it.
  if (!item.availability) {
    return next(new ErrorResponse("This item is currently unavailable", 400));
  }

  // --- RULE 4: No duplicate pending requests ---
  // Check if this user already has a pending request for this item.
  // The database also has a partial unique index for this, but checking
  // here gives us a cleaner error message than a MongoDB duplicate key error.
  const existingRequest = await BorrowRequest.findOne({
    item: itemId,
    borrower: borrowerId,
    status: "pending",
  });

  if (existingRequest) {
    return next(
      new ErrorResponse(
        "You already have a pending request for this item",
        400
      )
    );
  }

  // --- Create the borrow request ---
  // We set the owner from the item document (not from user input)
  // to prevent tampering. The borrower can't fake who owns the item.
  const borrowRequest = await BorrowRequest.create({
    item: itemId,
    borrower: borrowerId,
    owner: item.owner, // Pulled from the item, NOT from req.body
    message: message || "",
    startDate,
    expectedReturnDate,
  });

  // Populate the references before sending the response
  // so the frontend gets full names/titles instead of raw ObjectIds
  const populatedRequest = await BorrowRequest.findById(borrowRequest._id)
    .populate(POPULATE_OPTIONS);

  res.status(201).json({
    success: true,
    message: "Borrow request created successfully",
    data: populatedRequest,
  });
});

// ============================================================
// @route   GET /api/requests/my-requests
// @desc    Get all requests the logged-in user has MADE (as borrower)
// @access  Private
// ============================================================
//
// USE CASE: "Show me everything I've requested to borrow"
//   The borrower wants to see the status of all their requests —
//   which ones are pending, approved, rejected, etc.
//
// SORT: Most recent requests first (newest at the top)
// ============================================================
const getMyBorrowRequests = asyncHandler(async (req, res, next) => {
  const requests = await BorrowRequest.find({ borrower: req.user._id })
    .populate(POPULATE_OPTIONS)
    .sort({ createdAt: -1 }); // -1 = descending (newest first)

  res.status(200).json({
    success: true,
    count: requests.length,
    data: requests,
  });
});

// ============================================================
// @route   GET /api/requests/received
// @desc    Get all requests RECEIVED for items the user owns
// @access  Private
// ============================================================
//
// USE CASE: "Show me who wants to borrow my stuff"
//   The owner sees all incoming requests and can approve/reject them.
//
// WHY QUERY BY owner FIELD?
//   We stored the owner's ID directly on the BorrowRequest model,
//   so we can query this with a single indexed field lookup —
//   no need to first find all items, then find requests for those items.
//   This is much faster, especially with thousands of items.
// ============================================================
const getRequestsForMyItems = asyncHandler(async (req, res, next) => {
  const requests = await BorrowRequest.find({ owner: req.user._id })
    .populate(POPULATE_OPTIONS)
    .sort({ createdAt: -1 });

  res.status(200).json({
    success: true,
    count: requests.length,
    data: requests,
  });
});

// ============================================================
// @route   PUT /api/requests/:id/approve
// @desc    Owner approves a pending borrow request
// @access  Private (item owner only)
// ============================================================
//
// STATE TRANSITION: pending → approved
//
// SIDE EFFECTS:
//   When a request is approved, the item's availability is set
//   to false. This prevents other users from requesting it while
//   it's being borrowed. Only ONE person can have the item at a time.
//
// SECURITY:
//   Only the item owner can approve. We verify this by comparing
//   the request's owner field with the logged-in user's ID.
//
// WHY CHECK STATUS === "pending"?
//   You can only approve a request that's currently pending.
//   Approving an already-approved, rejected, or returned request
//   makes no sense and could cause data inconsistencies.
// ============================================================
const approveRequest = asyncHandler(async (req, res, next) => {
  const request = await BorrowRequest.findById(req.params.id);

  if (!request) {
    return next(new ErrorResponse("Borrow request not found", 404));
  }

  // --- OWNERSHIP CHECK: Only the item owner can approve ---
  if (request.owner.toString() !== req.user._id.toString()) {
    return next(
      new ErrorResponse("Only the item owner can approve requests", 403)
    );
  }

  // --- STATUS CHECK: Can only approve pending requests ---
  if (request.status !== "pending") {
    return next(
      new ErrorResponse(
        `Cannot approve a request that is already "${request.status}"`,
        400
      )
    );
  }

  // --- Update request status ---
  request.status = "approved";
  await request.save();

  // --- Update item availability ---
  // The item is now "checked out" — no one else can borrow it
  await Item.findByIdAndUpdate(request.item, { availability: false });

  // Return the fully populated request
  const populatedRequest = await BorrowRequest.findById(request._id)
    .populate(POPULATE_OPTIONS);

  res.status(200).json({
    success: true,
    message: "Request approved — item is now marked as unavailable",
    data: populatedRequest,
  });
});

// ============================================================
// @route   PUT /api/requests/:id/reject
// @desc    Owner rejects a pending borrow request
// @access  Private (item owner only)
// ============================================================
//
// STATE TRANSITION: pending → rejected
//
// NO SIDE EFFECTS:
//   Rejecting a request does NOT change item availability because
//   the item was never lent out. It stays available for others.
//
// WHY ALLOW REJECTION?
//   The owner might reject because:
//     - They don't trust the borrower
//     - The dates don't work for them
//     - They changed their mind about lending
//   This is a normal part of the sharing workflow.
// ============================================================
const rejectRequest = asyncHandler(async (req, res, next) => {
  const request = await BorrowRequest.findById(req.params.id);

  if (!request) {
    return next(new ErrorResponse("Borrow request not found", 404));
  }

  // --- OWNERSHIP CHECK ---
  if (request.owner.toString() !== req.user._id.toString()) {
    return next(
      new ErrorResponse("Only the item owner can reject requests", 403)
    );
  }

  // --- STATUS CHECK ---
  if (request.status !== "pending") {
    return next(
      new ErrorResponse(
        `Cannot reject a request that is already "${request.status}"`,
        400
      )
    );
  }

  request.status = "rejected";
  await request.save();

  const populatedRequest = await BorrowRequest.findById(request._id)
    .populate(POPULATE_OPTIONS);

  res.status(200).json({
    success: true,
    message: "Request rejected",
    data: populatedRequest,
  });
});

// ============================================================
// @route   PUT /api/requests/:id/cancel
// @desc    Borrower cancels their own pending request
// @access  Private (borrower only)
// ============================================================
//
// STATE TRANSITION: pending → cancelled
//
// SECURITY:
//   Only the BORROWER (the person who made the request) can cancel.
//   The owner cannot cancel — they should reject instead.
//   This separation of concerns keeps the workflow clear.
//
// WHY ONLY PENDING?
//   If the request was already approved (item is with the borrower),
//   cancelling wouldn't make sense — they need to return the item
//   instead. The owner should use "mark returned" for that.
// ============================================================
const cancelRequest = asyncHandler(async (req, res, next) => {
  const request = await BorrowRequest.findById(req.params.id);

  if (!request) {
    return next(new ErrorResponse("Borrow request not found", 404));
  }

  // --- BORROWER CHECK: Only the person who made the request can cancel ---
  if (request.borrower.toString() !== req.user._id.toString()) {
    return next(
      new ErrorResponse("Only the borrower can cancel their own request", 403)
    );
  }

  // --- STATUS CHECK ---
  if (request.status !== "pending") {
    return next(
      new ErrorResponse(
        `Cannot cancel a request that is already "${request.status}"`,
        400
      )
    );
  }

  request.status = "cancelled";
  await request.save();

  const populatedRequest = await BorrowRequest.findById(request._id)
    .populate(POPULATE_OPTIONS);

  res.status(200).json({
    success: true,
    message: "Request cancelled",
    data: populatedRequest,
  });
});

// ============================================================
// @route   PUT /api/requests/:id/return
// @desc    Owner marks an approved request as returned
// @access  Private (item owner only)
// ============================================================
//
// STATE TRANSITION: approved → returned
//
// SIDE EFFECTS:
//   When the item is returned, its availability flips back to true.
//   This allows other users to request it again.
//
// WHY ONLY THE OWNER?
//   The owner physically receives the item back, so they should
//   confirm the return. If the borrower could mark it returned,
//   they could do so without actually returning the item.
//
// WHY ONLY FROM "approved"?
//   You can only return an item that was actually lent out.
//   A pending, rejected, or cancelled request was never fulfilled,
//   so there's nothing to "return."
// ============================================================
const markReturned = asyncHandler(async (req, res, next) => {
  const request = await BorrowRequest.findById(req.params.id);

  if (!request) {
    return next(new ErrorResponse("Borrow request not found", 404));
  }

  // --- OWNERSHIP CHECK ---
  if (request.owner.toString() !== req.user._id.toString()) {
    return next(
      new ErrorResponse("Only the item owner can mark items as returned", 403)
    );
  }

  // --- STATUS CHECK: Can only return items that are currently approved ---
  if (request.status !== "approved") {
    return next(
      new ErrorResponse(
        `Cannot mark as returned — request status is "${request.status}", expected "approved"`,
        400
      )
    );
  }

  request.status = "returned";
  await request.save();

  // --- Restore item availability ---
  // The item is back with the owner, so others can now request it
  await Item.findByIdAndUpdate(request.item, { availability: true });

  const populatedRequest = await BorrowRequest.findById(request._id)
    .populate(POPULATE_OPTIONS);

  res.status(200).json({
    success: true,
    message: "Item marked as returned — item is now available again",
    data: populatedRequest,
  });
});

module.exports = {
  createBorrowRequest,
  getMyBorrowRequests,
  getRequestsForMyItems,
  approveRequest,
  rejectRequest,
  cancelRequest,
  markReturned,
};
