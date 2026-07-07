# 🏨 Hotel Booking Management System

A polished full-stack hotel booking application built with Node.js, Express, MySQL, and React. The project supports guest browsing, room booking, account management, and an admin dashboard for hotel, room, booking, and review operations.

---

## ✨ What this project includes

- Guest-facing hotel discovery and room browsing
- Secure authentication with JWT-based login and profile access
- Booking flow with date validation and booking history
- Admin control panel for managing hotels, rooms, bookings, users, payments, and reviews
- Responsive React UI with Bootstrap styling and protected routes

---

## 🛠️ Tech stack

### Backend

- Node.js
- Express.js
- MySQL + mysql2
- JWT + bcryptjs
- dotenv, cors

### Frontend

- React
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

- Node.js 18+
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
DB_NAME=hotel_booking_system
JWT_SECRET=your_jwt_secret_here
JWT_EXPIRES_IN=7d
CLIENT_URL=http://localhost:3000
```

Frontend:

```env
REACT_APP_API_URL=http://localhost:5000/api/v1
```

### 3. Create the database

Create a MySQL database called `hotel_booking_system`, then import the SQL from [backend/database/database.sql](backend/database/database.sql) if available.

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
- Bookings: `/bookings`, `/bookings/my-bookings`, `/bookings/:id/cancel`
- Admin: `/admin/dashboard`, `/admin/users`, `/admin/bookings/:id/status`

---

## ✅ Verification status

The following checks were verified in the current workspace:

- Frontend tests: passing
- Frontend production build: passing
- Backend startup: requires a reachable MySQL instance and a valid database name

---

## 👤 Author

Hotel Booking Management System — built as a full-stack portfolio project with a focused booking and admin workflow.
