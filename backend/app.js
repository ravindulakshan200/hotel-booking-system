const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const cookieParser = require("cookie-parser");

const { getAllowedOrigins, getTrustProxy } = require("./config/env");
const HttpError = require("./utils/httpError");
const errorHandler = require("./middleware/errorHandler");
const notFound = require("./middleware/notFound");

const healthRoutes        = require('./routes/healthRoutes');
const authRoutes          = require('./routes/authRoutes');
const hotelRoutes         = require('./routes/hotelRoutes');
const roomRoutes          = require('./routes/roomRoutes');
const bookingRoutes       = require('./routes/bookingRoutes');
const paymentRoutes       = require('./routes/paymentRoutes');
const adminRoutes         = require('./routes/adminRoutes');
const reviewRoutes        = require('./routes/reviewRoutes');
const favoriteRoutes      = require('./routes/favoriteRoutes');
const promoRoutes         = require('./routes/promoRoutes');
const notificationRoutes  = require('./routes/notificationRoutes');
const availabilityRoutes  = require('./routes/availabilityRoutes');
const supportRoutes       = require('./routes/supportRoutes');
const hotelImageRoutes    = require('./routes/hotelImageRoutes');
const invoiceRoutes       = require('./routes/invoiceRoutes');

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
  const stripeWebhookRoutes = require('./routes/stripeWebhookRoutes');
  app.use('/api/v1/payments/stripe/webhook', stripeWebhookRoutes);

  app.use(express.json({ limit: '100kb' }));
  app.use(express.urlencoded({ extended: false, limit: '100kb' }));
  app.use(cookieParser());

  // ── Static file serving for local image uploads ──────────────────────────────
  // NOTE: Local uploads are NOT persistent on serverless deployments (Vercel etc.).
  // Configure STORAGE_ADAPTER=cloudinary or STORAGE_ADAPTER=s3 for production.
  const path = require('path');
  const fs   = require('fs');
  const storageType = (process.env.STORAGE_ADAPTER || 'local').toLowerCase();
  const isVercel = Boolean(process.env.VERCEL);

  if (storageType === 'local' && !isVercel) {
    const uploadsDir = path.resolve(__dirname, 'uploads');
    if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
    app.use('/uploads', express.static(uploadsDir));
  }

  app.use('/api/v1/health',         healthRoutes);
  app.use('/api/v1/auth',           authRoutes);
  app.use('/api/v1/hotels',         hotelRoutes);
  app.use('/api/v1/rooms',          roomRoutes);
  app.use('/api/v1/bookings',       bookingRoutes);
  app.use('/api/v1/payments',       paymentRoutes);
  app.use('/api/v1/admin',          adminRoutes);
  app.use('/api/v1/reviews',        reviewRoutes);
  app.use('/api/v1/favorites',      favoriteRoutes);
  app.use('/api/v1/promos',         promoRoutes);
  app.use('/api/v1/notifications',  notificationRoutes);
  app.use('/api/v1/rooms',          availabilityRoutes);
  app.use('/api/v1/support',        supportRoutes);
  app.use('/api/v1/hotels',         hotelImageRoutes);
  app.use('/api/v1/bookings',       invoiceRoutes);

  app.use(notFound);
  app.use(errorHandler);

  // Start reminder worker (respects REMINDER_WORKER_ENABLED and NODE_ENV guard)
  if (process.env.NODE_ENV !== 'test') {
    const reminderWorker = require('./services/reminderWorker');
    reminderWorker.start();
  }

  return app;
};

module.exports = createApp;
