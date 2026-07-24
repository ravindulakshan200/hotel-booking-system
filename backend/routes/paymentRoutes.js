/**
 * routes/paymentRoutes.js
 * Payment routes mounted at /api/v1/payments
 */

const express = require("express");
const router = express.Router();
const {
  getAllPayments,
  getMyPayments,
  getPaymentById,
  processPayment,
  refundPayment,
  createStripeSession,
  confirmStripePayment,
  getConfig,
} = require("../controllers/paymentController");
const { protect } = require("../middleware/authMiddleware");
const { adminOnly } = require("../middleware/adminMiddleware");

router.use(protect);

router.get("/my", getMyPayments);
router.get("/config", getConfig);
router.get("/", adminOnly, getAllPayments);
router.get("/:id", getPaymentById);
router.post("/", processPayment);
router.post("/:id/refund", adminOnly, refundPayment);
router.post("/create-checkout-session", createStripeSession);
router.post("/confirm-session", confirmStripePayment);

module.exports = router;
