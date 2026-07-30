import React from 'react';
import { render, screen } from '@testing-library/react';
import { expect, test } from 'vitest';
import HotelMap from './HotelMap';

test('does not render when latitude/longitude are invalid or missing', () => {
  const { container: c1 } = render(<HotelMap latitude={null} longitude={null} />);
  expect(c1.firstChild).toBeNull();

  const { container: c2 } = render(<HotelMap latitude="abc" longitude="def" />);
  expect(c2.firstChild).toBeNull();

  const { container: c3 } = render(<HotelMap latitude={0} longitude={0} />);
  expect(c3.firstChild).toBeNull();
});

test('renders iframe map and external OSM fallback link correctly', () => {
  render(<HotelMap latitude={6.9271} longitude={79.8612} hotelName="Test Hotel" />);

  const iframe = screen.getByTitle('Location map for Test Hotel');
  expect(iframe).toBeInTheDocument();
  expect(iframe).toHaveAttribute('src', expect.stringContaining('https://www.openstreetmap.org/export/embed.html'));
  expect(iframe).toHaveAttribute('src', expect.stringContaining('marker=6.9271%2C79.8612'));

  const link = screen.getByRole('link', { name: /View on OpenStreetMap/i });
  expect(link).toBeInTheDocument();
  expect(link).toHaveAttribute('href', 'https://www.openstreetmap.org/?mlat=6.9271&mlon=79.8612#map=16/6.9271/79.8612');
});
