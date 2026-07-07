import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Navbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <nav className="navbar navbar-expand-lg navbar-dark bg-primary">
      <div className="container">
        <Link className="navbar-brand" to="/">Hotel Booking System</Link>
        <button className="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbarNav">
          <span className="navbar-toggler-icon"></span>
        </button>
        <div className="collapse navbar-collapse" id="navbarNav">
          <ul className="navbar-nav me-auto">
            <li className="nav-item">
              <Link className="nav-link" to="/">Home</Link>
            </li>
            <li className="nav-item">
              <Link className="nav-link" to="/hotels">Hotels</Link>
            </li>
            {user && (
              <>
                <li className="nav-item">
                  <Link className="nav-link" to="/my-bookings">My Bookings</Link>
                </li>
                {user.role === 'admin' && (
                  <li className="nav-item">
                    <Link className="nav-link" to="/admin">Admin</Link>
                  </li>
                )}
              </>
            )}
          </ul>
          <ul className="navbar-nav ms-auto align-items-center">
            {!user ? (
              <>
                <li className="nav-item me-2">
                  <Link className="btn btn-outline-light" to="/login">Login</Link>
                </li>
                <li className="nav-item">
                  <Link className="btn btn-light text-primary" to="/register">Register</Link>
                </li>
              </>
            ) : (
              <>
                <li className="nav-item me-3">
                  <span className="navbar-text text-white">Hello, {user.first_name}</span>
                </li>
                <li className="nav-item">
                  <button className="btn btn-danger btn-sm" onClick={handleLogout}>Logout</button>
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
