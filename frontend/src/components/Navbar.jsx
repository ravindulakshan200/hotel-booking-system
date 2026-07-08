import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Navbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const isActive = (path) => {
    return location.pathname === path ? 'active' : '';
  };

  return (
    <nav className="navbar navbar-expand-lg navbar-light modern-navbar sticky-top">
      <div className="container">
        <Link className="navbar-brand" to="/">Hotel Booking System</Link>
        <button className="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbarNav">
          <span className="navbar-toggler-icon"></span>
        </button>
        <div className="collapse navbar-collapse" id="navbarNav">
          <ul className="navbar-nav me-auto">
            <li className="nav-item">
              <Link className={`nav-link ${isActive('/')}`} to="/">Home</Link>
            </li>
            <li className="nav-item">
              <Link className={`nav-link ${isActive('/hotels')}`} to="/hotels">Hotels</Link>
            </li>
            {user && (
              <>
                <li className="nav-item">
                  <Link className={`nav-link ${isActive('/my-bookings')}`} to="/my-bookings">My Bookings</Link>
                </li>
                {user.role === 'admin' && (
                  <li className="nav-item">
                    <Link className={`nav-link ${isActive('/admin')}`} to="/admin">Admin</Link>
                  </li>
                )}
              </>
            )}
          </ul>
          <ul className="navbar-nav ms-auto align-items-center">
            {!user ? (
              <>
                <li className="nav-item me-2">
                  <Link className="btn btn-outline-primary px-4" to="/login">Login</Link>
                </li>
                <li className="nav-item">
                  <Link className="btn btn-accent px-4" to="/register">Register</Link>
                </li>
              </>
            ) : (
              <>
                <li className="nav-item me-3">
                  <span className="navbar-text fw-bold" style={{ color: 'var(--color-primary)' }}>
                    Hello, {user.first_name}
                  </span>
                </li>
                <li className="nav-item">
                  <button className="btn btn-outline-danger btn-sm rounded-pill px-3 fw-bold" onClick={handleLogout}>Logout</button>
                </li>
              </>
            )}
          </ul>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
