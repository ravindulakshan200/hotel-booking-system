const { randomUUID } = require("crypto");
const EmailOutbox = require("../models/EmailOutbox");
const emailService = require("./emailService");

class EmailWorker {
  constructor() {
    this.workerId = `worker-${randomUUID()}`;
    this.intervalId = null;
    this.isRunning = false;
    this.isShuttingDown = false;
    this.intervalMs = parseInt(process.env.EMAIL_WORKER_INTERVAL_MS, 10) || 5000;
    this.batchSize = parseInt(process.env.EMAIL_BATCH_SIZE, 10) || 10;
  }

  start() {
    if (this.isRunning || process.env.NODE_ENV === "test" || process.env.EMAIL_WORKER_ENABLED !== "true") {
      if (process.env.NODE_ENV !== "test") {
        console.log(`[EmailWorker] Worker not started. (ENABLED=${process.env.EMAIL_WORKER_ENABLED})`);
      }
      return;
    }

    console.log(`[EmailWorker] Starting worker ${this.workerId} with interval ${this.intervalMs}ms`);
    this.isRunning = true;
    this.isShuttingDown = false;

    // Start the loop
    this.intervalId = setInterval(() => this.processBatch(), this.intervalMs);
    this.intervalId.unref();

    // Initial clean up of stale locks
    EmailOutbox.releaseStaleLocks(5).catch(err => console.error("[EmailWorker] Stale lock release error:", err.message));
  }

  async processBatch() {
    if (this.isShuttingDown) return;

    try {
      const events = await EmailOutbox.claimPendingBatch(this.workerId, this.batchSize);
      if (events.length === 0) return;

      const { decryptPayload } = require("../utils/encryption");
      const pool = require("../config/db");

      for (const event of events) {
        if (this.isShuttingDown) break;
        await this.processEvent(event);
      }
    } catch (error) {
      console.error("[EmailWorker] Batch processing error:", error.message);
    }
  }

  async processImmediate(eventId) {
    try {
      const event = await EmailOutbox.claimSingleEvent(eventId, this.workerId);
      if (!event) return false;
      return await this.processEvent(event);
    } catch (error) {
      console.error("[EmailWorker] Immediate processing error:", error.message);
      return false;
    }
  }

  async processEvent(event) {
    try {
      const { decryptPayload } = require("../utils/encryption");
      const pool = require("../config/db");
        if (event.payload_expires_at && new Date(event.payload_expires_at) < new Date()) {
           await this.handleFailure(event, "Event payload expired before delivery.", true);
           return false;
        }

        let decryptedPayload = {};
        try {
          let parsedPayload = event.payload;
          while (typeof parsedPayload === 'string') {
            try {
              const next = JSON.parse(parsedPayload);
              if (typeof next === 'string' && next === parsedPayload) break;
              parsedPayload = next;
            } catch(e) { break; }
          }
          decryptedPayload = decryptPayload(parsedPayload, event.event_key);
        } catch (decErr) {
          await this.handleFailure(event, `Decryption failed: ${decErr.message}`, true);
          return false;
        }

        if (event.recipient_user_id) {
          const [users] = await pool.query("SELECT email, first_name FROM users WHERE id = ?", [event.recipient_user_id]);
          if (users.length > 0) {
            event.recipient_email = users[0].email;
            if (decryptedPayload) {
               decryptedPayload.userName = decryptedPayload.userName || users[0].first_name;
            }
          }
        }

        const processedEvent = {
          ...event,
          payload: decryptedPayload
        };

        const success = await emailService.processEmailEvent(processedEvent);
        if (success) {
          await EmailOutbox.markSent(event.id);
          return true;
        } else {
          await this.handleFailure(event, "Provider returned false");
          return false;
        }
      } catch (error) {
        await this.handleFailure(event, error.message);
        return false;
      }
  }

  async handleFailure(event, errorMessage, forceDeadLetter = false) {
    const newAttemptCount = event.attempts + 1;
    if (forceDeadLetter || newAttemptCount >= event.max_attempts) {
      await EmailOutbox.markDeadLetter(event.id, errorMessage);
      console.log(`[EmailWorker] Event ${event.id} marked as dead_letter.`);
    } else {
      await EmailOutbox.markRetry(event.id, newAttemptCount, errorMessage);
    }
  }

  stop() {
    if (!this.isRunning) return;
    
    console.log(`[EmailWorker] Shutting down worker ${this.workerId}...`);
    this.isShuttingDown = true;
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.isRunning = false;
  }
}

const worker = new EmailWorker();

// Graceful shutdown handling
process.on("SIGINT", () => worker.stop());
process.on("SIGTERM", () => worker.stop());

module.exports = worker;
