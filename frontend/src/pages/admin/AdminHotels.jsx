import React, { useEffect, useState } from 'react';
import AdminLayout from '../../layouts/AdminLayout';
import LoadingSpinner from '../../components/LoadingSpinner';
import { getHotels } from '../../services/hotelService';
import { createHotel, updateHotel, deleteHotel } from '../../services/adminService';

const emptyForm = { name: '', address: '', city: '', description: '' };

const AdminHotels = () => {
  const [hotels, setHotels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [form, setForm] = useState(emptyForm);
  const [editId, setEditId] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);

  const fetchHotels = async () => {
    try {
      const response = await getHotels();
      setHotels(response.data?.data?.hotels || []);
    } catch (err) {
      setError('Failed to load hotels.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchHotels(); }, []);

  const openCreate = () => {
    setEditId(null);
    setForm(emptyForm);
    setShowModal(true);
  };

  const openEdit = (hotel) => {
    setEditId(hotel.id);
    setForm({ name: hotel.name, address: hotel.address, city: hotel.city, description: hotel.description || '' });
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      if (editId) {
        await updateHotel(editId, form);
      } else {
        await createHotel(form);
      }
      setShowModal(false);
      fetchHotels();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save hotel.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this hotel? All linked rooms will also be removed.')) return;
    try {
      await deleteHotel(id);
      fetchHotels();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete hotel.');
    }
  };

  return (
    <AdminLayout title="Manage Hotels">
      {error && <div className="alert alert-danger">{error}</div>}
      <div className="d-flex justify-content-end mb-3">
        <button className="btn btn-primary" onClick={openCreate}>+ Add Hotel</button>
      </div>

      {loading ? <LoadingSpinner /> : (
        <div className="card shadow-sm">
          <div className="table-responsive">
            <table className="table table-hover mb-0 align-middle">
              <thead className="table-light">
                <tr><th>Name</th><th>City</th><th>Address</th><th>Actions</th></tr>
              </thead>
              <tbody>
                {hotels.map((h) => (
                  <tr key={h.id}>
                    <td className="fw-semibold">{h.name}</td>
                    <td>{h.city}</td>
                    <td>{h.address}</td>
                    <td>
                      <button className="btn btn-sm btn-outline-primary me-2" onClick={() => openEdit(h)}>Edit</button>
                      <button className="btn btn-sm btn-outline-danger" onClick={() => handleDelete(h.id)}>Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showModal && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog">
            <div className="modal-content">
              <form onSubmit={handleSubmit}>
                <div className="modal-header">
                  <h5 className="modal-title">{editId ? 'Edit Hotel' : 'Add Hotel'}</h5>
                  <button type="button" className="btn-close" onClick={() => setShowModal(false)}></button>
                </div>
                <div className="modal-body">
                  <div className="mb-3">
                    <label className="form-label">Name</label>
                    <input className="form-control" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                  </div>
                  <div className="mb-3">
                    <label className="form-label">City</label>
                    <input className="form-control" required value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
                  </div>
                  <div className="mb-3">
                    <label className="form-label">Address</label>
                    <input className="form-control" required value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
                  </div>
                  <div className="mb-3">
                    <label className="form-label">Description</label>
                    <textarea className="form-control" rows="3" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                  <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving...' : 'Save'}</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
};

export default AdminHotels;
