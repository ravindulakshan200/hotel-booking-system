import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { beforeEach, expect, test, vi } from 'vitest';

import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Profile from './pages/Profile';
import Favorites from './pages/Favorites';
import MyPayments from './pages/MyPayments';
import NotFound from './pages/NotFound';
import HotelDetails from './pages/HotelDetails';

// Mock all services
vi.mock('./services/profileService', () => ({
  updateProfile: vi.fn(),
  changePassword: vi.fn(),
}));
vi.mock('./services/favoriteService', () => ({
  getMyFavorites: vi.fn(),
  addFavorite: vi.fn(),
  removeFavorite: vi.fn(),
}));
vi.mock('./services/paymentService', () => ({
  getMyPayments: vi.fn(),
}));
vi.mock('./services/reviewService', () => ({
  getHotelReviews: vi.fn(),
  submitReview: vi.fn(),
}));
vi.mock('./services/hotelService', () => ({
  getHotelById: vi.fn(),
}));
vi.mock('./services/roomService', () => ({
  getRoomsByHotel: vi.fn(),
}));

import { updateProfile } from './services/profileService';
import { getMyFavorites, removeFavorite } from './services/favoriteService';
import { getMyPayments } from './services/paymentService';
import { submitReview, getHotelReviews } from './services/reviewService';
import { getHotelById } from './services/hotelService';
import { getRoomsByHotel } from './services/roomService';

beforeEach(() => {
  localStorage.clear();
  vi.clearAllMocks();
});

const renderWithContext = (ui, { route = '/' } = {}) => {
  return render(
    <AuthProvider>
      <MemoryRouter initialEntries={[route]}>
        {ui}
      </MemoryRouter>
    </AuthProvider>
  );
};

test('Profile renders user data and submits update', async () => {
  localStorage.setItem('user', JSON.stringify({ first_name: 'John', last_name: 'Doe', email: 'john@example.com', role: 'customer' }));
  localStorage.setItem('token', 'fake-token');

  updateProfile.mockResolvedValueOnce({ data: { data: { user: { first_name: 'Jane', last_name: 'Doe', email: 'john@example.com', role: 'customer' } } } });

  renderWithContext(<Profile />);
  
  expect(await screen.findByDisplayValue('john@example.com')).toBeInTheDocument();
  
  const firstNameInput = screen.getByLabelText(/First Name/i);
  fireEvent.change(firstNameInput, { target: { value: 'Jane' } });
  
  const updateBtn = screen.getByRole('button', { name: /Update Profile/i });
  fireEvent.click(updateBtn);
  
  await waitFor(() => expect(updateProfile).toHaveBeenCalledWith(expect.objectContaining({ first_name: 'Jane' })));
  expect(await screen.findByText(/Profile updated successfully/i)).toBeInTheDocument();
});

test('Favorites empty state and remove action', async () => {
  localStorage.setItem('user', JSON.stringify({ email: 'test@example.com' }));
  localStorage.setItem('token', 'token');
  
  getMyFavorites.mockResolvedValueOnce({
    data: { data: { favorites: [{ id: 1, hotel_id: 10, hotel_name: 'Test Hotel', city: 'Colombo' }] } }
  });
  removeFavorite.mockResolvedValueOnce({});

  renderWithContext(<Favorites />);
  
  expect(await screen.findByText('Test Hotel')).toBeInTheDocument();
  
  const removeBtn = screen.getByTitle('Remove from favorites');
  fireEvent.click(removeBtn);
  
  await waitFor(() => expect(removeFavorite).toHaveBeenCalledWith(10));
  expect(await screen.findByText(/You haven't added any hotels to your favorites yet/i)).toBeInTheDocument();
});

test('My Payments demo-history page', async () => {
  localStorage.setItem('user', JSON.stringify({ email: 'test@example.com' }));
  localStorage.setItem('token', 'token');
  
  getMyPayments.mockResolvedValueOnce({
    data: { data: { payments: [{ id: 1, hotel_name: 'Payment Hotel', amount: 5000, payment_status: 'completed', payment_method: 'card', created_at: new Date().toISOString() }] } }
  });

  renderWithContext(<MyPayments />);
  
  expect(await screen.findByText('Payment Hotel')).toBeInTheDocument();
  expect(screen.getByText(/Demo Records Only:/i)).toBeInTheDocument();
});

test('Protected customer routes redirect when not logged in', async () => {
  render(
    <AuthProvider>
      <MemoryRouter initialEntries={['/profile']}>
        <Routes>
          <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
          <Route path="/login" element={<div>Login Page</div>} />
        </Routes>
      </MemoryRouter>
    </AuthProvider>
  );
  
  expect(await screen.findByText('Login Page')).toBeInTheDocument();
});

test('Hotel review form handles success and backend errors', async () => {
  localStorage.setItem('user', JSON.stringify({ email: 'test@example.com' }));
  localStorage.setItem('token', 'token');
  
  getHotelById.mockResolvedValue({ data: { data: { hotel: { id: 1, name: 'Hotel 1' } } } });
  getRoomsByHotel.mockResolvedValue({ data: { data: { rooms: [] } } });
  getHotelReviews.mockResolvedValue({ data: { data: { reviews: [] } } });
  getMyFavorites.mockResolvedValue({ data: { data: { favorites: [] } } });

  renderWithContext(
    <Routes>
      <Route path="/hotels/:id" element={<HotelDetails />} />
    </Routes>,
    { route: '/hotels/1' }
  );

  expect(await screen.findByText('Write a Review')).toBeInTheDocument();
  
  submitReview.mockRejectedValueOnce({ response: { data: { message: 'Must stay here first' } } });
  
  const submitBtn = screen.getByRole('button', { name: /Submit Review/i });
  fireEvent.click(submitBtn);
  
  expect(await screen.findByText('Must stay here first')).toBeInTheDocument();
  
  submitReview.mockResolvedValueOnce({});
  getHotelReviews.mockResolvedValueOnce({ data: { data: { reviews: [{ id: 1, first_name: 'John', rating: 5, comment: 'Great' }] } } });
  
  fireEvent.click(submitBtn);
  
  expect(await screen.findByText('Review submitted successfully!')).toBeInTheDocument();
  expect(await screen.findByText(/"Great"/i)).toBeInTheDocument();
});

test('Not Found route', async () => {
  renderWithContext(
    <Routes>
      <Route path="*" element={<NotFound />} />
    </Routes>,
    { route: '/random' }
  );
  expect(await screen.findByText(/Page Not Found/i)).toBeInTheDocument();
});
