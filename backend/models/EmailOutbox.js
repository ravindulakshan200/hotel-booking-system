const pool = require("../config/db");
const { encryptPayload } = require("../utils/encryption");

const EmailOutbox = {
  enqueueEmailEvent: async (
    connectionOrPool,
    { eventKey, eventType, recipientUserId, recipientEmail, payload, expiresAt }
  ) => {
    // We allow passing a transaction connection, or the global pool
    const db = connectionOrPool || pool;
    
    const encryptedPayload = encryptPayload(payload, eventKey);

    // Using INSERT IGNORE so duplicate eventKeys simply do nothing and don't throw
    const [result] = await db.query(
      `INSERT IGNORE INTO email_outbox 
       (event_key, event_type, recipient_user_id, recipient_email, payload, payload_expires_at, max_attempts) 
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        eventKey,
        eventType,
        recipientUserId || null,
        recipientEmail || null,
        JSON.stringify(encryptedPayload),
        expiresAt || null,
        process.env.EMAIL_MAX_ATTEMPTS || 3
      ]
    );

    return result.insertId;
  },

  claimPendingBatch: async (workerId, batchSize = 10) => {
    // 1. Atomically update a batch of rows to 'processing'
    // TiDB supports UPDATE ... LIMIT
    const [updateResult] = await pool.query(
      `UPDATE email_outbox 
       SET status = 'processing', locked_at = NOW(), locked_by = ?
       WHERE status IN ('pending', 'failed') 
         AND next_attempt_at <= NOW()
       LIMIT ?`,
      [workerId, parseInt(batchSize, 10)]
    );

    if (updateResult.affectedRows === 0) {
      return [];
    }

    // 2. Fetch the claimed rows
    const [rows] = await pool.query(
      `SELECT * FROM email_outbox WHERE locked_by = ? AND status = 'processing'`,
      [workerId]
    );

    return rows;
  },

  claimSingleEvent: async (id, workerId) => {
    const [updateResult] = await pool.query(
      `UPDATE email_outbox
       SET status = 'processing', locked_at = NOW(), locked_by = ?
       WHERE id = ? AND status IN ('pending', 'failed')
         AND next_attempt_at <= NOW()`,
      [workerId, id]
    );

    if (updateResult.affectedRows === 0) {
      return null;
    }

    const [rows] = await pool.query(
      `SELECT * FROM email_outbox WHERE id = ? AND locked_by = ? AND status = 'processing'`,
      [id, workerId]
    );

    return rows.length > 0 ? rows[0] : null;
  },

  markSent: async (id) => {
    // Clear the payload to remove any sensitive tokens from being stored permanently
    await pool.query(
      `UPDATE email_outbox 
       SET status = 'sent', sent_at = NOW(), payload = '{}', locked_at = NULL, locked_by = NULL 
       WHERE id = ?`,
      [id]
    );
  },

  markRetry: async (id, attemptNumber, lastErrorCode) => {
    // Exponential backoff logic: 2^attempt * 10 seconds (e.g., 20s, 40s, 80s)
    const backoffSeconds = Math.pow(2, attemptNumber) * 10;
    
    await pool.query(
      `UPDATE email_outbox 
       SET status = 'failed', 
           attempts = ?, 
           next_attempt_at = DATE_ADD(NOW(), INTERVAL ? SECOND),
           last_error_code = ?,
           locked_at = NULL, 
           locked_by = NULL
       WHERE id = ?`,
      [attemptNumber, backoffSeconds, lastErrorCode, id]
    );
  },

  markDeadLetter: async (id, lastErrorCode) => {
    // Clear payload just in case, though dead letters might need debugging.
    // The requirement is to preserve generic responses and not store tokens in long-lived records.
    // We can clear token fields specifically, but clearing payload completely is safest.
    await pool.query(
      `UPDATE email_outbox 
       SET status = 'dead_letter', 
           last_error_code = ?, 
           payload = '{}',
           locked_at = NULL, 
           locked_by = NULL
       WHERE id = ?`,
      [lastErrorCode, id]
    );
  },

  releaseStaleLocks: async (staleMinutes = 5) => {
    // If a worker crashes while processing, the lock will become stale.
    // Reset those back to failed so they can be picked up again.
    const [result] = await pool.query(
      `UPDATE email_outbox 
       SET status = 'failed', locked_at = NULL, locked_by = NULL
       WHERE status = 'processing' 
         AND locked_at <= DATE_SUB(NOW(), INTERVAL ? MINUTE)`,
      [staleMinutes]
    );
    return result.affectedRows;
  },
  
  getHealthStats: async () => {
    const [rows] = await pool.query(
      `SELECT status, COUNT(*) as count 
       FROM email_outbox 
       GROUP BY status`
    );
    return rows;
  },

  retryDeadLetter: async (id) => {
    const [result] = await pool.query(
      `UPDATE email_outbox 
       SET status = 'pending', attempts = 0, next_attempt_at = NOW() 
       WHERE id = ? AND status = 'dead_letter'`,
      [id]
    );
    return result.affectedRows > 0;
  }
};

module.exports = EmailOutbox;
