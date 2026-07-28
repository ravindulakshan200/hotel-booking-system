import React from 'react';

/**
 * Modern, accessible in-page map component using OpenStreetMap.
 * Renders an iframe map with a marker and a safe fallback link.
 */
const HotelMap = ({ latitude, longitude, hotelName }) => {
  const lat = Number(latitude);
  const lng = Number(longitude);

  if (isNaN(lat) || isNaN(lng) || lat === 0 || lng === 0) {
    return null;
  }

  // Define bounding box around coordinates (roughly ~500m zoom)
  const delta = 0.005;
  const minLat = lat - delta;
  const maxLat = lat + delta;
  const minLng = lng - delta;
  const maxLng = lng + delta;

  // OpenStreetMap embed URL with bbox and marker coordinates
  const mapUrl = `https://www.openstreetmap.org/export/embed.html?bbox=${minLng}%2C${minLat}%2C${maxLng}%2C${maxLat}&layer=mapnik&marker=${lat}%2C${lng}`;
  const externalMapUrl = `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=16/${lat}/${lng}`;

  return (
    <div className="hotel-map-container mt-4">
      <h5 className="font-serif fw-bold text-primary mb-3">
        <i className="bi bi-map me-2"></i>Location Map
      </h5>
      <div className="card glass-card overflow-hidden p-0 border-0 shadow-sm mb-2">
        <iframe
          title={`Location map for ${hotelName || 'hotel'}`}
          width="100%"
          height="320"
          style={{ border: 0 }}
          src={mapUrl}
          allowFullScreen
          loading="lazy"
        ></iframe>
      </div>
      <div className="text-start mt-2">
        <a
          href={externalMapUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="btn btn-link btn-sm text-primary p-0 d-inline-flex align-items-center text-decoration-none fw-semibold"
        >
          <i className="bi bi-box-arrow-up-right me-1.5 small"></i>
          View on OpenStreetMap
        </a>
      </div>
    </div>
  );
};

export default HotelMap;
