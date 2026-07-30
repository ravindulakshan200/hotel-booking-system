/**
 * utils/paginate.js
 *
 * Server-side pagination utility.
 *
 * Usage:
 *   const { parsePagination, buildPaginatedResponse } = require('../utils/paginate');
 *   const { page, limit, offset } = parsePagination(req.query);
 *   // run COUNT query + data query
 *   return res.json(buildPaginatedResponse(items, total, page, limit));
 */

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

/**
 * Parse and validate pagination query params.
 * @param {object} query — req.query
 * @returns {{ page: number, limit: number, offset: number }}
 */
const parsePagination = (query = {}) => {
  let page  = parseInt(query.page,  10);
  let limit = parseInt(query.limit, 10);

  if (!Number.isInteger(page)  || page  < 1) page  = 1;
  if (!Number.isInteger(limit) || limit < 1) limit = DEFAULT_LIMIT;
  if (limit > MAX_LIMIT) limit = MAX_LIMIT;

  const offset = (page - 1) * limit;
  return { page, limit, offset };
};

/**
 * Build the standard paginated API response envelope.
 *
 * @param {any[]}  items
 * @param {number} totalItems — total count from COUNT(*) query
 * @param {number} page
 * @param {number} limit
 * @returns {object}
 */
const buildPaginatedResponse = (items, totalItems, page, limit) => {
  const totalPages = Math.ceil(totalItems / limit) || 1;
  return {
    items,
    page,
    limit,
    total_items: totalItems,
    total_pages: totalPages,
    has_next:     page < totalPages,
    has_previous: page > 1,
  };
};

module.exports = { parsePagination, buildPaginatedResponse, DEFAULT_LIMIT, MAX_LIMIT };
