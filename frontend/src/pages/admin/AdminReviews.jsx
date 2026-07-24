import React, { useEffect, useState } from 'react';
import AdminLayout from '../../layouts/AdminLayout';
import LoadingSpinner from '../../components/LoadingSpinner';
import { getAllReviewsAdmin, deleteReview } from '../../services/adminService';

const AdminReviews = () => {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);

  const fetchReviews = async () => {
    try {
      const response = await getAllReviewsAdmin();
      setReviews(response.data?.data?.reviews || []);
    } catch (err) {
      setError('Failed to load reviews.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchReviews(); }, []);

  const handleDeleteClick = (id) => {
    setConfirmDeleteId(id);
  };

  const handleConfirmDelete = async (id) => {
    try {
      await deleteReview(id);
      fetchReviews();
      setConfirmDeleteId(null);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete review.');
      setConfirmDeleteId(null);
    }
  };

  return (
    <AdminLayout title="Manage Reviews">
      {error && <div className="alert alert-danger">{error}</div>}

      {loading ? <LoadingSpinner /> : (
        <div className="card shadow-sm">
          <div className="table-responsive">
            <table className="table table-hover mb-0 align-middle">
              <thead className="table-light">
                <tr><th>Hotel</th><th>Guest</th><th>Rating</th><th>Comment</th><th>Date</th><th>Action</th></tr>
              </thead>
              <tbody>
                {reviews.length === 0 ? (
                  <tr><td colSpan="6" className="text-center text-muted py-4">No reviews found</td></tr>
                ) : reviews.map((r) => (
                  <tr key={r.id}>
                    <td>{r.hotel_name}</td>
                    <td>{r.first_name} {r.last_name}</td>
                    <td>{'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)}</td>
                    <td>{r.comment || '—'}</td>
                    <td>{new Date(r.created_at).toLocaleDateString()}</td>
                    <td>
                      {confirmDeleteId === r.id ? (
                        <div className="btn-group">
                          <button className="btn btn-sm btn-danger" onClick={() => handleConfirmDelete(r.id)}>Yes</button>
                          <button className="btn btn-sm btn-secondary" onClick={() => setConfirmDeleteId(null)}>No</button>
                        </div>
                      ) : (
                        <button className="btn btn-sm btn-outline-danger" onClick={() => handleDeleteClick(r.id)}>Delete</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </AdminLayout>
  );
};

export default AdminReviews;
