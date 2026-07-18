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
    if (path === '/') return location.pathname === '/' ? 'active' : '';
    return location.pathname.startsWith(path) ? 'active' : '';
  };

  return (
    <nav className="navbar navbar-expand-lg navbar-light modern-navbar sticky-top">
      <div className="container py-2">
        <Link className="navbar-brand d-flex align-items-center gap-2" to="/">
          <div className="rounded-circle d-flex align-items-center justify-content-center" style={{ width: '42px', height: '42px', background: 'linear-gradient(135deg, var(--color-accent), var(--color-accent-dark))', boxShadow: '0 10px 24px rgba(212,175,55,0.25)' }}>
            <span style={{ fontSize: '1.2rem' }}>🌴</span>
          </div>
          <div>
            <span className="d-block">Ceylon Stays</span>
            <small className="d-block text-muted" style={{ fontSize: '0.72rem', letterSpacing: '0.18em', textTransform: 'uppercase' }}>Sri Lanka stays</small>
          </div>
        </Link>
        <button
          className="navbar-toggler border-0"
          type="button"
          data-bs-toggle="collapse"
          data-bs-target="#navbarNav"
          aria-controls="navbarNav"
          aria-expanded="false"
          aria-label="Toggle navigation"
        >
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
                  <Link className={`nav-link ${isActive('/my-bookings')}`} to="/my-bookings">
                    My Bookings
                  </Link>
                </li>
                <li className="nav-item">
                  <Link className={`nav-link ${isActive('/my-payments')}`} to="/my-payments">
                    My Payments
                  </Link>
                </li>
                <li className="nav-item">
                  <Link className={`nav-link ${isActive('/favorites')}`} to="/favorites">
                    Favorites
                  </Link>
                </li>
                <li className="nav-item">
                  <Link className={`nav-link ${isActive('/profile')}`} to="/profile">
                    Profile
                  </Link>
                </li>
                {user.role === 'admin' && (
                  <li className="nav-item">
                    <Link className={`nav-link ${isActive('/admin')}`} to="/admin">
                      <i className="bi bi-speedometer2 me-1"></i>Admin
                    </Link>
                  </li>
                )}
              </>
            )}
          </ul>
          <ul className="navbar-nav ms-auto align-items-center gap-2">
            {!user ? (
              <>
                <li className="nav-item">
                  <Link className="btn btn-outline-primary btn-sm px-4 rounded-pill" to="/login">Login</Link>
                </li>
                <li className="nav-item">
                  <Link className="btn btn-accent btn-sm px-4 rounded-pill" to="/register">Register</Link>
                </li>
              </>
            ) : (
              <>
                <li className="nav-item">
                  <span className="navbar-text fw-semibold" style={{ color: 'var(--color-primary)', fontSize: '0.9rem' }}>
                    <i className="bi bi-person-circle me-1"></i>
                    {user.first_name} {user.last_name}
                  </span>
                </li>
                <li className="nav-item">
                  <button className="btn btn-outline-danger btn-sm rounded-pill px-3 fw-bold" onClick={handleLogout}>
                    <i className="bi bi-box-arrow-right me-1"></i>Logout
                  </button>
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
