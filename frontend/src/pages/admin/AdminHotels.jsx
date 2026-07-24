import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import AdminLayout from '../../layouts/AdminLayout';
import LoadingSpinner from '../../components/LoadingSpinner';
import { getAllHotelsAdmin, createHotel, updateHotel, deleteHotel } from '../../services/adminService';

const AVAILABLE_AMENITIES = [
  'Free Wi-Fi', 'Swimming Pool', 'Parking', 'Restaurant',
  'Air Conditioning', 'Airport Transfer', 'Spa', 'Gym'
];

const emptyForm = {
  name: '', address: '', city: '', description: '',
  image_url: '', star_rating: '', amenities: [],
  contact_phone: '', contact_email: '', map_url: '', status: 'active'
};

const AdminHotels = () => {
  const [hotels, setHotels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [form, setForm] = useState(emptyForm);
  const [editId, setEditId] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);

  const fetchHotels = async () => {
    try {
      const response = await getAllHotelsAdmin();
      setHotels(response.data?.data?.hotels || []);
    } catch (err) {
      setError('Failed to load hotels.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchHotels(); }, []);

  useEffect(() => {
    if (showModal) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      const handleEscape = (e) => {
        if (e.key === 'Escape') setShowModal(false);
      };
      document.addEventListener('keydown', handleEscape);
      return () => {
        document.body.style.overflow = originalOverflow;
        document.removeEventListener('keydown', handleEscape);
      };
    }
  }, [showModal]);

  const openCreate = () => {
    setEditId(null);
    setForm(emptyForm);
    setShowModal(true);
  };

  const openEdit = (hotel) => {
    setEditId(hotel.id);
    setForm({
      name: hotel.name || '',
      address: hotel.address || '',
      city: hotel.city || '',
      description: hotel.description || '',
      image_url: hotel.image_url || '',
      star_rating: hotel.star_rating || '',
      amenities: hotel.amenities || [],
      contact_phone: hotel.contact_phone || '',
      contact_email: hotel.contact_email || '',
      map_url: hotel.map_url || '',
      status: hotel.status || 'active'
    });
    setShowModal(true);
  };

  const handleCheckboxChange = (amenity) => {
    setForm((prev) => {
      const isChecked = prev.amenities.includes(amenity);
      if (isChecked) {
        return { ...prev, amenities: prev.amenities.filter(a => a !== amenity) };
      } else {
        return { ...prev, amenities: [...prev.amenities, amenity] };
      }
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');

    // Convert empty string rating to null or number
    const payload = { ...form };
    if (payload.star_rating === '') payload.star_rating = null;

    try {
      if (editId) {
        await updateHotel(editId, payload);
      } else {
        await createHotel(payload);
      }
      setShowModal(false);
      fetchHotels();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save hotel.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteClick = (id) => {
    setConfirmDeleteId(id);
  };

  const handleConfirmDelete = async (id) => {
    try {
      await deleteHotel(id);
      fetchHotels();
      setConfirmDeleteId(null);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete hotel.');
      setConfirmDeleteId(null);
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
                <tr>
                  <th>Image</th>
                  <th>Name</th>
                  <th>City</th>
                  <th>Rating</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {hotels.map((h) => (
                  <tr key={h.id}>
                    <td>
                      {h.image_url ? (
                        <img src={h.image_url} alt={h.name} style={{ width: '50px', height: '50px', objectFit: 'cover', borderRadius: '4px' }} />
                      ) : (
                        <div style={{ width: '50px', height: '50px', backgroundColor: '#e9ecef', borderRadius: '4px' }}></div>
                      )}
                    </td>
                    <td className="fw-semibold">{h.name}</td>
                    <td>{h.city}</td>
                    <td>{h.star_rating ? `${h.star_rating} ⭐` : 'N/A'}</td>
                    <td>
                      <span className={`badge ${h.status === 'active' ? 'bg-success' : 'bg-secondary'}`}>
                        {h.status}
                      </span>
                    </td>
                    <td>
                      <button className="btn btn-sm btn-outline-primary me-2" onClick={() => openEdit(h)}>Edit</button>
                      {confirmDeleteId === h.id ? (
                        <div className="btn-group">
                          <button className="btn btn-sm btn-danger" onClick={() => handleConfirmDelete(h.id)}>Yes, Delete</button>
                          <button className="btn btn-sm btn-secondary" onClick={() => setConfirmDeleteId(null)}>Cancel</button>
                        </div>
                      ) : (
                        <button className="btn btn-sm btn-outline-danger" onClick={() => handleDeleteClick(h.id)}>Delete</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showModal && createPortal(
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)', overflowY: 'auto' }} onClick={() => setShowModal(false)}>
          <div className="modal-dialog modal-lg" onClick={(e) => e.stopPropagation()}>
            <div className="modal-content">
              <form onSubmit={handleSubmit}>
                <div className="modal-header">
                  <h5 className="modal-title">{editId ? 'Edit Hotel' : 'Add Hotel'}</h5>
                  <button type="button" className="btn-close" onClick={() => setShowModal(false)}></button>
                </div>
                <div className="modal-body">

                  <div className="row">
                    {/* Left Column */}
                    <div className="col-md-6">
                      <h6 className="fw-bold mb-3">Basic Information</h6>
                      <div className="mb-3">
                        <label htmlFor="hotel-name" className="form-label">Name <span className="text-danger">*</span></label>
                        <input id="hotel-name" className="form-control" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                      </div>
                      <div className="mb-3">
                        <label htmlFor="hotel-city" className="form-label">City <span className="text-danger">*</span></label>
                        <input id="hotel-city" className="form-control" required value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
                      </div>
                      <div className="mb-3">
                        <label htmlFor="hotel-address" className="form-label">Address <span className="text-danger">*</span></label>
                        <input id="hotel-address" className="form-control" required value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
                      </div>
                      <div className="mb-3">
                        <label htmlFor="hotel-desc" className="form-label">Description <span className="text-danger">*</span></label>
                        <textarea id="hotel-desc" className="form-control" rows="3" required value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
                      </div>

                      <h6 className="fw-bold mb-3 mt-4">Publishing</h6>
                      <div className="mb-3">
                        <label htmlFor="hotel-status" className="form-label">Status</label>
                        <select id="hotel-status" className="form-select" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                          <option value="active">Active (Visible)</option>
                          <option value="inactive">Inactive (Hidden)</option>
                        </select>
                      </div>
                    </div>

                    {/* Right Column */}
                    <div className="col-md-6">
                      <h6 className="fw-bold mb-3">Media</h6>
                      <div className="mb-3">
                        <label htmlFor="hotel-image" className="form-label">Main Image URL <span className="text-danger">*</span></label>
                        <input id="hotel-image" type="url" className="form-control" required value={form.image_url} onChange={(e) => setForm({ ...form, image_url: e.target.value })} placeholder="https://..." />
                        {form.image_url && (
                          <div className="mt-2 text-center border rounded p-1 bg-light">
                            <img
                              src={form.image_url}
                              alt="Preview"
                              style={{ maxHeight: '120px', maxWidth: '100%', objectFit: 'cover' }}
                              onError={(e) => e.target.style.display = 'none'}
                              onLoad={(e) => e.target.style.display = 'inline'}
                            />
                          </div>
                        )}
                      </div>

                      <h6 className="fw-bold mb-3 mt-4">Details</h6>
                      <div className="mb-3">
                        <label htmlFor="hotel-star" className="form-label">Star Rating</label>
                        <select id="hotel-star" className="form-select" value={form.star_rating} onChange={(e) => setForm({ ...form, star_rating: e.target.value })}>
                          <option value="">None</option>
                          <option value="1">1 Star</option>
                          <option value="2">2 Stars</option>
                          <option value="3">3 Stars</option>
                          <option value="4">4 Stars</option>
                          <option value="5">5 Stars</option>
                        </select>
                      </div>
                      <div className="mb-3">
                        <label className="form-label d-block">Amenities</label>
                        <div className="d-flex flex-wrap gap-2">
                          {AVAILABLE_AMENITIES.map((amenity) => (
                            <div className="form-check" key={amenity}>
                              <input
                                className="form-check-input"
                                type="checkbox"
                                id={`amenity-${amenity}`}
                                checked={form.amenities.includes(amenity)}
                                onChange={() => handleCheckboxChange(amenity)}
                              />
                              <label className="form-check-label" htmlFor={`amenity-${amenity}`}>
                                {amenity}
                              </label>
                            </div>
                          ))}
                        </div>
                      </div>

                      <h6 className="fw-bold mb-3 mt-4">Contact & Location</h6>
                      <div className="mb-3">
                        <label htmlFor="hotel-phone" className="form-label">Contact Phone</label>
                        <input id="hotel-phone" className="form-control" type="tel" value={form.contact_phone} onChange={(e) => setForm({ ...form, contact_phone: e.target.value })} />
                      </div>
                      <div className="mb-3">
                        <label htmlFor="hotel-email" className="form-label">Contact Email</label>
                        <input id="hotel-email" className="form-control" type="email" value={form.contact_email} onChange={(e) => setForm({ ...form, contact_email: e.target.value })} />
                      </div>
                      <div className="mb-3">
                        <label htmlFor="hotel-map" className="form-label">Google Maps URL</label>
                        <input id="hotel-map" className="form-control" type="url" value={form.map_url} onChange={(e) => setForm({ ...form, map_url: e.target.value })} placeholder="https://..." />
                      </div>
                    </div>
                  </div>

                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                  <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving...' : 'Save'}</button>
                </div>
              </form>
            </div>
          </div>
        </div>,
        document.body
      )}
    </AdminLayout>
  );
};

export default AdminHotels;
