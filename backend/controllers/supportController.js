/**
 * controllers/supportController.js
 *
 * Public/authenticated support ticket system.
 *
 * Security:
 *  - Rate-limited: 3 tickets/hour per IP (express-rate-limit)
 *  - Honeypot: 'website' field must be empty
 *  - Strong input validation (lengths, enum categories)
 *  - agent_notes never exposed to customers
 *  - Parameterized queries only
 */

'use strict';

const SupportTicket = require('../models/SupportTicket');
const AuditLog      = require('../models/AuditLog');
const { parsePagination, buildPaginatedResponse } = require('../utils/paginate');

const VALID_CATEGORIES = ['booking', 'payment', 'refund', 'technical', 'complaint', 'other'];
const VALID_STATUSES   = ['open', 'in_progress', 'resolved', 'closed'];

/** Generate a unique ticket reference */
const generateTicketRef = () => {
  const ts  = new Date();
  const date = `${ts.getUTCFullYear()}${String(ts.getUTCMonth() + 1).padStart(2,'0')}${String(ts.getUTCDate()).padStart(2,'0')}`;
  const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `TKT-${date}-${rand}`;
};

const validateTicketInput = (body) => {
  const errors = [];
  const { name, email, subject, category, message } = body;

  if (!name || typeof name !== 'string' || name.trim().length < 2 || name.trim().length > 80) {
    errors.push('name must be 2–80 characters');
  }
  const emailRx = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!email || !emailRx.test((email || '').trim()) || email.length > 150) {
    errors.push('valid email is required (max 150 characters)');
  }
  if (!subject || typeof subject !== 'string' || subject.trim().length < 5 || subject.trim().length > 120) {
    errors.push('subject must be 5–120 characters');
  }
  if (!category || !VALID_CATEGORIES.includes(category)) {
    errors.push(`category must be one of: ${VALID_CATEGORIES.join(', ')}`);
  }
  if (!message || typeof message !== 'string' || message.trim().length < 10 || message.trim().length > 2000) {
    errors.push('message must be 10–2000 characters');
  }

  return { valid: errors.length === 0, errors };
};

// ─── Public: Submit a ticket ─────────────────────────────────────────────────

const crypto = require('crypto');

const createTicket = async (req, res, next) => {
  try {
    // Honeypot: if 'website' field is populated, silently succeed (spam detection)
    if (req.body.website && req.body.website.length > 0) {
      return res.status(201).json({ success: true, message: 'Ticket submitted.', data: { ticket_ref: 'TKT-HONEYPOT' } });
    }

    const { valid, errors } = validateTicketInput(req.body);
    if (!valid) {
      return res.status(400).json({ success: false, message: 'Validation failed.', errors });
    }

    const { name, email, subject, category, message } = req.body;
    const userId    = req.user?.id || null;
    const ticketRef = generateTicketRef();

    let lookupToken = null;
    let lookupTokenHash = null;

    if (!userId) {
      lookupToken = crypto.randomBytes(32).toString('hex');
      lookupTokenHash = crypto.createHash('sha256').update(lookupToken).digest('hex');
    }

    await SupportTicket.create({
      userId,
      ticketRef,
      name:    name.trim(),
      email:   email.trim().toLowerCase(),
      subject: subject.trim(),
      category,
      message: message.trim(),
      lookupTokenHash,
    });

    const responseData = { ticket_ref: ticketRef };
    if (lookupToken) {
      responseData.lookup_token = lookupToken;
    }

    return res.status(201).json({
      success: true,
      message: 'Support ticket submitted successfully.',
      data: responseData,
    });
  } catch (err) {
    next(err);
  }
};

// ─── Public: Lookup ticket by token (unauthenticated) ─────────────────────────

const lookupTicket = async (req, res, next) => {
  try {
    const { token } = req.body;
    if (!token || typeof token !== 'string' || token.trim().length === 0) {
      return res.status(400).json({ success: false, message: 'Token is required.' });
    }

    const tokenHash = crypto.createHash('sha256').update(token.trim()).digest('hex');
    const ticket = await SupportTicket.findByLookupHash(tokenHash);

    if (!ticket) {
      return res.status(404).json({ success: false, message: 'Ticket not found or invalid token.' });
    }

    // Return only customer-safe fields
    delete ticket.agent_notes;
    delete ticket.lookup_token_hash;

    return res.status(200).json({ success: true, message: 'Ticket fetched.', data: { ticket } });
  } catch (err) {
    next(err);
  }
};

