# 🏨 Hotel Booking Management System

A full-stack **Hotel Booking Management System** built with a clean MVC architecture. This system allows guests to search, book, and manage hotel room reservations, while providing admins with full hotel and room management capabilities.

---

## 📋 Project Description

This application provides a RESTful API backend and a React-powered frontend to support the complete hotel booking workflow — from browsing available rooms to completing payments. The project is structured for scalability, maintainability, and production readiness.

---

## ⚙️ Tech Stack

### Backend

| Technology             | Purpose                         |
| ---------------------- | ------------------------------- |
| **Node.js**            | JavaScript runtime              |
| **Express.js**         | HTTP server & routing           |
| **MySQL**              | Relational database             |
| **mysql2**             | MySQL driver (promise-based)    |
| **JWT (jsonwebtoken)** | Authentication tokens           |
| **bcryptjs**           | Password hashing                |
| **dotenv**             | Environment variable management |
| **cors**               | Cross-origin resource sharing   |
| **nodemon**            | Dev auto-reload                 |

### Frontend

| Technology           | Purpose                   |
| -------------------- | ------------------------- |
| **React**            | UI component library      |
| **React Router DOM** | Client-side routing       |
| **Axios**            | HTTP client for API calls |
| **Bootstrap**        | UI component framework    |

---

## 📁 Folder Structure

```
hotel-booking-system/
├── backend/
│   ├── config/
│   │   └── db.js                  # MySQL connection pool
│   ├── controllers/
│   │   ├── healthController.js    # Health check
│   │   ├── authController.js      # Register, login, logout, me
│   │   ├── hotelController.js     # Hotel CRUD
│   │   ├── roomController.js      # Room CRUD
│   │   ├── bookingController.js   # Booking management
│   │   └── paymentController.js   # Payment processing
│   ├── middleware/
│   │   ├── authMiddleware.js      # JWT verification
│   │   ├── adminMiddleware.js     # Role-based access guard
│   │   ├── errorHandler.js        # Global error handler
│   │   └── notFound.js            # 404 handler
│   ├── models/
│   │   ├── User.js                # User queries
│   │   ├── Hotel.js               # Hotel queries
│   │   ├── Room.js                # Room queries
│   │   ├── Booking.js             # Booking queries
│   │   └── Payment.js             # Payment queries
│   ├── routes/
│   │   ├── healthRoutes.js
│   │   ├── authRoutes.js
│   │   ├── hotelRoutes.js
│   │   ├── roomRoutes.js
│   │   ├── bookingRoutes.js
│   │   └── paymentRoutes.js
│   ├── utils/                     # Shared helper functions (future)
│   ├── server.js                  # Express app entry point
│   ├── .env                       # Local environment variables
│   ├── .env.example               # Environment variable template
│   ├── .gitignore
│   └── package.json
│
└── frontend/
    ├── public/
    └── src/
        ├── assets/                # Images, icons, fonts
        ├── components/            # Reusable UI components
        ├── context/               # React Context providers
        ├── layouts/               # Page layout wrappers
        ├── pages/                 # Route-level page components
        ├── routes/                # React Router configuration
        ├── services/              # Axios API service modules
        ├── App.js
        ├── index.js               # Bootstrap imported here
        └── index.css              # Global styles & CSS tokens
```

---

## 🚀 Installation

### Prerequisites

- Node.js >= 16
- MySQL >= 8.0
- npm >= 8

### 1. Clone the repository

```bash
git clone <repo-url>
cd hotel-booking-system
```

### 2. Backend setup

```bash
cd backend
npm install
cp .env.example .env
# Edit .env with your MySQL credentials and JWT secret
```

### 3. Frontend setup

```bash
cd frontend
npm install
cp .env.example .env
```

---

## 🔐 Environment Variables

Create a `.env` file inside the `backend/` directory using the template below:

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

Create a `.env` file inside the `frontend/` directory for the API base URL:

```env
REACT_APP_API_URL=http://localhost:5000/api/v1
```

> ⚠️ **Never commit `.env` to version control.** Only commit `.env.example`.

---

## ▶️ Run Commands

### Backend

```bash
cd backend

# Development (auto-reload with nodemon)
npm run dev

# Production
npm start
```

### Frontend

```bash
cd frontend

# Start development server
npm start
```

### Database setup

1. Create a MySQL database named `hotel_booking_system`.
2. Import the schema from [backend/database/database.sql](backend/database/database.sql) if available.
3. Update the backend `.env` values to match your local MySQL credentials.

---

## 📡 API Base URL

```
http://localhost:5000/api/v1
```

### Available Endpoints (Architecture)

| Method | Endpoint                | Description              | Access  |
| ------ | ----------------------- | ------------------------ | ------- |
| GET    | `/api/v1/health`        | Server health check      | Public  |
| POST   | `/api/v1/auth/register` | Register new user        | Public  |
| POST   | `/api/v1/auth/login`    | Login and get JWT        | Public  |
| GET    | `/api/v1/auth/profile`  | Get current user profile | Private |
| GET    | `/api/v1/hotels`        | List all hotels          | Public  |
| GET    | `/api/v1/hotels/:id`    | Get hotel by ID          | Public  |
| POST   | `/api/v1/hotels`        | Create hotel             | Admin   |
| PUT    | `/api/v1/hotels/:id`    | Update hotel             | Admin   |
| DELETE | `/api/v1/hotels/:id`    | Delete hotel             | Admin   |
| GET    | `/api/v1/rooms`         | List all rooms           | Public  |
| GET    | `/api/v1/rooms/:id`     | Get room by ID           | Public  |
| POST   | `/api/v1/rooms`         | Create room              | Admin   |
| GET    | `/api/v1/bookings/my`   | My bookings              | Private |
| POST   | `/api/v1/bookings`      | Create booking           | Private |
| DELETE | `/api/v1/bookings/:id`  | Cancel booking           | Private |
| POST   | `/api/v1/payments`      | Process payment          | Private |

---

## 📊 Current Project Status

| Phase                               | Status   |
| ----------------------------------- | -------- |
| ✅ Project Setup                    | Complete |
| ✅ Backend Architecture (MVC)       | Complete |
| ✅ API Versioning (`/api/v1/`)      | Complete |
| ✅ MySQL Connection Pool            | Complete |
| ✅ Placeholder Controllers          | Complete |
| ✅ Placeholder Models (with schema) | Complete |
| ✅ Placeholder Routes               | Complete |
| ✅ Error Handling Middleware        | Complete |
| ✅ Frontend (React + Bootstrap)     | Complete |
| ⏳ Database Schema & Tables         | **Next** |
| ⏳ JWT Authentication               | Pending  |
| ⏳ Hotel & Room CRUD                | Pending  |
| ⏳ Booking System                   | Pending  |
| ⏳ Payment System                   | Pending  |
| ⏳ Frontend Pages & Routing         | Pending  |

---

## 👤 Author

Hotel Booking Management System — Built with Node.js, Express, MySQL, and React.
