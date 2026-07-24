/**
 * controllers/paymentController.js
 * Handles payment processing HTTP requests.
 */

const Payment = require("../models/Payment");
const Booking = require("../models/Booking");
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY || "sk_test_mock_key");
const { sendBookingConfirmation } = require("../services/emailService");

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

const createStripeSession = async (req, res, next) => {
  try {
    const { booking_id } = req.body;
    if (!booking_id) {
      return res.status(400).json({ success: false, message: "booking_id is required." });
    }

    const booking = await Booking.findById(booking_id);
    if (!booking) {
      return res.status(404).json({ success: false, message: "Booking not found." });
    }

    if (booking.user_id !== req.user.id) {
      return res.status(403).json({ success: false, message: "Access denied." });
    }

    if (booking.booking_status !== "pending") {
      return res.status(400).json({ success: false, message: "Only pending bookings can be paid." });
    }

    const frontendUrl = process.env.FRONTEND_URL;
    if (!frontendUrl && process.env.NODE_ENV === "production") {
      return res.status(500).json({ success: false, message: "Server misconfiguration: FRONTEND_URL is required in production." });
    }
    const safeFrontendUrl = frontendUrl || "http://localhost:5173";

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "lkr",
            product_data: {
              name: `Booking for ${booking.hotel_name} - ${booking.room_type} Room`,
              description: `Check-in: ${new Date(booking.check_in).toLocaleDateString()} | Check-out: ${new Date(booking.check_out).toLocaleDateString()}`,
            },
            unit_amount: Math.round(booking.total_price * 100), // Stripe expects amounts in cents/smallest currency unit
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `${safeFrontendUrl}/payment-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${safeFrontendUrl}/bookings/${booking.id}`,
      metadata: {
        booking_id: booking.id,
      },
    });

    return res.status(200).json({
      success: true,
      data: { url: session.url },
    });
  } catch (error) {
    next(error);
  }
};

const confirmStripePayment = async (req, res, next) => {
  try {
    const { session_id } = req.body;
    if (!session_id) {
      return res.status(400).json({ success: false, message: "session_id is required." });
    }

    const session = await stripe.checkout.sessions.retrieve(session_id);
    await finalizeStripePayment(session);

    return res.status(200).json({
      success: true,
      message: "Payment confirmed.",
    });
  } catch (error) {
    if (error.statusCode === 409 && error.message.includes("already been paid")) {
      return res.status(200).json({
        success: true,
        message: "Payment was already confirmed.",
      });
    }
    next(error);
  }
};

const finalizeStripePayment = async (session) => {
  if (session.payment_status !== "paid") {
    throw new Error("Payment not completed.");
  }

  const bookingId = Number(session.metadata.booking_id);
  const booking = await Booking.findById(bookingId);

  if (!booking) {
    throw new Error("Booking not found for session.");
  }

  if (session.currency.toLowerCase() !== "lkr") {
    throw new Error("Invalid currency.");
  }

  if (session.amount_total !== Math.round(booking.total_price * 100)) {
    throw new Error("Amount mismatch.");
  }

  try {
    const paymentId = await Payment.processAtomic({
      bookingId,
      paymentMethod: "card",
      actorUserId: booking.user_id, // Unauthenticated context uses booking owner
      isAdmin: false,
      transactionReference: session.payment_intent,
    });

    const [updatedBooking, User] = await Promise.all([
      Booking.findById(bookingId),
      require("../models/User")
    ]);
    const user = await User.findUserById(booking.user_id);

    // Send confirmation email and wait for completion/failure safely
    if (user) {
      try {
        await sendBookingConfirmation(user.email, user.first_name, updatedBooking);
      } catch (emailErr) {
        console.error("Email confirmation failed after successful payment:", emailErr);
      }
    }
  } catch (err) {
    if (err.code === "ER_DUP_ENTRY" || (err.statusCode === 409 && err.message.includes("already been paid"))) {
      const existingPayment = await Payment.findByBooking(bookingId);
      if (existingPayment && existingPayment.transaction_reference === session.payment_intent) {
        // Idempotent: Payment was already finalized successfully for THIS exact intent
        return;
      }
      throw new Error("Payment conflict: booking already paid by a different transaction or reference mismatch.");
    }
    throw err;
  }
};

const handleStripeWebhook = async (req, res, next) => {
  const sig = req.headers["stripe-signature"];
  const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;
  let event;

  try {
    // req.body is the raw Buffer because of express.raw in app.js
    event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
  } catch (err) {
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  try {
    if (event.type === "checkout.session.completed") {
      const session = event.data.object;
      await finalizeStripePayment(session);
    }
    // Return a safe 200 response to acknowledge receipt
    res.status(200).json({ received: true });
  } catch (err) {
    console.error("Webhook processing error:", err.message);
    // Returning 200 avoids Stripe retrying a broken/tampered session forever
    res.status(200).json({ received: true, warning: "Processed with error" });
  }
};

module.exports = {
  getAllPayments,
  getMyPayments,
  getPaymentById,
  processPayment,
  refundPayment,
  createStripeSession,
  confirmStripePayment,
  handleStripeWebhook,
};
