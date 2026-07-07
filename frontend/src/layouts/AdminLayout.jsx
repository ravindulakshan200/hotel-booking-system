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
    `admin-nav-link list-group-item list-group-item-action ${isActive ? 'active' : ''}`;

  return (
    <div className="admin-layout">
      <div className="container-fluid">
        <div className="row">
          <aside className="col-lg-2 col-md-3 admin-sidebar p-0">
            <div className="p-4 border-bottom border-secondary">
              <Link to="/" className="text-white text-decoration-none fw-bold">
                🏨 Admin Panel
              </Link>
              <p className="text-white-50 small mb-0 mt-1">{user?.first_name} {user?.last_name}</p>
            </div>
            <nav className="list-group list-group-flush">
              <NavLink to="/admin" end className={navLinkClass}>Dashboard</NavLink>
              <NavLink to="/admin/hotels" className={navLinkClass}>Hotels</NavLink>
              <NavLink to="/admin/rooms" className={navLinkClass}>Rooms</NavLink>
              <NavLink to="/admin/bookings" className={navLinkClass}>Bookings</NavLink>
              <NavLink to="/admin/users" className={navLinkClass}>Customers</NavLink>
              <NavLink to="/admin/payments" className={navLinkClass}>Payments</NavLink>
              <NavLink to="/admin/reviews" className={navLinkClass}>Reviews</NavLink>
            </nav>
            <div className="p-3 mt-3">
              <Link to="/" className="btn btn-outline-light btn-sm w-100 mb-2">View Site</Link>
              <button className="btn btn-danger btn-sm w-100" onClick={handleLogout}>Logout</button>
            </div>
          </aside>
          <main className="col-lg-10 col-md-9 admin-main">
            {title && <h2 className="fw-bold mb-4">{title}</h2>}
            {children}
          </main>
        </div>
      </div>
    </div>
  );
};

export default AdminLayout;