// ─── Authenticated: Get own tickets ──────────────────────────────────────────

const getMyTickets = async (req, res, next) => {
  try {
    const result = await SupportTicket.findByUser(req.user.id, req.query);
    return res.status(200).json({ success: true, message: 'Tickets fetched.', data: result });
  } catch (err) {
    next(err);
  }
};

// ─── Authenticated: Get ticket by ref (owner only) ──────────────────────────

const getTicketByRef = async (req, res, next) => {
  try {
    const { ref } = req.params;
    const ticket = await SupportTicket.findByRefAndUser(ref, req.user.id);
    if (!ticket) {
      return res.status(404).json({ success: false, message: 'Ticket not found.' });
    }
    return res.status(200).json({ success: true, message: 'Ticket fetched.', data: { ticket } });
  } catch (err) {
    next(err);
  }
};

// ─── Admin: Get all tickets ──────────────────────────────────────────────────

const adminGetAllTickets = async (req, res, next) => {
  try {
    const filters = {};
    if (req.query.status)   filters.status   = req.query.status;
    if (req.query.category) filters.category = req.query.category;
    if (req.query.search)   filters.search   = req.query.search;

    const result = await SupportTicket.findAll(filters, { ...req.query, paginate: true });
    return res.status(200).json({ success: true, message: 'Tickets fetched.', data: result });
  } catch (err) {
    next(err);
  }
};

// ─── Admin: Update ticket status ─────────────────────────────────────────────

const adminUpdateStatus = async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (!Number.isInteger(id) || id < 1) {
      return res.status(400).json({ success: false, message: 'Invalid ticket ID.' });
    }

    const { status } = req.body;
    if (!VALID_STATUSES.includes(status)) {
      return res.status(400).json({ success: false, message: `status must be one of: ${VALID_STATUSES.join(', ')}` });
    }

    const ticket = await SupportTicket.findByIdAdmin(id);
    if (!ticket) return res.status(404).json({ success: false, message: 'Ticket not found.' });

    await SupportTicket.updateStatus(id, status);

    await AuditLog.create({
      adminId: req.user.id,
      action: 'support_ticket_status_changed',
      entityType: 'support_ticket',
      entityId: id,
      metadata: { ticket_ref: ticket.ticket_ref, old_status: ticket.status, new_status: status },
      ip: req.ip,
    });

    return res.status(200).json({ success: true, message: 'Ticket status updated.', data: null });
  } catch (err) {
    next(err);
  }
};

// ─── Admin: Add agent note ────────────────────────────────────────────────────

const adminAddNote = async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (!Number.isInteger(id) || id < 1) {
      return res.status(400).json({ success: false, message: 'Invalid ticket ID.' });
    }

    const { note } = req.body;
    if (!note || typeof note !== 'string' || note.trim().length === 0 || note.trim().length > 2000) {
      return res.status(400).json({ success: false, message: 'note must be 1–2000 characters.' });
    }

    const ticket = await SupportTicket.findByIdAdmin(id);
    if (!ticket) return res.status(404).json({ success: false, message: 'Ticket not found.' });

    await SupportTicket.addAgentNote(id, note.trim());

    return res.status(200).json({ success: true, message: 'Note added.', data: null });
  } catch (err) {
    next(err);
  }
};

// ─── Admin: Get ticket detail (with agent_notes) ─────────────────────────────

const adminGetTicket = async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    const ticket = await SupportTicket.findByIdAdmin(id);
    if (!ticket) return res.status(404).json({ success: false, message: 'Ticket not found.' });
    return res.status(200).json({ success: true, message: 'Ticket fetched.', data: { ticket } });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  createTicket,
  getMyTickets,
  getTicketByRef,
  adminGetAllTickets,
  adminUpdateStatus,
  adminAddNote,
  adminGetTicket,
  lookupTicket,
};
