import React, { useEffect, useState } from 'react';
import AdminLayout from '../layouts/AdminLayout';
import LoadingSpinner from '../components/LoadingSpinner';
import { getDashboardStats } from '../services/adminService';

const AdminDashboard = () => {
  const [stats, setStats] = useState(null);
  const [recentBookings, setRecentBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await getDashboardStats();
        setStats(response.data.stats);
        setRecentBookings(response.data.recentBookings || []);
      } catch (err) {
        setError('Failed to load dashboard data.');
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  if (loading) return <AdminLayout title="Dashboard"><LoadingSpinner /></AdminLayout>;
  if (error) return <AdminLayout title="Dashboard"><div className="alert alert-danger">{error}</div></AdminLayout>;

  const statCards = [
    { label: 'Total Hotels', value: stats.total_hotels, icon: '🏨', color: 'primary' },
    { label: 'Total Rooms', value: stats.total_rooms, icon: '🛏️', color: 'info' },
    { label: 'Customers', value: stats.total_customers, icon: '👥', color: 'success' },
    { label: 'Total Bookings', value: stats.total_bookings, icon: '📋', color: 'warning' },
    { label: 'Confirmed', value: stats.confirmed_bookings, icon: '✅', color: 'success' },
    { label: 'Pending', value: stats.pending_bookings, icon: '⏳', color: 'secondary' },
    { label: 'Revenue', value: `$${parseFloat(stats.total_revenue).toFixed(2)}`, icon: '💰', color: 'accent' },
    { label: 'Reviews', value: stats.total_reviews, icon: '⭐', color: 'primary' },
  ];

  return (
    <AdminLayout title="Dashboard">
      <div className="row g-4 mb-4">
        {statCards.map((card) => (
          <div key={card.label} className="col-md-6 col-lg-3">
            <div className="card stat-card shadow-sm h-100">
              <div className="card-body">
                <div className="d-flex justify-content-between align-items-start">
                  <div>
                    <p className="text-muted small mb-1">{card.label}</p>
                    <h3 className="fw-bold mb-0">{card.value}</h3>
                  </div>
                  <span className="stat-icon">{card.icon}</span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="card shadow-sm">
        <div className="card-header bg-white fw-bold">Recent Bookings</div>
        <div className="card-body p-0">
          <div className="table-responsive">
            <table className="table table-hover mb-0 align-middle">
              <thead className="table-light">
                <tr>
                  <th>ID</th>
                  <th>Guest</th>
                  <th>Hotel</th>
                  <th>Room</th>
                  <th>Check-In</th>
                  <th>Total</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {recentBookings.length === 0 ? (
                  <tr><td colSpan="7" className="text-center text-muted py-4">No bookings yet</td></tr>
                ) : recentBookings.map((b) => (
                  <tr key={b.id}>
                    <td>#{b.id}</td>
                    <td>{b.first_name} {b.last_name}</td>
                    <td>{b.hotel_name}</td>
                    <td>{b.room_number}</td>
                    <td>{new Date(b.check_in).toLocaleDateString()}</td>
                    <td>${b.total_price}</td>
                    <td><span className={`badge bg-${b.booking_status === 'confirmed' ? 'success' : b.booking_status === 'pending' ? 'warning' : 'secondary'}`}>{b.booking_status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminDashboard;
