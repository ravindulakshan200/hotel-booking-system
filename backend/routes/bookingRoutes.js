/**
 * routes/bookingRoutes.js
 */

const express = require("express");
const router = express.Router();

const {
  createBooking,
  checkoutBooking,
  getMyBookings,
  getBookingById,
  cancelBooking,
  getAllBookings
} = require("../controllers/bookingController");

const { protect } = require("../middleware/authMiddleware");
const { adminOnly } = require("../middleware/adminMiddleware");

// All booking routes require authentication
router.use(protect);

router.route("/")
  .post(createBooking)
  .get(adminOnly, getAllBookings);

router.post("/checkout", checkoutBooking);
router.get("/my-bookings", getMyBookings);

router.route("/:id")
  .get(getBookingById);

router.put("/:id/cancel", cancelBooking);

module.exports = router;
