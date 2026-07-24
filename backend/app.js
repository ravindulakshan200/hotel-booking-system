const express = require("express");
const cors = require("cors");
const helmet = require("helmet");

const { getAllowedOrigins, getTrustProxy } = require("./config/env");
const HttpError = require("./utils/httpError");
const errorHandler = require("./middleware/errorHandler");
const notFound = require("./middleware/notFound");

const healthRoutes = require("./routes/healthRoutes");
const authRoutes = require("./routes/authRoutes");
const hotelRoutes = require("./routes/hotelRoutes");
const roomRoutes = require("./routes/roomRoutes");
const bookingRoutes = require("./routes/bookingRoutes");
const paymentRoutes = require("./routes/paymentRoutes");
const adminRoutes = require("./routes/adminRoutes");
const reviewRoutes = require("./routes/reviewRoutes");
const favoriteRoutes = require("./routes/favoriteRoutes");

const createApp = () => {
  const app = express();
  const allowedOrigins = getAllowedOrigins();

  app.disable("x-powered-by");

  const trustProxy = getTrustProxy();
  if (trustProxy !== false) {
    app.set("trust proxy", trustProxy);
  }

  app.use(helmet());
  app.use(
    cors({
      origin(origin, callback) {
        if (!origin || allowedOrigins.includes(origin)) {
          return callback(null, true);
        }
        return callback(new HttpError(403, "Origin is not allowed by CORS."));
      },
      credentials: true,
      methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
      allowedHeaders: ["Content-Type", "Authorization"],
    })
  );

  // Stripe webhook must be parsed as raw body before express.json() intercepts it
  const stripeWebhookRoutes = require("./routes/stripeWebhookRoutes");
  app.use("/api/v1/payments/stripe/webhook", stripeWebhookRoutes);

  app.use(express.json({ limit: "100kb" }));
  app.use(express.urlencoded({ extended: false, limit: "100kb" }));

  app.use("/api/v1/health", healthRoutes);
  app.use("/api/v1/auth", authRoutes);
  app.use("/api/v1/hotels", hotelRoutes);
  app.use("/api/v1/rooms", roomRoutes);
  app.use("/api/v1/bookings", bookingRoutes);
  app.use("/api/v1/payments", paymentRoutes);
  app.use("/api/v1/admin", adminRoutes);
  app.use("/api/v1/reviews", reviewRoutes);
  app.use("/api/v1/favorites", favoriteRoutes);

  app.use(notFound);
  app.use(errorHandler);

  return app;
};

module.exports = createApp;
