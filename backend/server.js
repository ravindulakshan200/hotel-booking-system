const dotenv = require("dotenv");

dotenv.config();

const createApp = require("./app");
const pool = require("./config/db");
const { validateEnvironment } = require("./config/env");

const verifyDBConnection = async () => {
  try {
    const connection = await pool.getConnection();
    connection.release();
    console.log(`MySQL connected: ${process.env.DB_HOST || "localhost"}/${process.env.DB_NAME || "hotel_booking_db"}`);
    return true;
  } catch (error) {
    throw new Error("MySQL is currently unavailable");
  }
};

const startServer = async () => {
  validateEnvironment();
  await verifyDBConnection();

  const app = createApp();
  const port = Number(process.env.PORT || 5000);
  const server = app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
  });

  const emailWorker = require("./services/emailWorker");
  emailWorker.start();

  const Booking = require("./models/Booking");
  const cleanupInterval = setInterval(() => {
    Booking.expirePendingBookings().catch(err => console.error("Booking cleanup error:", err));
  }, 60000);

  const originalClose = server.close.bind(server);
  server.close = (callback) => {
    clearInterval(cleanupInterval);
    emailWorker.stop();
    return originalClose(callback);
  };

  let isShuttingDown = false;

  const shutdown = (signal) => {
    if (isShuttingDown) return;
    isShuttingDown = true;
    console.log(`${signal} received. Closing server...`);
    server.close(async () => {
      await pool.end();
    });
  };

  process.once("SIGINT", () => shutdown("SIGINT"));
  process.once("SIGTERM", () => shutdown("SIGTERM"));

  return server;
};

module.exports = { startServer, verifyDBConnection };
