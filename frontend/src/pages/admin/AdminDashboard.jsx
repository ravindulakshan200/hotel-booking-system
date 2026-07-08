import React, { useEffect, useState } from 'react';
import AdminLayout from '../../layouts/AdminLayout';
import LoadingSpinner from '../../components/LoadingSpinner';
import { getDashboardStats } from '../../services/adminService';
import { formatCurrency } from '../../utils/formatters';

const AdminDashboard = () => {
  const [stats, setStats] = useState(null);
  const [recentBookings, setRecentBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await getDashboardStats();
        setStats(response.data?.data?.stats);
        setRecentBookings(response.data?.data?.recentBookings || []);
      } catch (err) {
        setError('Failed to load dashboard data.');
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  if (loading) return <AdminLayout title="Dashboard Overview"><div className="py-5"><LoadingSpinner /></div></AdminLayout>;
  if (error) return <AdminLayout title="Dashboard Overview"><div className="alert alert-danger glass-card p-4"><i className="bi bi-exclamation-triangle-fill me-2"></i>{error}</div></AdminLayout>;

  const statCards = [
    { label: 'Total Hotels', value: stats.total_hotels, icon: 'bi-building', color: 'primary' },
    { label: 'Total Rooms', value: stats.total_rooms, icon: 'bi-door-open', color: 'info' },
    { label: 'Customers', value: stats.total_customers, icon: 'bi-people', color: 'success' },
    { label: 'Total Bookings', value: stats.total_bookings, icon: 'bi-calendar-check', color: 'warning' },
    { label: 'Confirmed', value: stats.confirmed_bookings, icon: 'bi-check-circle', color: 'success' },
    { label: 'Pending', value: stats.pending_bookings, icon: 'bi-hourglass-split', color: 'secondary' },
    { label: 'Revenue', value: formatCurrency(stats.total_revenue), icon: 'bi-cash-coin', color: 'accent' },
    { label: 'Reviews', value: stats.total_reviews, icon: 'bi-star', color: 'primary' },
  ];

  return (
    <AdminLayout title="Dashboard Overview">
      <div className="row g-4 mb-5">
        {statCards.map((card, index) => (
          <div key={card.label} className="col-md-6 col-lg-3 slide-up" style={{ animationDelay: `${index * 50}ms` }}>
            <div className={`modern-card hover-lift h-100 border-0`} style={{ borderLeft: `4px solid var(--color-${card.color})` }}>
              <div className="card-body p-4">
                <div className="d-flex justify-content-between align-items-center mb-3">
                  <p className="text-muted fw-bold text-uppercase mb-0" style={{ fontSize: '0.8rem', letterSpacing: '0.5px' }}>{card.label}</p>
                  <div className={`bg-light text-${card.color} rounded d-flex align-items-center justify-content-center`} style={{ width: '40px', height: '40px' }}>
                    <i className={`bi ${card.icon} fs-5`}></i>
                  </div>
                </div>
                <h2 className="font-serif fw-bold mb-0 text-dark">{card.value}</h2>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="modern-card border-0 slide-up delay-200">
        <div className="card-header bg-white border-bottom py-3 d-flex justify-content-between align-items-center">
          <h5 className="font-serif fw-bold text-primary mb-0">Recent Bookings</h5>
        </div>
        <div className="card-body p-0">
          <div className="table-responsive">
            <table className="table table-hover mb-0 align-middle">
              <thead className="bg-light text-muted">
                <tr>
                  <th className="py-3 ps-4 border-bottom-0 text-uppercase" style={{ fontSize: '0.8rem' }}>ID</th>
                  <th className="py-3 border-bottom-0 text-uppercase" style={{ fontSize: '0.8rem' }}>Guest</th>
                  <th className="py-3 border-bottom-0 text-uppercase" style={{ fontSize: '0.8rem' }}>Hotel / Room</th>
                  <th className="py-3 border-bottom-0 text-uppercase" style={{ fontSize: '0.8rem' }}>Check-In</th>
                  <th className="py-3 border-bottom-0 text-uppercase" style={{ fontSize: '0.8rem' }}>Total</th>
                  <th className="py-3 pe-4 border-bottom-0 text-uppercase" style={{ fontSize: '0.8rem' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {recentBookings.length === 0 ? (
                  <tr><td colSpan="6" className="text-center text-muted py-5">No recent bookings</td></tr>
                ) : recentBookings.map((b) => (
                  <tr key={b.id}>
                    <td className="ps-4 py-3 text-muted">#{b.id}</td>
                    <td className="py-3 fw-bold">{b.first_name} {b.last_name}</td>
                    <td className="py-3">
                      <span className="d-block text-primary">{b.hotel_name}</span>
                      <small className="text-muted">Room {b.room_number}</small>
                    </td>
                    <td className="py-3 text-muted">{new Date(b.check_in).toLocaleDateString()}</td>
                    <td className="py-3 fw-bold">{formatCurrency(b.total_price)}</td>
                    <td className="pe-4 py-3">
                      <span className={`status-badge ${b.booking_status === 'confirmed' ? 'success' : b.booking_status === 'pending' ? 'warning' : 'info'}`}>
                        {b.booking_status}
                      </span>
                    </td>
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
