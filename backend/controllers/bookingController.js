const Booking = require("../models/Booking");
const Payment = require("../models/Payment");
const { validateBookingInput } = require("../utils/validators");

const VALID_PAYMENT_METHODS = ["card", "cash", "online"];
const VALID_BOOKING_STATUSES = ["pending", "confirmed", "cancelled", "completed"];

const parseId = (value) => {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
};

const createBooking = async (req, res, next) => {
  try {
    const { valid, errors } = validateBookingInput(req.body);
    if (!valid) {
      return res.status(400).json({ success: false, message: "Validation failed.", errors });
    }

    const bookingId = await Booking.createWithAvailability({
      user_id: req.user.id,
      room_id: Number(req.body.room_id),
      check_in: req.body.check_in,
      check_out: req.body.check_out,
    });
    const booking = await Booking.findById(bookingId);

    return res.status(201).json({
      success: true,
      message: "Booking created and is awaiting payment.",
      data: { booking },
    });
  } catch (error) {
    next(error);
  }
};

const checkoutBooking = async (req, res, next) => {
  try {
    const { valid, errors } = validateBookingInput(req.body);
    if (!valid) {
      return res.status(400).json({ success: false, message: "Validation failed.", errors });
    }

    const { payment_method } = req.body;
    if (!VALID_PAYMENT_METHODS.includes(payment_method)) {
      return res.status(400).json({
        success: false,
        message: "payment_method must be one of: card, cash, online.",
      });
    }

    const result = await Booking.checkoutDemo({
      user_id: req.user.id,
      room_id: Number(req.body.room_id),
      check_in: req.body.check_in,
      check_out: req.body.check_out,
      payment_method,
    });
    const [booking, payment] = await Promise.all([
      Booking.findById(result.bookingId),
      Payment.findById(result.paymentId),
    ]);

    return res.status(201).json({
      success: true,
      message: "Demo booking confirmed. No real payment was processed.",
      data: { booking, payment, payment_mode: "demo" },
    });
  } catch (error) {
    next(error);
  }
};

const getMyBookings = async (req, res, next) => {
  try {
    const bookings = await Booking.findByUserId(req.user.id);
    return res.status(200).json({
      success: true,
      message: bookings.length > 0 ? "Bookings fetched successfully." : "No bookings found.",
      data: { count: bookings.length, bookings },
    });
  } catch (error) {
    next(error);
  }
};

const getBookingById = async (req, res, next) => {
  try {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ success: false, message: "Invalid booking ID." });

    const booking = await Booking.findById(id);
    if (!booking) return res.status(404).json({ success: false, message: "Booking not found." });
    if (req.user.role !== "admin" && booking.user_id !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: "Access denied. You do not own this booking.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Booking fetched successfully.",
      data: { booking },
    });
  } catch (error) {
    next(error);
  }
};

const cancelBooking = async (req, res, next) => {
  try {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ success: false, message: "Invalid booking ID." });

    const result = await Booking.cancelAtomic(id, {
      actorUserId: req.user.id,
      isAdmin: req.user.role === "admin",
    });
    const booking = await Booking.findById(id);

    return res.status(200).json({
      success: true,
      message:
        result.refundedPayments > 0
          ? "Booking cancelled and demo payment marked as refunded."
          : "Booking cancelled successfully.",
      data: { booking, refunded_payments: result.refundedPayments },
    });
  } catch (error) {
    next(error);
  }
};

const getAllBookings = async (req, res, next) => {
  try {
    const { user_id, room_id, booking_status, search } = req.query;
    if (booking_status && !VALID_BOOKING_STATUSES.includes(booking_status)) {
      return res.status(400).json({ success: false, message: "Invalid booking_status filter." });
    }
    if (user_id && !parseId(user_id)) {
      return res.status(400).json({ success: false, message: "Invalid user_id filter." });
    }
    if (room_id && !parseId(room_id)) {
      return res.status(400).json({ success: false, message: "Invalid room_id filter." });
    }

    const bookings = await Booking.findAll({ user_id, room_id, booking_status, search });
    return res.status(200).json({
      success: true,
      message: bookings.length > 0 ? "Bookings fetched successfully." : "No bookings found.",
      data: { count: bookings.length, bookings },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createBooking,
  checkoutBooking,
  getMyBookings,
  getBookingById,
  cancelBooking,
  getAllBookings,
};
