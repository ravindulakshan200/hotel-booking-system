# 🏨 Hotel Booking Management System

A polished full-stack hotel booking application built with Node.js, Express, MySQL, and React. The project supports guest browsing, room booking, account management, and an admin dashboard for hotel, room, booking, and review operations.

---

## ✨ What this project includes

- Guest-facing hotel discovery and room browsing
- Secure authentication with JWT-based login and profile access
- Transaction-safe booking flow with date validation and booking history
- Clearly labelled demo checkout (no real card data or money processing)
- Admin control panel for managing hotels, rooms, bookings, users, payments, and reviews
- Responsive React UI with Bootstrap styling and protected routes

---

## 🛠️ Tech stack

### Backend

- Node.js
- Express.js
- MySQL + mysql2
- JWT + bcryptjs
- Helmet, rate limiting, dotenv, cors

### Frontend

- React
- Vite + Vitest
- React Router DOM
- Axios
- Bootstrap

---

## 📁 Project structure

```text
backend/
  config/          # Database and environment config
  controllers/     # Auth, hotel, room, booking, admin, payment, review logic
  middleware/      # Auth, admin, error, and 404 handling
  models/          # MySQL-backed data access layer
  routes/          # Versioned API endpoints
  database/        # SQL schema and seed scripts
  server.js

frontend/
  public/
  src/
    components/    # Reusable UI pieces
    context/       # Auth context
    layouts/       # Admin shell layout
    pages/         # Home, hotel, booking, auth, and admin pages
    services/      # API integration helpers
```

---

## 🚀 Getting started

### Prerequisites

- Node.js 20.19+ or 22.12+
- MySQL 8+
- npm 9+

### 1. Clone and install

```bash
git clone <repo-url>
cd hotel-booking-system

cd backend && npm install
cd ../frontend && npm install
```

### 2. Configure environment variables

Backend:

```env
PORT=5000
DB_PORT=3306
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=
DB_NAME=hotel_booking_db
JWT_SECRET=replace_with_a_private_random_secret_of_at_least_32_characters
JWT_EXPIRES_IN=7d
CLIENT_URL=http://localhost:5173
APP_TIMEZONE=Asia/Colombo
```

Frontend:

```env
VITE_API_URL=http://localhost:5000/api/v1
```

### 3. Create the database

Import [backend/database/database.sql](backend/database/database.sql). It creates and selects the `hotel_booking_db` database.

### 4. Run the app

Backend:

```bash
cd backend
npm run dev
```

Frontend:

```bash
cd frontend
npm start
```

---

## 🔐 Main API endpoints

Base URL:

```text
http://localhost:5000/api/v1
```

- Auth: `/auth/register`, `/auth/login`, `/auth/profile`
- Hotels: `/hotels`, `/hotels/:id`
- Rooms: `/rooms`, `/rooms/:id`
- Bookings: `/bookings`, `/bookings/checkout`, `/bookings/my-bookings`, `/bookings/:id/cancel`
- Admin: `/admin/dashboard`, `/admin/users`, `/admin/bookings/:id/status`

---

## ✅ Verification status

The following checks were verified in the current workspace:

- Backend tests: `cd backend && npm test`
- Frontend tests: `cd frontend && npm test`
- Frontend production build: `cd frontend && npm run build`
- Readiness: `/api/v1/health` checks MySQL; liveness: `/api/v1/health/live`

---

## 👤 Author

Hotel Booking Management System — built as a full-stack portfolio project with a focused booking and admin workflow.
