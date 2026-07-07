/**
 * server.js
 * Hotel Booking Management System — Express Entry Point
 *
 * Responsibilities:
 *   - Load environment variables
 *   - Configure global middleware (CORS, JSON parser)
 *   - Mount all versioned API routes under /api/v1/
 *   - Register error handling middleware (must be last)
 *   - Start HTTP server after verifying DB connectivity
 */

const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");

// Load .env before any other module reads process.env
dotenv.config();

// ─── Internal modules ────────────────────────────────────────────────────────
const pool = require("./config/db");
const errorHandler = require("./middleware/errorHandler");
const notFound = require("./middleware/notFound");

// ─── Route modules ────────────────────────────────────────────────────────────
const healthRoutes = require("./routes/healthRoutes");
const authRoutes = require("./routes/authRoutes");
const hotelRoutes = require("./routes/hotelRoutes");
const roomRoutes = require("./routes/roomRoutes");
const bookingRoutes = require("./routes/bookingRoutes");
const paymentRoutes = require("./routes/paymentRoutes");
const adminRoutes   = require("./routes/adminRoutes");
const reviewRoutes  = require("./routes/reviewRoutes");
const favoriteRoutes = require("./routes/favoriteRoutes");

// ─── App initialization ───────────────────────────────────────────────────────
const app = express();

// ─── Global Middleware ────────────────────────────────────────────────────────

app.use(
  cors({
    origin: process.env.CLIENT_URL || "http://localhost:3000",
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ─── API v1 Routes ────────────────────────────────────────────────────────────

app.use("/api/v1/health", healthRoutes);
app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/hotels", hotelRoutes);
app.use("/api/v1/rooms", roomRoutes);
app.use("/api/v1/bookings", bookingRoutes);
app.use("/api/v1/payments", paymentRoutes);
app.use("/api/v1/admin", adminRoutes);
app.use("/api/v1/reviews", reviewRoutes);
app.use("/api/v1/favorites", favoriteRoutes);

// ─── Error Handling (must be registered after all routes) ─────────────────────

app.use(notFound);       // 404 — catches undefined routes
app.use(errorHandler);   // Global error handler

// ─── Database Connectivity Check ──────────────────────────────────────────────

/**
 * Verify the MySQL pool can acquire a connection before accepting traffic.
 * Exits the process on failure so the container/process manager can restart.
 */
const verifyDBConnection = async () => {
  try {
    const connection = await pool.getConnection();
    console.log(
      `✅ MySQL connected — ${process.env.DB_HOST || "localhost"}/${process.env.DB_NAME || "hotel_booking_system"}`
    );
    connection.release();
    return true;
  } catch (error) {
    console.warn(
      `⚠️ MySQL connection unavailable — continuing to start the server. Details: ${error.message}`
    );
    return false;
  }
};

// ─── Server Startup ───────────────────────────────────────────────────────────

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    await verifyDBConnection();

    app.listen(PORT, () => {
      console.log(
        `🚀 Server running in ${process.env.NODE_ENV || "development"} mode on http://localhost:${PORT}`
      );
      console.log(`📡 API base URL: http://localhost:${PORT}/api/v1`);
    });
  } catch (error) {
    console.error("❌ Server startup failed:", error.message);
    process.exit(1);
  }
};

startServer();
