/**
 * pages/admin/AdminSupport.jsx
 * Admin Support Tickets Management dashboard.
 */

import React, { useState, useEffect } from 'react';
import Pagination from '../../components/Pagination';

const AdminSupport = () => {
  const [tickets, setTickets] = useState([]);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [note, setNote] = useState('');
  const [submittingNote, setSubmittingNote] = useState(false);
  const [status, setStatus] = useState('open');
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total_pages: 1 });

  const fetchTickets = async (page = 1) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page,
        limit: pagination.limit,
        status: status === 'all' ? '' : status,
        category,
        search,
      });
      const res = await fetch(`/api/v1/admin/support?${params}`);
      const body = await res.json();
      if (body.success) {
        setTickets(body.data.items || []);
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
    fetchTickets(1);
  }, [status, category]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchTickets(1);
  };

  const selectTicket = async (ticketId) => {
    setLoadingDetail(true);
    try {
      const res = await fetch(`/api/v1/admin/support/${ticketId}`);
      const body = await res.json();
      if (body.success) {
        setSelectedTicket(body.data.ticket);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingDetail(false);
    }
  };

  const handleStatusChange = async (newStatus) => {
    if (!selectedTicket) return;
    try {
      const res = await fetch(`/api/v1/admin/support/${selectedTicket.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.status === 200) {
        setSelectedTicket(prev => ({ ...prev, status: newStatus }));
        fetchTickets(pagination.page);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddNote = async (e) => {
    e.preventDefault();
    if (!note.trim() || !selectedTicket) return;
    setSubmittingNote(true);
    try {
      const res = await fetch(`/api/v1/admin/support/${selectedTicket.id}/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ note: note.trim() }),
      });
      if (res.status === 200) {
        setNote('');
        // Reload detail
        selectTicket(selectedTicket.id);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSubmittingNote(false);
    }
  };

  return (
    <div className="container py-4">
      <h2 className="font-serif mb-4" style={{ color: 'var(--color-primary)' }}>Customer Support Tickets</h2>

      <div className="row g-4">
        {/* Ticket List Panel */}
        <div className="col-md-7">
          <div className="card glass-card p-3 mb-4">
            <form onSubmit={handleSearchSubmit} className="row g-2 mb-3">
              <div className="col-sm-5">
                <input
                  type="text"
                  className="form-control"
                  placeholder="Search name, email, ref..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <div className="col-sm-3">
                <select className="form-select" value={category} onChange={(e) => setCategory(e.target.value)}>
                  <option value="">All Categories</option>
                  <option value="booking">Booking</option>
                  <option value="payment">Payment</option>
                  <option value="refund">Refund</option>
                  <option value="technical">Technical</option>
                  <option value="complaint">Complaint</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div className="col-sm-4 d-flex gap-2">
                <button type="submit" className="btn btn-primary btn-sm flex-grow-1 rounded-pill">Search</button>
                <button type="button" className="btn btn-outline-secondary btn-sm rounded-pill" onClick={() => { setSearch(''); setCategory(''); setStatus('open'); }}>Reset</button>
              </div>
            </form>

            <div className="d-flex gap-2 mb-3 border-bottom pb-2">
              {['all', 'open', 'in_progress', 'resolved', 'closed'].map(st => (
                <button
                  key={st}
                  type="button"
                  className={`btn btn-sm rounded-pill ${status === st ? 'btn-primary' : 'btn-outline-primary'}`}
                  style={{ textTransform: 'capitalize', padding: '0.4rem 1rem' }}
                  onClick={() => setStatus(st)}
                >
                  {st.replace('_', ' ')}
                </button>
              ))}
            </div>

            {loading ? (
              <div className="text-center py-5">
                <div className="spinner-border text-primary" role="status"></div>
              </div>
            ) : tickets.length === 0 ? (
              <div className="text-center py-5">
                <p className="text-muted">No support tickets found.</p>
              </div>
            ) : (
              <div className="table-responsive">
                <table className="table table-hover align-middle">
                  <thead>
                    <tr>
                      <th>Ref</th>
                      <th>Sender</th>
                      <th>Category</th>
                      <th>Date</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tickets.map(tkt => (
                      <tr
                        key={tkt.id}
                        onClick={() => selectTicket(tkt.id)}
                        style={{ cursor: 'pointer' }}
                        className={selectedTicket?.id === tkt.id ? 'table-active' : ''}
                      >
                        <td><strong>{tkt.ticket_ref}</strong></td>
                        <td>
                          <div className="fw-semibold">{tkt.name}</div>
                          <small className="text-muted">{tkt.email}</small>
                        </td>
                        <td>{tkt.category}</td>
                        <td>{new Date(tkt.created_at).toLocaleDateString()}</td>
                        <td>
                          <span className={`badge ${
                            tkt.status === 'open' ? 'bg-info' :
                            tkt.status === 'in_progress' ? 'bg-warning' :
                            tkt.status === 'resolved' ? 'bg-success' : 'bg-secondary'
                          }`}>
                            {tkt.status.replace('_', ' ')}
                          </span>
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
                onPageChange={(p) => fetchTickets(p)}
              />
            )}
          </div>
        </div>

        {/* Ticket Details Panel */}
        <div className="col-md-5">
          <div className="card glass-card p-4 sticky-top" style={{ top: '90px', zIndex: 1 }}>
            {loadingDetail ? (
              <div className="text-center py-5">
                <div className="spinner-border text-primary" role="status"></div>
              </div>
            ) : !selectedTicket ? (
              <div className="text-center py-5 text-muted">
                <i className="bi bi-chat-square-text fs-1"></i>
                <p className="mt-3">Select a ticket from the list to view detail, update status, and add notes.</p>
              </div>
            ) : (
              <div>
                <div className="d-flex justify-content-between align-items-start mb-3">
                  <div>
                    <span className="badge bg-secondary mb-1">{selectedTicket.category.toUpperCase()}</span>
                    <h4>{selectedTicket.subject}</h4>
                    <small className="text-muted">Ref: {selectedTicket.ticket_ref}</small>
                  </div>
                  <select
                    className="form-select form-select-sm w-auto rounded-pill"
                    value={selectedTicket.status}
                    onChange={(e) => handleStatusChange(e.target.value)}
                  >
                    <option value="open">Open</option>
                    <option value="in_progress">In Progress</option>
                    <option value="resolved">Resolved</option>
                    <option value="closed">Closed</option>
                  </select>
                </div>

                <div className="mb-3 border-bottom pb-3">
                  <div className="fw-semibold">From: {selectedTicket.name}</div>
                  <div className="text-muted small">Email: {selectedTicket.email}</div>
                  <div className="text-muted small">Submitted: {new Date(selectedTicket.created_at).toLocaleString()}</div>
                </div>

                <div className="mb-4">
                  <label className="form-label text-muted small">Message Description</label>
                  <p className="p-3 bg-light rounded" style={{ whiteSpace: 'pre-line' }}>{selectedTicket.message}</p>
                </div>

                {/* Agent internal notes */}
                <div className="mb-4">
                  <label className="form-label text-muted small">Internal Agent Notes (Never exposed to customer)</label>
                  <pre className="p-3 bg-dark text-warning rounded small overflow-auto" style={{ maxHeight: '180px', whiteSpace: 'pre-wrap' }}>
                    {selectedTicket.agent_notes || 'No agent notes recorded.'}
                  </pre>
                </div>

                <form onSubmit={handleAddNote}>
                  <div className="mb-3">
                    <textarea
                      className="form-control"
                      placeholder="Add an internal note..."
                      rows="3"
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      required
                    ></textarea>
                  </div>
                  <button type="submit" className="btn btn-accent btn-sm w-100 rounded-pill" disabled={submittingNote}>
                    {submittingNote ? 'Adding note...' : 'Add Internal Note'}
                  </button>
                </form>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminSupport;
