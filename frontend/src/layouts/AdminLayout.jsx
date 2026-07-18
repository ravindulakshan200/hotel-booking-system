import React from 'react';
import { NavLink, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const AdminLayout = ({ children, title }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navLinkClass = ({ isActive }) =>
    `nav-link ${isActive ? 'active' : ''}`;

  return (
    <div className="admin-layout fade-in">
      <aside className="admin-sidebar sticky-top h-100" style={{ maxHeight: '100vh', overflowY: 'auto' }}>
        <div className="mb-5 text-center px-3">
          <Link to="/" className="text-white text-decoration-none d-flex flex-column align-items-center">
            <div className="bg-accent rounded-circle d-flex align-items-center justify-content-center mb-3 shadow-sm" style={{ width: '60px', height: '60px' }}>
              <span className="fs-3">🏨</span>
            </div>
            <h4 className="font-serif fw-bold mb-0">Admin Portal</h4>
          </Link>
          <p className="text-white opacity-75 small mt-2 mb-0">Welcome, {user?.first_name}</p>
        </div>

        <nav className="d-flex flex-column gap-2 mb-auto">
          <NavLink to="/admin" end className={navLinkClass}><i className="bi bi-speedometer2 text-accent"></i> Dashboard</NavLink>
          <NavLink to="/admin/hotels" className={navLinkClass}><i className="bi bi-building text-accent"></i> Hotels</NavLink>
          <NavLink to="/admin/rooms" className={navLinkClass}><i className="bi bi-door-open text-accent"></i> Rooms</NavLink>
          <NavLink to="/admin/bookings" className={navLinkClass}><i className="bi bi-calendar-check text-accent"></i> Bookings</NavLink>
          <NavLink to="/admin/users" className={navLinkClass}><i className="bi bi-people text-accent"></i> Customers</NavLink>
          <NavLink to="/admin/payments" className={navLinkClass}><i className="bi bi-credit-card text-accent"></i> Payments</NavLink>
          <NavLink to="/admin/reviews" className={navLinkClass}><i className="bi bi-star text-accent"></i> Reviews</NavLink>
        </nav>

        <div className="mt-5 pt-4 border-top border-secondary">
          <Link to="/" className="btn btn-outline-light w-100 mb-3 rounded-pill">View Public Site</Link>
          <button className="btn btn-danger w-100 rounded-pill" onClick={handleLogout}>Log Out</button>
        </div>
      </aside>

      <main className="admin-content bg-light">
        <div className="container-fluid py-2">
          {title && (
            <div className="d-flex justify-content-between align-items-center mb-4 pb-3 border-bottom">
              <h2 className="font-serif fw-bold text-primary mb-0">{title}</h2>
              <div className="d-flex align-items-center bg-white px-4 py-2 rounded-pill shadow-sm">
                <span className="text-muted fw-bold me-2">{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}</span>
                <i className="bi bi-calendar3 text-primary"></i>
              </div>
            </div>
          )}
          <div className="premium-card p-3 p-md-4">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
};

export default AdminLayout;
