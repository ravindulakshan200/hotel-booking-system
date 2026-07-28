/**
 * pages/Support.jsx
 * Public/authenticated Support ticket submission and history.
 */

import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';

const Support = () => {
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    name: user ? `${user.first_name} ${user.last_name}` : '',
    email: user ? user.email : '',
    subject: '',
    category: 'other',
    message: '',
    website: '', // Honeypot
  });

  const [tickets, setTickets] = useState([]);
  const [loadingTickets, setLoadingTickets] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Fetch own tickets if logged in
  const fetchMyTickets = async () => {
    if (!user) return;
    setLoadingTickets(true);
    try {
      const res = await fetch('/api/v1/support/my-tickets');
      const body = await res.json();
      if (body.success) {
        setTickets(body.data.items || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingTickets(false);
    }
  };

  useEffect(() => {
    fetchMyTickets();
  }, [user]);

  const handleChange = (e) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setSuccessMsg('');
    setErrorMsg('');

    try {
      const res = await fetch('/api/v1/support', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      const body = await res.json();
      if (res.status === 201) {
        setSuccessMsg(`Support ticket submitted successfully! Ticket Reference: ${body.data.ticket_ref}`);
        setFormData(prev => ({
          ...prev,
          subject: '',
          message: '',
          website: '',
        }));
        fetchMyTickets();
      } else {
        setErrorMsg(body.message || 'Failed to submit support ticket.');
      }
    } catch (err) {
      setErrorMsg('Network error. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="container py-5">
      <div className="row g-4">
        {/* Ticket Submission Form */}
        <div className="col-md-6">
          <div className="card glass-card p-4 h-100">
            <h2 className="font-serif mb-3" style={{ color: 'var(--color-primary)' }}>Contact Support</h2>
            <p className="text-muted mb-4">Have a question or need assistance with your stay? Submit a ticket below and our support team will assist you shortly.</p>

            {successMsg && <div className="alert alert-success alert-dismissible fade show" role="alert">{successMsg}</div>}
            {errorMsg && <div className="alert alert-danger" role="alert">{errorMsg}</div>}

            <form onSubmit={handleSubmit}>
              <div className="mb-3">
                <label className="form-label" htmlFor="support-name">Your Name</label>
                <input
                  type="text"
                  className="form-control"
                  id="support-name"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                  disabled={!!user}
                />
              </div>

              <div className="mb-3">
                <label className="form-label" htmlFor="support-email">Email Address</label>
                <input
                  type="email"
                  className="form-control"
                  id="support-email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  disabled={!!user}
                />
              </div>

              {/* Honeypot field (hidden from user) */}
              <div className="d-none" aria-hidden="true">
                <label className="form-label" htmlFor="support-website">Leave this empty</label>
                <input
                  type="text"
                  id="support-website"
                  name="website"
                  value={formData.website}
                  onChange={handleChange}
                  tabIndex="-1"
                  autoComplete="off"
                />
              </div>

              <div className="row g-2 mb-3">
                <div className="col-md-6">
                  <label className="form-label" htmlFor="support-category">Category</label>
                  <select
                    className="form-select"
                    id="support-category"
                    name="category"
                    value={formData.category}
                    onChange={handleChange}
                  >
                    <option value="other">General / Other</option>
                    <option value="booking">Booking Issue</option>
                    <option value="payment">Payment Issue</option>
                    <option value="refund">Refund Request</option>
                    <option value="technical">Technical Support</option>
                    <option value="complaint">Complaint</option>
                  </select>
                </div>
                <div className="col-md-6">
                  <label className="form-label" htmlFor="support-subject">Subject</label>
                  <input
                    type="text"
                    className="form-control"
                    id="support-subject"
                    name="subject"
                    value={formData.subject}
                    onChange={handleChange}
                    required
                    placeholder="Short summary"
                  />
                </div>
              </div>

              <div className="mb-4">
                <label className="form-label" htmlFor="support-message">Message Details</label>
                <textarea
                  className="form-control"
                  id="support-message"
                  name="message"
                  rows="5"
                  value={formData.message}
                  onChange={handleChange}
                  required
                  placeholder="Describe your issue in detail..."
                ></textarea>
              </div>

              <button
                type="submit"
                className="btn btn-accent w-100 py-3 rounded-pill"
                disabled={submitting}
                id="support-submit-btn"
              >
                {submitting ? 'Submitting...' : 'Submit Support Ticket'}
              </button>
            </form>
          </div>
        </div>

        {/* Own Ticket History */}
        <div className="col-md-6">
          <div className="card glass-card p-4 h-100">
            <h3 className="font-serif mb-3" style={{ color: 'var(--color-primary)' }}>Your Ticket History</h3>

            {!user ? (
              <div className="text-center py-5">
                <i className="bi bi-lock fs-1 text-muted"></i>
                <p className="mt-3 text-muted">Log in to view and track your support ticket history.</p>
              </div>
            ) : loadingTickets ? (
              <div className="text-center py-5">
                <div className="spinner-border text-primary" role="status"></div>
              </div>
            ) : tickets.length === 0 ? (
              <div className="text-center py-5">
                <i className="bi bi-chat-left-text fs-1 text-muted"></i>
                <p className="mt-3 text-muted">You have not submitted any support tickets yet.</p>
              </div>
            ) : (
              <div className="d-flex flex-column gap-3 overflow-auto" style={{ maxHeight: '550px' }}>
                {tickets.map(tkt => (
                  <div key={tkt.id} className="p-3 rounded border border-light bg-light">
                    <div className="d-flex justify-content-between align-items-start mb-2">
                      <span className="fw-bold" style={{ color: 'var(--color-primary)' }}>{tkt.subject}</span>
                      <span className={`badge ${
                        tkt.status === 'open' ? 'bg-info' :
                        tkt.status === 'in_progress' ? 'bg-warning' :
                        tkt.status === 'resolved' ? 'bg-success' : 'bg-secondary'
                      }`}>
                        {tkt.status.replace('_', ' ')}
                      </span>
                    </div>
                    <div className="d-flex justify-content-between text-muted" style={{ fontSize: '0.8rem' }}>
                      <span>Ref: <strong>{tkt.ticket_ref}</strong></span>
                      <span>Category: {tkt.category}</span>
                    </div>
                    <p className="mt-2 text-secondary small text-truncate">{tkt.message}</p>
                    <div className="text-muted mt-2" style={{ fontSize: '0.74rem' }}>
                      Submitted: {new Date(tkt.created_at).toLocaleDateString()}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Support;
