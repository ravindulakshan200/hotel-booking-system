import React from 'react';
import { render, screen } from '@testing-library/react';

jest.mock('react-router-dom', () => ({
  BrowserRouter: ({ children }) => <div>{children}</div>,
  Routes: ({ children }) => <div>{children}</div>,
  Route: ({ element }) => element,
  Link: ({ children, to, ...props }) => <a href={to} {...props}>{children}</a>,
  NavLink: ({ children, ...props }) => <a {...props}>{children}</a>,
  Navigate: ({ to }) => <div>Navigate to {to}</div>,
  useNavigate: () => jest.fn(),
  useLocation: () => ({ pathname: '/', search: '', state: null }),
  useParams: () => ({})
}));

import App from './App';
import AdminDashboard from './pages/admin/AdminDashboard';

test('renders the home hero on the landing page', () => {
  render(<App />);
  expect(screen.getByText(/Find Your Perfect Stay/i)).toBeInTheDocument();
});

test('loads the admin dashboard module without crashing', () => {
  expect(AdminDashboard).toBeDefined();
});
