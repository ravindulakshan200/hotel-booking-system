import React, { useEffect, useState } from 'react';
import AdminLayout from '../../layouts/AdminLayout';
import LoadingSpinner from '../../components/LoadingSpinner';
import { getHotels } from '../../services/hotelService';
import { getAllRooms, createRoom, updateRoom, deleteRoom } from '../../services/adminService';

const emptyForm = {
  hotel_id: '', room_number: '', room_type: 'single',
  price_per_night: '', capacity: 1, availability_status: 'available', image_url: ''
};

const AdminRooms = () => {
  const [rooms, setRooms] = useState([]);
  const [hotels, setHotels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [form, setForm] = useState(emptyForm);
  const [editId, setEditId] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);

  const fetchData = async () => {
    try {
      const [roomsRes, hotelsRes] = await Promise.all([getAllRooms(), getHotels()]);
      setRooms(roomsRes.data.rooms || []);
      setHotels(hotelsRes.data.hotels || []);
    } catch (err) {
      setError('Failed to load rooms.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const getHotelName = (hotelId) => hotels.find((h) => h.id === hotelId)?.name || `#${hotelId}`;

  const openCreate = () => {
    setEditId(null);
    setForm({ ...emptyForm, hotel_id: hotels[0]?.id || '' });
    setShowModal(true);
  };

  const openEdit = (room) => {
    setEditId(room.id);
    setForm({
      hotel_id: room.hotel_id, room_number: room.room_number, room_type: room.room_type,
      price_per_night: room.price_per_night, capacity: room.capacity,
      availability_status: room.availability_status, image_url: room.image_url || ''
    });
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const payload = { ...form, hotel_id: parseInt(form.hotel_id, 10), price_per_night: parseFloat(form.price_per_night), capacity: parseInt(form.capacity, 10) };
      if (editId) {
        await updateRoom(editId, payload);
      } else {
        await createRoom(payload);
      }
      setShowModal(false);
      fetchData();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save room.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this room?')) return;
    try {
      await deleteRoom(id);
      fetchData();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete room.');
    }
  };

  return (
    <AdminLayout title="Manage Rooms">
      {error && <div className="alert alert-danger">{error}</div>}
      <div className="d-flex justify-content-end mb-3">
        <button className="btn btn-primary" onClick={openCreate}>+ Add Room</button>
      </div>

      {loading ? <LoadingSpinner /> : (
        <div className="card shadow-sm">
          <div className="table-responsive">
            <table className="table table-hover mb-0 align-middle">
              <thead className="table-light">
                <tr><th>Hotel</th><th>Room #</th><th>Type</th><th>Price/Night</th><th>Capacity</th><th>Status</th><th>Actions</th></tr>
              </thead>
              <tbody>
                {rooms.map((r) => (
                  <tr key={r.id}>
                    <td>{getHotelName(r.hotel_id)}</td>
                    <td>{r.room_number}</td>
                    <td className="text-capitalize">{r.room_type}</td>
                    <td>${r.price_per_night}</td>
                    <td>{r.capacity}</td>
                    <td><span className={`badge bg-${r.availability_status === 'available' ? 'success' : 'secondary'}`}>{r.availability_status}</span></td>
                    <td>
                      <button className="btn btn-sm btn-outline-primary me-2" onClick={() => openEdit(r)}>Edit</button>
                      <button className="btn btn-sm btn-outline-danger" onClick={() => handleDelete(r.id)}>Delete</button>
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
                  <h5 className="modal-title">{editId ? 'Edit Room' : 'Add Room'}</h5>
                  <button type="button" className="btn-close" onClick={() => setShowModal(false)}></button>
                </div>
                <div className="modal-body">
                  <div className="mb-3">
                    <label className="form-label">Hotel</label>
                    <select className="form-select" required value={form.hotel_id} onChange={(e) => setForm({ ...form, hotel_id: e.target.value })}>
                      {hotels.map((h) => <option key={h.id} value={h.id}>{h.name}</option>)}
                    </select>
                  </div>
                  <div className="row">
                    <div className="col-6 mb-3">
                      <label className="form-label">Room Number</label>
                      <input className="form-control" required value={form.room_number} onChange={(e) => setForm({ ...form, room_number: e.target.value })} />
                    </div>
                    <div className="col-6 mb-3">
                      <label className="form-label">Type</label>
                      <select className="form-select" value={form.room_type} onChange={(e) => setForm({ ...form, room_type: e.target.value })}>
                        <option value="single">Single</option>
                        <option value="double">Double</option>
                        <option value="suite">Suite</option>
                        <option value="deluxe">Deluxe</option>
                      </select>
                    </div>
                  </div>
                  <div className="row">
                    <div className="col-6 mb-3">
                      <label className="form-label">Price/Night ($)</label>
                      <input type="number" step="0.01" min="0" className="form-control" required value={form.price_per_night} onChange={(e) => setForm({ ...form, price_per_night: e.target.value })} />
                    </div>
                    <div className="col-6 mb-3">
                      <label className="form-label">Capacity</label>
                      <input type="number" min="1" className="form-control" required value={form.capacity} onChange={(e) => setForm({ ...form, capacity: e.target.value })} />
                    </div>
                  </div>
                  <div className="mb-3">
                    <label className="form-label">Status</label>
                    <select className="form-select" value={form.availability_status} onChange={(e) => setForm({ ...form, availability_status: e.target.value })}>
                      <option value="available">Available</option>
                      <option value="booked">Booked</option>
                      <option value="maintenance">Maintenance</option>
                    </select>
                  </div>
                  <div className="mb-3">
                    <label className="form-label">Image URL (optional)</label>
                    <input className="form-control" value={form.image_url} onChange={(e) => setForm({ ...form, image_url: e.target.value })} />
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

export default AdminRooms;
