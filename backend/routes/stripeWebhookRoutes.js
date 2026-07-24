const express = require("express");
const router = express.Router();
const { handleStripeWebhook } = require("../controllers/paymentController");

// Mount the webhook with raw body parser for signature verification
router.post("/", express.raw({ type: "application/json" }), handleStripeWebhook);

module.exports = router;
