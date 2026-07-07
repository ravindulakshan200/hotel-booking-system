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
} = require("../controllers/paymentController");
const { protect } = require("../middleware/authMiddleware");
const { adminOnly } = require("../middleware/adminMiddleware");

router.use(protect);

router.get("/my", getMyPayments);
router.get("/", adminOnly, getAllPayments);
router.get("/:id", getPaymentById);
router.post("/", processPayment);
router.post("/:id/refund", adminOnly, refundPayment);

module.exports = router;
