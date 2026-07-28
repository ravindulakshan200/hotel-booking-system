/**
 * pages/admin/AdminReviews.jsx
 * Admin Reviews and Moderation Queue control center.
 * Phase 7C: lists reviews and reported reviews with paginated states, resolves reports, and toggles hide/unhide moderation.
 */

import React, { useEffect, useState } from 'react';
import AdminLayout from '../../layouts/AdminLayout';
import LoadingSpinner from '../../components/LoadingSpinner';
import {
  getAllReviewsAdmin,
  deleteReview,
  getReviewReports,
  moderateReview,
  resolveReport
} from '../../services/adminService';
import Pagination from '../../components/Pagination';

const AdminReviews = () => {
  const [activeTab, setActiveTab] = useState('all'); // 'all' or 'reported'
  const [reviews, setReviews] = useState([]);
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total_pages: 1 });

  const fetchAllReviews = async (page = 1) => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({ page, limit: pagination.limit, paginate: 'true' });
      const response = await getAllReviewsAdmin(params.toString());
      const data = response.data?.data;
      if (data) {
        setReviews(data.items || data.reviews || []);
        setPagination({
          page: data.page || 1,
          limit: data.limit || 10,
          total_pages: data.total_pages || 1,
        });
      }
    } catch (err) {
      setError('Failed to load reviews.');
    } finally {
      setLoading(false);
    }
  };

  const fetchReportsQueue = async (page = 1) => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({ page, limit: pagination.limit, status: 'pending' });
      const response = await getReviewReports(params.toString());
      const data = response.data?.data;
      if (data) {
        setReports(data.items || []);
        setPagination({
          page: data.page,
          limit: data.limit,
          total_pages: data.total_pages,
        });
      }
    } catch (err) {
      setError('Failed to load reported reviews queue.');
    } finally {
      setLoading(false);
    }
  };

  const loadData = (page = 1) => {
    if (activeTab === 'all') {
      fetchAllReviews(page);
    } else {
      fetchReportsQueue(page);
    }
  };

  useEffect(() => {
    loadData(1);
  }, [activeTab]);

  const handleDeleteClick = (id) => {
    setConfirmDeleteId(id);
  };

  const handleConfirmDelete = async (id) => {
    try {
      await deleteReview(id);
      loadData(pagination.page);
      setConfirmDeleteId(null);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete review.');
      setConfirmDeleteId(null);
    }
  };

  const handleModerateToggle = async (id, currentHidden) => {
    try {
      await moderateReview(id, !currentHidden);
      alert(`Review has been ${!currentHidden ? 'hidden' : 'unhidden'}.`);
      loadData(pagination.page);
    } catch (err) {
      alert('Failed to update review visibility.');
    }
  };

  const handleResolve = async (reportId, action) => {
    try {
      await resolveReport(reportId, action);
      alert(`Report resolved with action: ${action}`);
      loadData(pagination.page);
    } catch (err) {
      alert('Failed to resolve report.');
    }
  };

  return (
    <AdminLayout title="Moderate Guest Reviews">
      {error && <div className="alert alert-danger">{error}</div>}

      {/* Tabs */}
      <div className="d-flex gap-2 mb-4 border-bottom pb-2">
        <button
          type="button"
          className={`btn btn-sm rounded-pill ${activeTab === 'all' ? 'btn-primary' : 'btn-outline-primary'}`}
          onClick={() => setActiveTab('all')}
          style={{ padding: '0.4rem 1.2rem' }}
          id="reviews-tab-all"
        >
          All Reviews
        </button>
        <button
          type="button"
          className={`btn btn-sm rounded-pill ${activeTab === 'reported' ? 'btn-primary' : 'btn-outline-primary'}`}
          onClick={() => setActiveTab('reported')}
          style={{ padding: '0.4rem 1.2rem' }}
          id="reviews-tab-reported"
        >
          Reported Reviews Queue
        </button>
      </div>

      {loading ? <LoadingSpinner /> : (
        <div className="card shadow-sm">
          <div className="table-responsive">
            {activeTab === 'all' ? (
              <table className="table table-hover mb-0 align-middle">
                <thead className="table-light">
                  <tr>
                    <th>Hotel</th>
                    <th>Guest</th>
                    <th>Rating</th>
                    <th>Comment</th>
                    <th>Status</th>
                    <th>Date</th>
                    <th className="text-end">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {reviews.length === 0 ? (
                    <tr><td colSpan="7" className="text-center text-muted py-4">No reviews found</td></tr>
                  ) : reviews.map((r) => (
                    <tr key={r.id}>
                      <td><strong>{r.hotel_name}</strong></td>
                      <td>{r.first_name} {r.last_name}</td>
                      <td><span className="star-rating">{'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)}</span></td>
                      <td style={{ maxWidth: '300px' }} className="text-truncate" title={r.comment}>{r.comment || '—'}</td>
                      <td>
                        <span className={`badge bg-${r.is_hidden ? 'danger' : 'success'}`}>
                          {r.is_hidden ? 'Hidden' : 'Visible'}
                        </span>
                      </td>
                      <td>{new Date(r.created_at).toLocaleDateString()}</td>
                      <td className="text-end">
                        <div className="d-flex align-items-center justify-content-end gap-2">
                          <button
                            type="button"
                            className={`btn btn-sm rounded-pill px-3 py-1 ${r.is_hidden ? 'btn-outline-success' : 'btn-outline-warning'}`}
                            onClick={() => handleModerateToggle(r.id, r.is_hidden)}
                            style={{ fontSize: '0.74rem' }}
                          >
                            {r.is_hidden ? 'Unhide' : 'Hide'}
                          </button>
                          {confirmDeleteId === r.id ? (
                            <div className="btn-group">
                              <button className="btn btn-sm btn-danger" onClick={() => handleConfirmDelete(r.id)}>Yes</button>
                              <button className="btn btn-sm btn-secondary" onClick={() => setConfirmDeleteId(null)}>No</button>
                            </div>
                          ) : (
                            <button className="btn btn-sm btn-outline-danger rounded-pill px-3 py-1" onClick={() => handleDeleteClick(r.id)} style={{ fontSize: '0.74rem' }}>Delete</button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <table className="table table-hover mb-0 align-middle">
                <thead className="table-light">
                  <tr>
                    <th>Report Ref</th>
                    <th>Reported Review Info</th>
                    <th>Reporter</th>
                    <th>Reason</th>
                    <th>Date</th>
                    <th className="text-end">Resolve Action</th>
                  </tr>
                </thead>
                <tbody>
                  {reports.length === 0 ? (
                    <tr><td colSpan="6" className="text-center text-muted py-4">No reported reviews pending review</td></tr>
                  ) : reports.map((rep) => (
                    <tr key={rep.id}>
                      <td><strong>#{rep.id}</strong></td>
                      <td>
                        <div className="fw-semibold">Hotel: {rep.hotel_name}</div>
                        <small className="text-muted">Comment: "{rep.comment}"</small>
                        <div>Rating: <span className="star-rating">{'★'.repeat(rep.rating)}</span></div>
                      </td>
                      <td>{rep.reporter_email || 'Anonymous Guest'}</td>
                      <td><span className="text-danger fw-semibold">{rep.reason}</span></td>
                      <td>{new Date(rep.created_at).toLocaleDateString()}</td>
                      <td className="text-end">
                        <div className="d-flex align-items-center justify-content-end gap-2">
                          <button
                            type="button"
                            className="btn btn-sm btn-success rounded-pill px-3 py-1"
                            onClick={() => handleResolve(rep.id, 'keep')}
                            style={{ fontSize: '0.74rem' }}
                          >
                            Keep Review
                          </button>
                          <button
                            type="button"
                            className="btn btn-sm btn-danger rounded-pill px-3 py-1"
                            onClick={() => handleResolve(rep.id, 'hide')}
                            style={{ fontSize: '0.74rem' }}
                          >
                            Hide Review
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* Pagination Controls */}
      {!loading && pagination.total_pages > 1 && (
        <Pagination
          page={pagination.page}
          totalPages={pagination.total_pages}
          onPageChange={(p) => loadData(p)}
        />
      )}
    </AdminLayout>
  );
};

export default AdminReviews;
