import React from 'react';

const EmptyState = ({ icon = '📭', title, message, action }) => (
  <div className="empty-state text-center py-5">
    <div className="empty-state-icon mb-3">{icon}</div>
    <h4 className="fw-bold">{title}</h4>
    {message && <p className="text-muted mb-4">{message}</p>}
    {action}
  </div>
);

export default EmptyState;
