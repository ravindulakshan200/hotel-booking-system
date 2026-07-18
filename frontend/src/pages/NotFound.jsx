import React from 'react';
import { Link } from 'react-router-dom';

const NotFound = () => (
  <div className="container mt-5 text-center fade-in">
    <div className="glass-card p-5 mx-auto" style={{ maxWidth: '600px' }}>
      <h1 className="display-1 text-primary fw-bold mb-3">404</h1>
      <h3 className="font-serif text-accent mb-4">Page Not Found</h3>
      <p className="lead text-muted mb-5">The page you are looking for doesn't exist or has been moved.</p>
      <Link to="/" className="btn btn-primary px-5 rounded-pill shadow-sm">
        Return to Home
      </Link>
    </div>
  </div>
);

export default NotFound;
