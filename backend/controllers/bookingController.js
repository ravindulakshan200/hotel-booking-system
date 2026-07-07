/**
 * controllers/bookingController.js
 *
 * Handles all Booking HTTP requests.
 */

const Booking = require("../models/Booking");
const Room = require("../models/Room");

const createBooking = async (req, res, next) => {
  try {
    const { room_id, check_in, check_out } = req.body;
    const user_id = req.user.id;

    if (!room_id || !check_in || !check_out) {
      return res.status(400).json({ success: false, message: "room_id, check_in, and check_out are required." });
    }

    const checkInDate = new Date(check_in);
    const checkOutDate = new Date(check_out);

    if (isNaN(checkInDate) || isNaN(checkOutDate)) {
      return res.status(400).json({ success: false, message: "Invalid date format." });
    }

    if (checkOutDate <= checkInDate) {
      return res.status(400).json({ success: false, message: "check_out must be after check_in." });
    }

    // Validate room exists
    const room = await Room.findById(room_id);
    if (!room) {
      return res.status(404).json({ success: false, message: "Room not found." });
    }

    // Validate room availability
    const isAvailable = await Booking.isRoomAvailable(room_id, check_in, check_out);
    if (!isAvailable) {
      return res.status(409).json({ success: false, message: "Room is not available for the selected dates." });
    }

    // Calculate total price
    const timeDifference = checkOutDate.getTime() - checkInDate.getTime();
    const days = Math.ceil(timeDifference / (1000 * 3600 * 24));
    const total_price = (room.price_per_night * days).toFixed(2);

    const newBookingId = await Booking.create({
      user_id,
      room_id,
      check_in,
      check_out,
      total_price,
      booking_status: 'pending'
    });

    const newBooking = await Booking.findById(newBookingId);

    return res.status(201).json({
      success: true,
      message: "Booking created successfully.",
      data: { booking: newBooking }
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
      data: { count: bookings.length, bookings }
    });
  } catch (error) {
    next(error);
  }
};

const getBookingById = async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id) || id < 1) {
      return res.status(400).json({ success: false, message: "Invalid booking ID." });
    }

    const booking = await Booking.findById(id);
    if (!booking) {
      return res.status(404).json({ success: false, message: "Booking not found." });
    }

    if (req.user.role !== 'admin' && booking.user_id !== req.user.id) {
      return res.status(403).json({ success: false, message: "Access denied. You do not own this booking." });
    }

    return res.status(200).json({
      success: true,
      message: "Booking fetched successfully.",
      data: { booking }
    });
  } catch (error) {
    next(error);
  }
};

const cancelBooking = async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id) || id < 1) {
      return res.status(400).json({ success: false, message: "Invalid booking ID." });
    }

    const booking = await Booking.findById(id);
    if (!booking) {
      return res.status(404).json({ success: false, message: "Booking not found." });
    }

    if (req.user.role !== 'admin' && booking.user_id !== req.user.id) {
      return res.status(403).json({ success: false, message: "Access denied. You do not own this booking." });
    }

    if (booking.booking_status === 'cancelled') {
      return res.status(400).json({ success: false, message: "Booking is already cancelled." });
    }

    if (booking.booking_status === 'completed') {
      return res.status(400).json({ success: false, message: "Cannot cancel a completed booking." });
    }

    await Booking.updateStatus(id, 'cancelled');
    const updatedBooking = await Booking.findById(id);

    return res.status(200).json({
      success: true,
      message: "Booking cancelled successfully.",
      data: { booking: updatedBooking }
    });
  } catch (error) {
    next(error);
  }
};

const getAllBookings = async (req, res, next) => {
  try {
    const { user_id, room_id, booking_status } = req.query;
    const bookings = await Booking.findAll({ user_id, room_id, booking_status });

    return res.status(200).json({
      success: true,
      message: bookings.length > 0 ? "Bookings fetched successfully." : "No bookings found.",
      data: { count: bookings.length, bookings }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createBooking,
  getMyBookings,
  getBookingById,
  cancelBooking,
  getAllBookings
};
