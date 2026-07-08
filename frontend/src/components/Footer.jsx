import React from 'react';
import { Link } from 'react-router-dom';

const Footer = () => (
  <footer className="site-footer mt-auto">
    <div className="container py-5">
      <div className="row g-4">
        <div className="col-lg-4 col-md-6">
          <h5 className="fw-bold text-white mb-3 font-serif">
            🌴 Ceylon Stays
          </h5>
          <p className="text-white-50" style={{ lineHeight: '1.8' }}>
            Your premier platform for discovering and booking luxury hotel stays across the beautiful island of Sri Lanka. From coastal resorts to mountain retreats.
          </p>
          <div className="d-flex gap-3 mt-3">
            <a href="https://github.com/ravindulakshan200/hotel-booking-system" target="_blank" rel="noreferrer" className="text-white-50 text-decoration-none" style={{ transition: 'color 0.2s' }}>
              <i className="bi bi-github fs-5"></i>
            </a>
            <a href="#!" className="text-white-50 text-decoration-none">
              <i className="bi bi-linkedin fs-5"></i>
            </a>
            <a href="#!" className="text-white-50 text-decoration-none">
              <i className="bi bi-envelope-fill fs-5"></i>
            </a>
          </div>
        </div>
        <div className="col-lg-2 col-md-3 col-6">
          <h6 className="text-white fw-bold mb-3">Explore</h6>
          <ul className="list-unstyled footer-links">
            <li><Link to="/">Home</Link></li>
            <li><Link to="/hotels">All Hotels</Link></li>
            <li><Link to="/my-bookings">My Bookings</Link></li>
          </ul>
        </div>
        <div className="col-lg-2 col-md-3 col-6">
          <h6 className="text-white fw-bold mb-3">Destinations</h6>
          <ul className="list-unstyled footer-links">
            <li><Link to="/hotels?city=Colombo">Colombo</Link></li>
            <li><Link to="/hotels?city=Kandy">Kandy</Link></li>
            <li><Link to="/hotels?city=Galle">Galle</Link></li>
            <li><Link to="/hotels?city=Ella">Ella</Link></li>
            <li><Link to="/hotels?city=Sigiriya">Sigiriya</Link></li>
          </ul>
        </div>
        <div className="col-lg-4 col-md-6">
          <h6 className="text-white fw-bold mb-3">Contact & Demo</h6>
          <ul className="list-unstyled footer-links mb-3">
            <li><i className="bi bi-geo-alt-fill me-2 text-accent"></i>Colombo 03, Sri Lanka</li>
            <li><i className="bi bi-telephone-fill me-2 text-accent"></i>+94 11 234 5678</li>
            <li><i className="bi bi-envelope-fill me-2 text-accent"></i>info@ceylonstays.lk</li>
          </ul>
          <div className="bg-white bg-opacity-10 rounded p-3">
            <p className="text-white-50 small fw-bold mb-1">🔑 Demo Credentials</p>
            <p className="text-white-50 small mb-1">Admin: admin@hotelbooking.com</p>
            <p className="text-white-50 small mb-0">Password: password123</p>
          </div>
        </div>
      </div>
      <hr className="border-secondary my-4" />
      <div className="d-flex justify-content-between align-items-center flex-wrap gap-2">
        <p className="text-white-50 small mb-0">
          &copy; {new Date().getFullYear()} Ceylon Stays — Hotel Booking Management System. Portfolio Project.
        </p>
        <p className="text-white-50 small mb-0">
          Built with React &bull; Node.js &bull; MySQL
        </p>
      </div>
    </div>
  </footer>
);

export default Footer;
