import React from 'react';
import { Link } from 'react-router-dom';

const Footer = () => (
  <footer className="site-footer mt-auto">
    <div className="container py-5">
      <div className="row g-4">
        <div className="col-md-4">
          <h5 className="fw-bold text-white mb-3">Hotel Booking System</h5>
          <p className="text-white-50">
            Your trusted platform for discovering and booking premium hotel stays worldwide.
          </p>
        </div>
        <div className="col-md-2">
          <h6 className="text-white fw-bold mb-3">Explore</h6>
          <ul className="list-unstyled footer-links">
            <li><Link to="/hotels">Hotels</Link></li>
            <li><Link to="/about">About Us</Link></li>
            <li><Link to="/faq">FAQ</Link></li>
          </ul>
        </div>
        <div className="col-md-2">
          <h6 className="text-white fw-bold mb-3">Support</h6>
          <ul className="list-unstyled footer-links">
            <li><Link to="/contact">Contact</Link></li>
            <li><Link to="/my-bookings">My Bookings</Link></li>
          </ul>
        </div>
        <div className="col-md-4">
          <h6 className="text-white fw-bold mb-3">Demo Credentials</h6>
          <p className="text-white-50 small mb-1">Admin: admin@hotelbooking.com / Admin@123</p>
          <p className="text-white-50 small mb-0">Customer: john.doe@example.com / Customer@123</p>
        </div>
      </div>
      <hr className="border-secondary my-4" />
      <p className="text-center text-white-50 small mb-0">
        &copy; {new Date().getFullYear()} Hotel Booking Management System. Final Year Project.
      </p>
    </div>
  </footer>
);

export default Footer;
