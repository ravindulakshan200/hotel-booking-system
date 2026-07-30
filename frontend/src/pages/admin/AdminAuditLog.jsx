/**
 * pages/admin/AdminAuditLog.jsx
 * Admin Audit Log Trail Viewer.
 */

import React, { useState, useEffect } from 'react';
import Pagination from '../../components/Pagination';

const AdminAuditLog = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [action, setAction] = useState('');
  const [entityType, setEntityType] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [adminId, setAdminId] = useState('');
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total_pages: 1 });

  const fetchLogs = async (page = 1) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page,
        limit: pagination.limit,
        action,
        entity_type: entityType,
        start_date: startDate,
        end_date: endDate,
        admin_id: adminId,
      });
      const res = await fetch(`/api/v1/admin/audit-logs?${params}`);
      const body = await res.json();
      if (body.success) {
        setLogs(body.data.items || []);
        setPagination({
          page: body.data.page,
          limit: body.data.limit,
          total_pages: body.data.total_pages,
        });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs(1);
  }, [action, entityType]);

  const handleFilterSubmit = (e) => {
    e.preventDefault();
    fetchLogs(1);
  };

  const handleReset = () => {
    setAction('');
    setEntityType('');
    setStartDate('');
    setEndDate('');
    setAdminId('');
    fetchLogs(1);
  };

  return (
    <div className="container py-4">
      <h2 className="font-serif mb-4" style={{ color: 'var(--color-primary)' }}>System Audit Log Trail</h2>

      <div className="card glass-card p-4 mb-4">
        <form onSubmit={handleFilterSubmit} className="row g-3">
          <div className="col-md-3">
            <label className="form-label" htmlFor="audit-action">Action Type</label>
            <select className="form-select" id="audit-action" value={action} onChange={(e) => setAction(e.target.value)}>
              <option value="">All Actions</option>
              <option value="user_deactivated">User Deactivated</option>
              <option value="user_reactivated">User Reactivated</option>
              <option value="support_ticket_status_changed">Support Status Changed</option>
              <option value="support_ticket_note_added">Support Note Added</option>
              <option value="review_deleted">Review Deleted</option>
              <option value="review_hided">Review Hidden</option>
              <option value="review_unhided">Review Unhidden</option>
              <option value="report_exported">Report Exported</option>
              <option value="hotel_images_uploaded">Hotel Images Uploaded</option>
              <option value="hotel_image_deleted">Hotel Image Deleted</option>
            </select>
          </div>

          <div className="col-md-2">
            <label className="form-label" htmlFor="audit-entity">Entity Type</label>
            <select className="form-select" id="audit-entity" value={entityType} onChange={(e) => setEntityType(e.target.value)}>
              <option value="">All Entities</option>
              <option value="user">User</option>
              <option value="hotel">Hotel</option>
              <option value="booking">Booking</option>
              <option value="payment">Payment</option>
              <option value="review">Review</option>
              <option value="support_ticket">Support Ticket</option>
            </select>
          </div>

          <div className="col-md-2">
            <label className="form-label" htmlFor="audit-admin">Admin User ID</label>
            <input
              type="number"
              className="form-control"
              id="audit-admin"
              placeholder="e.g. 1"
              value={adminId}
              onChange={(e) => setAdminId(e.target.value)}
            />
          </div>

          <div className="col-md-2">
            <label className="form-label" htmlFor="audit-start">Start Date</label>
            <input
              type="date"
              className="form-control"
              id="audit-start"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>

          <div className="col-md-2">
            <label className="form-label" htmlFor="audit-end">End Date</label>
            <input
              type="date"
              className="form-control"
              id="audit-end"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>

          <div className="col-md-1 d-flex align-items-end gap-2">
            <button type="submit" className="btn btn-primary btn-sm flex-grow-1 rounded-pill py-2">Filter</button>
            <button type="button" className="btn btn-outline-secondary btn-sm rounded-pill py-2" onClick={handleReset}>Reset</button>
          </div>
        </form>
      </div>

      <div className="card glass-card p-3">
        {loading ? (
          <div className="text-center py-5">
            <div className="spinner-border text-primary" role="status"></div>
          </div>
        ) : logs.length === 0 ? (
          <div className="text-center py-5 text-muted">
            <p>No audit trail records found for selected filters.</p>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="table table-hover align-middle">
              <thead>
                <tr>
                  <th>Timestamp</th>
                  <th>Actor (Admin ID)</th>
                  <th>Action</th>
                  <th>Entity Type (ID)</th>
                  <th>IP Address</th>
                  <th>Metadata Context</th>
                </tr>
              </thead>
              <tbody>
                {logs.map(log => (
                  <tr key={log.id}>
                    <td><small className="text-muted">{new Date(log.created_at).toLocaleString()}</small></td>
                    <td>
                      <span className="fw-semibold">Admin (ID: {log.admin_id})</span>
                      <div className="text-muted small">{log.admin_email}</div>
                    </td>
                    <td>
                      <span className="badge bg-primary text-uppercase" style={{ fontSize: '0.74rem' }}>
                        {log.action.replace('_', ' ')}
                      </span>
                    </td>
                    <td>
                      <span className="fw-semibold text-capitalize">{log.entity_type}</span>{' '}
                      <small className="text-muted">(ID: {log.entity_id})</small>
                    </td>
                    <td><code>{log.ip_address}</code></td>
                    <td>
                      <pre className="m-0 bg-light p-2 rounded small" style={{ fontSize: '0.75rem', fontFamily: 'monospace', maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {JSON.stringify(log.metadata)}
                      </pre>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Controls */}
        {pagination.total_pages > 1 && (
          <Pagination
            page={pagination.page}
            totalPages={pagination.total_pages}
            onPageChange={(p) => fetchLogs(p)}
          />
        )}
      </div>
    </div>
  );
};

export default AdminAuditLog;
