import React, { Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import ProtectedRoute from './components/ProtectedRoute';

import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import Hotels from './pages/Hotels';
import HotelDetails from './pages/HotelDetails';
import MyBookings from './pages/MyBookings';
import Booking from './pages/Booking';
import Profile from './pages/Profile';
import Favorites from './pages/Favorites';
import MyPayments from './pages/MyPayments';
import NotFound from './pages/NotFound';

// Lazy loaded Admin routes (optimization)
const AdminDashboard = React.lazy(() => import('./pages/admin/AdminDashboard'));
const AdminHotels = React.lazy(() => import('./pages/admin/AdminHotels'));
const AdminRooms = React.lazy(() => import('./pages/admin/AdminRooms'));
const AdminBookings = React.lazy(() => import('./pages/admin/AdminBookings'));
const AdminUsers = React.lazy(() => import('./pages/admin/AdminUsers'));
const AdminPayments = React.lazy(() => import('./pages/admin/AdminPayments'));
const AdminReviews = React.lazy(() => import('./pages/admin/AdminReviews'));

const AdminLoading = () => (
  <div
    role="status"
    aria-live="polite"
    style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', fontSize: '1.2rem', color: '#666' }}
  >
    <span className="visually-hidden">Loading admin panel...</span>
    Loading...
  </div>
);


// Layout wrapper: hides Navbar/Footer on admin pages (admin has its own sidebar)
const AppLayout = ({ children }) => {
  const location = useLocation();
  const isAdminPage = location.pathname.startsWith('/admin');
  return (
    <>
      {!isAdminPage && <Navbar />}
      <main style={{ minHeight: isAdminPage ? undefined : '80vh' }}>
        {children}
      </main>
      {!isAdminPage && <Footer />}
    </>
  );
};

function App() {
  return (
    <AuthProvider>
      <Router>
        <AppLayout>
          <Suspense fallback={<AdminLoading />}>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/hotels" element={<Hotels />} />
              <Route path="/hotels/:id" element={<HotelDetails />} />
              <Route
                path="/my-bookings"
                element={
                  <ProtectedRoute>
                    <MyBookings />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/book"
                element={
                  <ProtectedRoute>
                    <Booking />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/profile"
                element={
                  <ProtectedRoute>
                    <Profile />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/favorites"
                element={
                  <ProtectedRoute>
                    <Favorites />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/my-payments"
                element={
                  <ProtectedRoute>
                    <MyPayments />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin"
                element={
                  <ProtectedRoute adminOnly>
                    <AdminDashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/hotels"
                element={
                  <ProtectedRoute adminOnly>
                    <AdminHotels />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/rooms"
                element={
                  <ProtectedRoute adminOnly>
                    <AdminRooms />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/bookings"
                element={
                  <ProtectedRoute adminOnly>
                    <AdminBookings />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/users"
                element={
                  <ProtectedRoute adminOnly>
                    <AdminUsers />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/payments"
                element={
                  <ProtectedRoute adminOnly>
                    <AdminPayments />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/reviews"
                element={
                  <ProtectedRoute adminOnly>
                    <AdminReviews />
                  </ProtectedRoute>
                }
              />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </AppLayout>
      </Router>
    </AuthProvider>
  );
}

export default App;
