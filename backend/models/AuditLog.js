/**
 * models/AuditLog.js
 *
 * Immutable audit trail.
 * Application layer MUST NOT update or delete rows.
 * Audit-log creation failure is caught and logged without aborting the main action.
 */

'use strict';

const pool = require('../config/db');

// Fields that must NEVER be stored in audit metadata
const FORBIDDEN_KEYS = [
  'password', 'password_hash', 'token', 'jwt', 'cookie', 'secret',
  'stripe_key', 'api_key', 'email_payload', 'encryption_key',
  'access_key', 'private_key', 'agent_notes', 'internal_notes', 'notes',
];

/**
 * Sanitize metadata to ensure no sensitive keys are included.
 * @param {object|null} metadata
 * @returns {object}
 */
const sanitizeMetadata = (metadata) => {
  if (!metadata || typeof metadata !== 'object') return {};
  const safe = {};
  for (const [k, v] of Object.entries(metadata)) {
    if (FORBIDDEN_KEYS.some(f => k.toLowerCase().includes(f))) continue;
    // Truncate long string values
    safe[k] = typeof v === 'string' && v.length > 500 ? v.slice(0, 500) + '…' : v;
  }
  return safe;
};

const AuditLog = {
  /**
   * Record an audit event.
   * Failures are caught internally — they must not abort the main action.
   *
   * @param {object} params
   * @param {number|null} params.adminId
   * @param {string}      params.action      — e.g. 'hotel_created'
   * @param {string}      params.entityType  — e.g. 'hotel'
   * @param {number|null} params.entityId
   * @param {object}      [params.metadata]
   * @param {string}      [params.ip]
   */
  create: async ({ adminId = null, action, entityType, entityId = null, metadata = {}, ip = null }) => {
    try {
      const safeMetadata = sanitizeMetadata(metadata);
      await pool.query(
        `INSERT INTO audit_logs (admin_id, action, entity_type, entity_id, metadata, ip_address)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          adminId,
          action,
          entityType,
          entityId,
          JSON.stringify(safeMetadata),
          ip ? ip.slice(0, 45) : null,
        ]
      );
    } catch (err) {
      // Log but do not re-throw — audit failure must not break the main flow
      console.error('[AuditLog] Failed to write audit entry:', err.message, { action, entityType, entityId });
    }
  },

  /**
   * Paginated admin viewer.
   * @param {object} filters
   * @param {number} page
   * @param {number} limit
   */
  findAll: async (filters = {}, page = 1, limit = 20) => {
    const conditions = [];
    const params = [];

    if (filters.admin_id) {
      conditions.push('a.admin_id = ?');
      params.push(filters.admin_id);
    }
    if (filters.action) {
      conditions.push('a.action LIKE ?');
      params.push(`%${filters.action}%`);
    }
    if (filters.entity_type) {
      conditions.push('a.entity_type = ?');
      params.push(filters.entity_type);
    }
    if (filters.entity_id) {
      conditions.push('a.entity_id = ?');
      params.push(filters.entity_id);
    }
    if (filters.start_date) {
      conditions.push('a.created_at >= ?');
      params.push(filters.start_date);
    }
    if (filters.end_date) {
      conditions.push('a.created_at <= ?');
      params.push(filters.end_date);
    }

    const where = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';
    const offset = (page - 1) * limit;

    const [[{ total }]] = await pool.query(
      `SELECT COUNT(*) AS total FROM audit_logs a ${where}`,
      params
    );

    const [items] = await pool.query(
      `SELECT a.id, a.admin_id, a.action, a.entity_type, a.entity_id,
              a.metadata, a.ip_address, a.created_at,
              u.first_name, u.last_name, u.email AS admin_email
       FROM audit_logs a
       LEFT JOIN users u ON a.admin_id = u.id
       ${where}
       ORDER BY a.id DESC
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    return { items, total };
  },
};

module.exports = AuditLog;
