import React, { useEffect, useState } from 'react';
import AdminLayout from '../../layouts/AdminLayout';
import LoadingSpinner from '../../components/LoadingSpinner';
import { getDashboardStats } from '../../services/adminService';
import { formatCurrency } from '../../utils/formatters';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';

const COLORS = ['#0d6efd', '#198754', '#ffc107', '#dc3545', '#0dcaf0'];

const AdminDashboard = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [period, setPeriod] = useState('30days');

  const fetchStats = async (selectedPeriod) => {
    setLoading(true);
    setError('');
    try {
      const response = await getDashboardStats(selectedPeriod);
      setData(response.data?.data);
    } catch (err) {
      setError('Failed to load dashboard data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats(period);
  }, [period]);

  const handlePeriodChange = (e) => {
    setPeriod(e.target.value);
  };

  if (loading && !data) return <AdminLayout title="Dashboard Overview"><div className="py-5"><LoadingSpinner /></div></AdminLayout>;

  return (
    <AdminLayout title="Dashboard Overview">
      {/* Header & Period Selector */}
      <div className="d-flex flex-wrap justify-content-between align-items-center mb-4 gap-3">
        <h4 className="mb-0">Admin Analytics</h4>
        <div className="d-flex gap-3 align-items-center">
          <label htmlFor="periodSelect" className="visually-hidden">Select Period</label>
          <select id="periodSelect" className="form-select bg-white border-0 shadow-sm" value={period} onChange={handlePeriodChange} style={{ minWidth: '150px' }}>
            <option value="7days">Last 7 Days</option>
            <option value="30days">Last 30 Days</option>
            <option value="6months">Last 6 Months</option>
            <option value="12months">Last 12 Months</option>
            <option value="all">All Time</option>
          </select>
          <button className="btn btn-primary shadow-sm" onClick={() => fetchStats(period)} disabled={loading}>
            <i className={`bi bi-arrow-clockwise ${loading ? 'spin' : ''}`}></i> Refresh
          </button>
        </div>
      </div>

      {error && (
        <div className="alert alert-danger glass-card p-4 d-flex justify-content-between align-items-center">
          <div><i className="bi bi-exclamation-triangle-fill me-2"></i>{error}</div>
          <button className="btn btn-outline-danger btn-sm" onClick={() => fetchStats(period)}>Retry</button>
        </div>
      )}

      {data && (
        <>
          {/* KPI Cards */}
          <div className="row g-4 mb-5">
            <KpiCard label="Period Revenue" value={formatCurrency(data.overview.period_revenue)} icon="bi-cash-coin" color="accent" />
            <KpiCard label="Total Bookings" value={data.overview.total_bookings} icon="bi-calendar-check" color="primary" />
            <KpiCard label="Confirmed Bookings" value={data.overview.confirmed_bookings} icon="bi-check-circle" color="success" />
            <KpiCard label="Occupancy Rate" value={`${Math.round(data.overview.occupancy_rate || 0)}%`} icon="bi-percent" color="info" />
            <KpiCard label="Total Users" value={data.overview.total_users} icon="bi-people" color="warning" />
            <KpiCard label="Total Rooms" value={data.overview.total_rooms} icon="bi-door-open" color="secondary" />
          </div>

          {/* Charts */}
          <div className="row g-4 mb-5">
            <div className="col-lg-8">
              <div className="modern-card border-0 h-100 p-4">
                <h5 className="font-serif fw-bold text-primary mb-4">Revenue & Bookings Trend</h5>
                <div style={{ height: '300px' }}>
                  {data.charts?.bookingTrend?.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={data.charts.bookingTrend} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eee" />
                        <XAxis dataKey="label" tick={{ fill: '#6c757d' }} axisLine={false} tickLine={false} />
                        <YAxis yAxisId="left" tick={{ fill: '#6c757d' }} axisLine={false} tickLine={false} tickFormatter={(value) => value > 1000 ? `${value / 1000}k` : value} />
                        <YAxis yAxisId="right" orientation="right" tick={{ fill: '#6c757d' }} axisLine={false} tickLine={false} />
                        <Tooltip contentStyle={{ borderRadius: '10px', border: 'none', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }} />
                        <Legend />
                        <Line yAxisId="left" type="monotone" dataKey="revenue" name="Revenue (LKR)" stroke="#0d6efd" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                        <Line yAxisId="right" type="monotone" dataKey="bookings" name="Bookings" stroke="#198754" strokeWidth={3} dot={{ r: 4 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  ) : (
                    <EmptyState message="No trend data for this period" />
                  )}
                </div>
              </div>
            </div>

            <div className="col-lg-4">
              <div className="modern-card border-0 h-100 p-4">
                <h5 className="font-serif fw-bold text-primary mb-4">Booking Status</h5>
                <div style={{ height: '300px' }}>
                  {data.charts?.statusBreakdown?.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={data.charts.statusBreakdown}
                          cx="50%" cy="50%"
                          innerRadius={60} outerRadius={80}
                          paddingAngle={5}
                          dataKey="value"
                        >
                          {data.charts.statusBreakdown.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <EmptyState message="No status data available" />
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="row g-4 mb-5">
            <div className="col-12">
              <div className="modern-card border-0 h-100 p-4">
                <h5 className="font-serif fw-bold text-primary mb-4">Popular Hotels</h5>
                <div style={{ height: '300px' }}>
                  {data.charts?.popularHotels?.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={data.charts.popularHotels} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eee" />
                        <XAxis dataKey="name" tick={{ fill: '#6c757d' }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fill: '#6c757d' }} axisLine={false} tickLine={false} allowDecimals={false} />
                        <Tooltip cursor={{ fill: '#f8f9fa' }} contentStyle={{ borderRadius: '10px', border: 'none', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }} />
                        <Bar dataKey="bookings" name="Valid Bookings" fill="#ffc107" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <EmptyState message="No popular hotels data available" />
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Recent Bookings */}
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
                    {!data.recentBookings || data.recentBookings.length === 0 ? (
                      <tr><td colSpan="6" className="text-center text-muted py-5">No recent bookings</td></tr>
                    ) : data.recentBookings.map((b) => (
                      <tr key={b.id}>
                        <td className="ps-4 py-3 text-muted">#{b.id}</td>
                        <td className="py-3 fw-bold">{b.guest_name}</td>
                        <td className="py-3">
                          <span className="d-block text-primary">{b.hotel_name}</span>
                          <small className="text-muted">Room {b.room_number}</small>
                        </td>
                        <td className="py-3 text-muted">{new Date(b.check_in).toLocaleDateString()}</td>
                        <td className="py-3 fw-bold">{formatCurrency(b.total_price)}</td>
                        <td className="pe-4 py-3">
                          <span className={`status-badge ${b.status === 'confirmed' ? 'success' : b.status === 'pending' ? 'warning' : 'info'}`}>
                            {b.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </>
      )}
    </AdminLayout>
  );
};

const KpiCard = ({ label, value, icon, color }) => (
  <div className="col-md-6 col-lg-4 slide-up">
    <div className={`modern-card hover-lift h-100 border-0`} style={{ borderLeft: `4px solid var(--color-${color})` }}>
      <div className="card-body p-4">
        <div className="d-flex justify-content-between align-items-center mb-3">
          <p className="text-muted fw-bold text-uppercase mb-0" style={{ fontSize: '0.8rem', letterSpacing: '0.5px' }}>{label}</p>
          <div className={`bg-light text-${color} rounded d-flex align-items-center justify-content-center`} style={{ width: '40px', height: '40px' }}>
            <i className={`bi ${icon} fs-5`}></i>
          </div>
        </div>
        <h2 className="font-serif fw-bold mb-0 text-dark">{value}</h2>
      </div>
    </div>
  </div>
);

const EmptyState = ({ message }) => (
  <div className="d-flex flex-column align-items-center justify-content-center h-100 text-muted">
    <i className="bi bi-inbox fs-2 mb-2" style={{ color: '#dee2e6' }}></i>
    <p>{message}</p>
  </div>
);

export default AdminDashboard;
