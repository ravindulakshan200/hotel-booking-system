import React from 'react';

const LoadingSpinner = ({ message = 'Loading...', size = 'md' }) => {
  const spinnerSize = size === 'lg' ? '3rem' : size === 'sm' ? '1.5rem' : '2.5rem';

  return (
    <div className="text-center py-5" role="status" aria-live="polite">
      <div
        className="spinner-border text-primary"
        style={{ width: spinnerSize, height: spinnerSize }}
      >
        <span className="visually-hidden">{message}</span>
      </div>
      {message && <p className="text-muted mt-3 mb-0">{message}</p>}
    </div>
  );
};

export default LoadingSpinner;
