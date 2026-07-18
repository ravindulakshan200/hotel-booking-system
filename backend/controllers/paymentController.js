/**
 * controllers/paymentController.js
 * Handles payment processing HTTP requests.
 */

const Payment = require("../models/Payment");

const VALID_METHODS = ["card", "cash", "online"];
const VALID_STATUSES = ["pending", "completed", "refunded", "failed"];

const processPayment = async (req, res, next) => {
  try {
    const { booking_id, payment_method } = req.body;

    if (!booking_id || !payment_method) {
      return res.status(400).json({
        success: false,
        message: "booking_id and payment_method are required.",
      });
    }

    if (!VALID_METHODS.includes(payment_method)) {
      return res.status(400).json({
        success: false,
        message: "payment_method must be one of: card, cash, online.",
      });
    }

    const parsedBookingId = Number(booking_id);
    if (!Number.isInteger(parsedBookingId) || parsedBookingId < 1) {
      return res.status(400).json({ success: false, message: "Invalid booking_id." });
    }

    const paymentId = await Payment.processAtomic({
      bookingId: parsedBookingId,
      paymentMethod: payment_method,
      actorUserId: req.user.id,
      isAdmin: req.user.role === "admin",
    });

    const payment = await Payment.findById(paymentId);

    return res.status(201).json({
      success: true,
      message: "Demo payment recorded successfully. No real money was processed.",
      data: { payment, payment_mode: "demo" },
    });
  } catch (error) {
    if (error.code === "ER_DUP_ENTRY") {
      return res.status(409).json({
        success: false,
        message: "Duplicate transaction reference.",
      });
    }
    next(error);
  }
};

const getAllPayments = async (req, res, next) => {
  try {
    const { payment_status } = req.query;
    if (payment_status && !VALID_STATUSES.includes(payment_status)) {
      return res.status(400).json({ success: false, message: "Invalid payment_status filter." });
    }
    const payments = await Payment.findAll({ payment_status });

    return res.status(200).json({
      success: true,
      message: "Payments fetched successfully.",
      data: { count: payments.length, payments },
    });
  } catch (error) {
    next(error);
  }
};

const getMyPayments = async (req, res, next) => {
  try {
    const payments = await Payment.findByUser(req.user.id);

    return res.status(200).json({
      success: true,
      message: "Payment history fetched successfully.",
      data: { count: payments.length, payments },
    });
  } catch (error) {
    next(error);
  }
};

const getPaymentById = async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id) || id < 1) {
      return res.status(400).json({ success: false, message: "Invalid payment ID." });
    }

    const payment = await Payment.findById(id);
    if (!payment) {
      return res.status(404).json({ success: false, message: "Payment not found." });
    }

    if (req.user.role !== "admin" && payment.user_id !== req.user.id) {
      return res.status(403).json({ success: false, message: "Access denied." });
    }

    return res.status(200).json({
      success: true,
      message: "Payment fetched successfully.",
      data: { payment },
    });
  } catch (error) {
    next(error);
  }
};

const refundPayment = async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id) || id < 1) {
      return res.status(400).json({ success: false, message: "Invalid payment ID." });
    }

    await Payment.refundAtomic(id);

    const updatedPayment = await Payment.findById(id);

    return res.status(200).json({
      success: true,
      message: "Demo payment marked as refunded successfully.",
      data: { payment: updatedPayment },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAllPayments,
  getMyPayments,
  getPaymentById,
  processPayment,
  refundPayment,
};
