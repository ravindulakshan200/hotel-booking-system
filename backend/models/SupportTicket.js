/**
 * models/SupportTicket.js
 * Data-access layer for the support_tickets table.
 *
 * IMPORTANT: agent_notes is NEVER returned by customer-facing methods.
 */

'use strict';

const pool = require('../config/db');
const { parsePagination, buildPaginatedResponse } = require('../utils/paginate');

const SAFE_CUSTOMER_COLUMNS = `
  id, ticket_ref, name, email, subject, category, message, status, created_at, updated_at
`;

const SupportTicket = {
  /** Create a new support ticket */
  create: async ({ userId = null, ticketRef, name, email, subject, category, message, lookupTokenHash = null }) => {
    const [result] = await pool.query(
      `INSERT INTO support_tickets (user_id, ticket_ref, name, email, subject, category, message, lookup_token_hash)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [userId, ticketRef, name, email, subject, category, message, lookupTokenHash]
    );
    return result.insertId;
  },

  /** Find support ticket by hashed lookup token */
  findByLookupHash: async (hash) => {
    const [rows] = await pool.query(
      `SELECT ${SAFE_CUSTOMER_COLUMNS}
       FROM support_tickets WHERE lookup_token_hash = ? LIMIT 1`,
      [hash]
    );
    return rows[0] || null;
  },

  /** Customer: find tickets by authenticated user (no agent_notes) */
  findByUser: async (userId, query = {}) => {
    const { page, limit, offset } = parsePagination(query);
    const [[{ total }]] = await pool.query(
      'SELECT COUNT(*) AS total FROM support_tickets WHERE user_id = ?',
      [userId]
    );
    const [items] = await pool.query(
      `SELECT ${SAFE_CUSTOMER_COLUMNS}
       FROM support_tickets
       WHERE user_id = ?
       ORDER BY id DESC
       LIMIT ? OFFSET ?`,
      [userId, limit, offset]
    );
    return buildPaginatedResponse(items, total, page, limit);
  },

  /** Customer: find a single ticket by ref — owned by userId (no agent_notes) */
  findByRefAndUser: async (ticketRef, userId) => {
    const [rows] = await pool.query(
      `SELECT ${SAFE_CUSTOMER_COLUMNS}
       FROM support_tickets
       WHERE ticket_ref = ? AND user_id = ?
       LIMIT 1`,
      [ticketRef, userId]
    );
    return rows[0] || null;
  },

  /** Public: find ticket by ref (unauthenticated — no agent_notes) */
  findByRef: async (ticketRef) => {
    const [rows] = await pool.query(
      `SELECT ${SAFE_CUSTOMER_COLUMNS}
       FROM support_tickets WHERE ticket_ref = ? LIMIT 1`,
      [ticketRef]
    );
    return rows[0] || null;
  },

  /** Admin: find by id with agent_notes */
  findByIdAdmin: async (id) => {
    const [rows] = await pool.query(
      `SELECT id, user_id, ticket_ref, name, email, subject, category,
              message, status, agent_notes, created_at, updated_at
       FROM support_tickets WHERE id = ? LIMIT 1`,
      [id]
    );
    return rows[0] || null;
  },

  /** Admin: paginated list with optional filters */
  findAll: async (filters = {}, query = {}) => {
    const { page, limit, offset } = parsePagination(query);
    const conditions = [];
    const params = [];

    if (filters.status) {
      conditions.push('status = ?');
      params.push(filters.status);
    }
    if (filters.category) {
      conditions.push('category = ?');
      params.push(filters.category);
    }
    if (filters.search) {
      conditions.push('(name LIKE ? OR email LIKE ? OR subject LIKE ? OR ticket_ref LIKE ?)');
      const t = `%${filters.search}%`;
      params.push(t, t, t, t);
    }

    const where = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';

    const [[{ total }]] = await pool.query(
      `SELECT COUNT(*) AS total FROM support_tickets ${where}`, params
    );
    const [items] = await pool.query(
      `SELECT id, user_id, ticket_ref, name, email, subject, category,
              status, created_at, updated_at
       FROM support_tickets ${where}
       ORDER BY id DESC
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    return buildPaginatedResponse(items, total, page, limit);
  },

  /** Admin: update status */
  updateStatus: async (id, status) => {
    const [result] = await pool.query(
      'UPDATE support_tickets SET status = ? WHERE id = ?',
      [status, id]
    );
    return result.affectedRows;
  },

  /** Admin: append agent note (prepend timestamp) */
  addAgentNote: async (id, note) => {
    const ts = new Date().toISOString();
    const [result] = await pool.query(
      `UPDATE support_tickets
       SET agent_notes = CONCAT(COALESCE(agent_notes, ''), ?)
       WHERE id = ?`,
      [`[${ts}] ${note}\n`, id]
    );
    return result.affectedRows;
  },
};

module.exports = SupportTicket;
