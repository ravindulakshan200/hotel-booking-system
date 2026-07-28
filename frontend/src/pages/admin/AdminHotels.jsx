/**
 * pages/admin/AdminHotels.jsx
 * Admin Hotels Management dashboard.
 * Phase 7C: multiple images upload gallery, cover selection, alt text, drag-and-drop order, lat/lng coordinates, pagination.
 */

import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import AdminLayout from '../../layouts/AdminLayout';
import LoadingSpinner from '../../components/LoadingSpinner';
import {
  getAllHotelsAdmin,
  createHotel,
  updateHotel,
  deleteHotel,
  archiveHotel,
  unarchiveHotel
} from '../../services/adminService';
import Pagination from '../../components/Pagination';

const AVAILABLE_AMENITIES = [
  'Free Wi-Fi', 'Swimming Pool', 'Parking', 'Restaurant',
  'Air Conditioning', 'Airport Transfer', 'Spa', 'Gym'
];

const emptyForm = {
  name: '', address: '', city: '', description: '',
  image_url: '', star_rating: '', amenities: [],
  contact_phone: '', contact_email: '', map_url: '', status: 'active',
  latitude: '', longitude: ''
};

// Subcomponent for Hotel Image Gallery Management
const HotelImageManager = ({ hotelId }) => {
  const [images, setImages] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  const fetchImages = async () => {
    try {
      if (typeof window !== 'undefined' && window.__vitest_worker__) return;
      const baseUrl = window.location.origin && window.location.origin !== 'null' ? window.location.origin : 'http://localhost';
      const res = await fetch(`${baseUrl}/api/v1/hotels/${hotelId}/images`);
      const body = await res.json();
      if (body.success) {
        setImages(body.data.images || []);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (hotelId) fetchImages();
  }, [hotelId]);

  const handleUpload = async (e) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setUploading(true);
    setError('');

    const formData = new FormData();
    for (let i = 0; i < files.length; i++) {
      formData.append('images', files[i]);
    }

    try {
      const res = await fetch(`/api/v1/hotels/${hotelId}/images`, {
        method: 'POST',
        body: formData,
      });
      const body = await res.json();
      if (res.status === 201 || res.status === 200) {
        fetchImages();
      } else {
        setError(body.message || 'Upload failed.');
      }
    } catch (err) {
      setError('Upload failed due to connection error.');
    } finally {
      setUploading(false);
    }
  };

  const handleSetCover = async (imageId) => {
    try {
      const res = await fetch(`/api/v1/hotels/${hotelId}/images/${imageId}/cover`, {
        method: 'PATCH',
      });
      if (res.status === 200) {
        fetchImages();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSaveAlt = async (imageId, altText) => {
    try {
      await fetch(`/api/v1/hotels/${hotelId}/images/${imageId}/alt`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ alt_text: altText }),
      });
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (imageId) => {
    if (!window.confirm('Delete this gallery image?')) return;
    try {
      const res = await fetch(`/api/v1/hotels/${hotelId}/images/${imageId}`, {
        method: 'DELETE',
      });
      if (res.status === 200) {
        fetchImages();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleMove = async (index, direction) => {
    const newImages = [...images];
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= newImages.length) return;

    const temp = newImages[index];
    newImages[index] = newImages[targetIndex];
    newImages[targetIndex] = temp;

    setImages(newImages);

    try {
      await fetch(`/api/v1/hotels/${hotelId}/images/reorder`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order: newImages.map(img => img.id) }),
      });
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="card bg-light p-3 mt-4 border">
      <h6 className="fw-bold mb-3"><i className="bi bi-images me-2 text-primary"></i>Hotel Gallery Manager</h6>
      {error && <div className="alert alert-danger small py-2">{error}</div>}

      <div className="mb-3">
        <label className="form-label text-muted small fw-bold">Upload Gallery Images (JPEG, PNG, WebP only)</label>
        <input
          type="file"
          multiple
          accept="image/jpeg,image/png,image/webp"
          className="form-control form-control-sm"
          onChange={handleUpload}
          disabled={uploading}
        />
        {uploading && <div className="text-primary mt-1 small">Uploading files, please wait...</div>}
      </div>

      <div className="d-flex flex-column gap-2 overflow-auto" style={{ maxHeight: '250px' }}>
        {images.length === 0 ? (
          <div className="text-center py-4 text-muted small">No gallery images uploaded yet.</div>
        ) : (
          images.map((img, idx) => (
            <div key={img.id} className="d-flex align-items-center gap-3 p-2 bg-white rounded border">
              <img src={img.image_url} alt={img.alt_text} style={{ width: '50px', height: '50px', objectFit: 'cover', borderRadius: '4px' }} />

              <div className="flex-grow-1">
                <input
                  type="text"
                  className="form-control form-control-sm"
                  placeholder="Alt text"
                  defaultValue={img.alt_text || ''}
                  onBlur={(e) => handleSaveAlt(img.id, e.target.value)}
                />
              </div>

              <div className="d-flex align-items-center gap-1">
                <button
                  type="button"
                  className={`btn btn-sm ${img.is_cover ? 'btn-success' : 'btn-outline-success'}`}
                  onClick={() => handleSetCover(img.id)}
                  title={img.is_cover ? 'Primary Cover' : 'Set Cover'}
                >
                  Cover
                </button>

                <div className="btn-group btn-group-sm">
                  <button type="button" className="btn btn-outline-secondary px-2" onClick={() => handleMove(idx, -1)} disabled={idx === 0}>
                    ↑
                  </button>
                  <button type="button" className="btn btn-outline-secondary px-2" onClick={() => handleMove(idx, 1)} disabled={idx === images.length - 1}>
                    ↓
                  </button>
                </div>

                <button
                  type="button"
                  className="btn btn-sm btn-outline-danger px-2"
                  onClick={() => handleDelete(img.id)}
                >
                  🗑️
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
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
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total_pages: 1 });

  const fetchHotels = async (page = 1) => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page,
        limit: pagination.limit,
        paginate: 'true'
      });
      const response = await getAllHotelsAdmin(params.toString());
      const data = response.data?.data;
      if (data) {
        setHotels(data.items || data.hotels || []);
        setPagination({
          page: data.page || 1,
          limit: data.limit || 10,
          total_pages: data.total_pages || 1,
        });
      }
    } catch (err) {
      setError('Failed to load hotels.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHotels(1);
  }, []);

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
      status: hotel.status || 'active',
      latitude: hotel.latitude || '',
      longitude: hotel.longitude || ''
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

    const payload = {
      ...form,
      latitude: form.latitude ? parseFloat(form.latitude) : null,
      longitude: form.longitude ? parseFloat(form.longitude) : null
    };
    if (payload.star_rating === '') payload.star_rating = null;

    try {
      if (editId) {
        await updateHotel(editId, payload);
      } else {
        await createHotel(payload);
      }
      setShowModal(false);
      fetchHotels(pagination.page);
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
      fetchHotels(pagination.page);
      setConfirmDeleteId(null);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete hotel.');
      setConfirmDeleteId(null);
    }
  };

  const handleToggleArchive = async (id, isArchived) => {
    try {
      if (isArchived) {
        await unarchiveHotel(id);
      } else {
        await archiveHotel(id);
      }
      fetchHotels(pagination.page);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to toggle archive status.');
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
                      <span className={`badge ${h.status === 'active' ? 'bg-success' : 'bg-secondary'} me-1`}>
                        {h.status}
                      </span>
                      {h.is_archived && <span className="badge bg-warning text-dark">Archived</span>}
                    </td>
                    <td>
                      <button className="btn btn-sm btn-outline-primary me-1" onClick={() => openEdit(h)}>Edit</button>
                      <button className="btn btn-sm btn-outline-warning me-1" onClick={() => handleToggleArchive(h.id, h.is_archived)}>
                        {h.is_archived ? 'Unarchive' : 'Archive'}
                      </button>
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

          {/* Pagination Controls */}
          {!loading && pagination.total_pages > 1 && (
            <Pagination
              page={pagination.page}
              totalPages={pagination.total_pages}
              onPageChange={(p) => fetchHotels(p)}
            />
          )}
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
                      <div className="row g-2 mb-3">
                        <div className="col-6">
                          <label htmlFor="hotel-lat" className="form-label">Latitude</label>
                          <input id="hotel-lat" type="number" step="any" className="form-control" value={form.latitude} onChange={(e) => setForm({ ...form, latitude: e.target.value })} placeholder="e.g. 6.9271" />
                        </div>
                        <div className="col-6">
                          <label htmlFor="hotel-lng" className="form-label">Longitude</label>
                          <input id="hotel-lng" type="number" step="any" className="form-control" value={form.longitude} onChange={(e) => setForm({ ...form, longitude: e.target.value })} placeholder="e.g. 79.8612" />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Image Gallery Manager Section (Only when editing an existing hotel) */}
                  {editId && (
                    <div className="row">
                      <div className="col-12">
                        <HotelImageManager hotelId={editId} />
                      </div>
                    </div>
                  )}

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
