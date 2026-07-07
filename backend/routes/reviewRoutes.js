/**
 * routes/reviewRoutes.js
 */

const express = require("express");
const router = express.Router();
const {
  getHotelReviews,
  createReview,
  getAllReviews,
  deleteReview,
} = require("../controllers/reviewController");
const { protect } = require("../middleware/authMiddleware");
const { adminOnly } = require("../middleware/adminMiddleware");

router.get("/hotel/:hotelId", getHotelReviews);
router.post("/", protect, createReview);
router.get("/", protect, adminOnly, getAllReviews);
router.delete("/:id", protect, deleteReview);

module.exports = router;
