-- =============================================================================
-- Hotel Booking Management System — Database Schema
-- =============================================================================
-- File    : database.sql
-- Engine  : InnoDB
-- Charset : utf8mb4 / utf8mb4_unicode_ci
-- Version : 1.0.0
--
-- Usage:
--   mysql -u root -p < database.sql
--   — OR —
--   SOURCE /path/to/database.sql;
--
-- Seed data passwords below are bcrypt hashes. For shared environments,
-- replace the demo credentials and regenerate hashes with cost factor 12.
-- =============================================================================


-- =============================================================================
-- DATABASE
-- =============================================================================

CREATE DATABASE IF NOT EXISTS hotel_booking_db
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE hotel_booking_db;


-- =============================================================================
-- TABLE: users
-- =============================================================================
-- Stores all system users (admins and customers).
-- Passwords must be stored as bcrypt hashes — never plain text.
-- =============================================================================

CREATE TABLE IF NOT EXISTS users (
  id           INT            NOT NULL AUTO_INCREMENT,
  first_name   VARCHAR(50)    NOT NULL,
  last_name    VARCHAR(50)    NOT NULL,
  email        VARCHAR(150)   NOT NULL,
  password     VARCHAR(255)   NOT NULL  COMMENT 'bcrypt hash — never store plain text',
  phone        VARCHAR(20)    DEFAULT NULL,
  role         ENUM('admin','customer') NOT NULL DEFAULT 'customer',
  created_at   TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at   TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP
                                        ON UPDATE CURRENT_TIMESTAMP,

  -- Constraints
  PRIMARY KEY  (id),
  UNIQUE  KEY  uq_users_email (email)

) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci
  COMMENT='System users — both admins and customers';


-- =============================================================================
-- TABLE: hotels
-- =============================================================================
-- Represents a hotel property. One hotel can have many rooms.
-- =============================================================================

CREATE TABLE IF NOT EXISTS hotels (
  id           INT            NOT NULL AUTO_INCREMENT,
  name         VARCHAR(150)   NOT NULL,
  address      VARCHAR(255)   NOT NULL,
  city         VARCHAR(100)   NOT NULL,
  description  TEXT           DEFAULT NULL,
  created_at   TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at   TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP
                                        ON UPDATE CURRENT_TIMESTAMP,

  -- Constraints
  PRIMARY KEY (id),

  -- Indexes
  INDEX idx_hotels_city (city)

) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci
  COMMENT='Hotel properties; parent of rooms';


-- =============================================================================
-- TABLE: rooms
-- =============================================================================
-- Represents an individual room within a hotel.
-- room_number must be unique within the same hotel (composite unique).
-- availability_status is managed by the booking logic — it transitions
-- between 'available', 'booked', and 'maintenance'.
-- =============================================================================

CREATE TABLE IF NOT EXISTS rooms (
  id                  INT             NOT NULL AUTO_INCREMENT,
  hotel_id            INT             NOT NULL COMMENT 'FK → hotels.id',
  room_number         VARCHAR(20)     NOT NULL,
  room_type           ENUM(
                        'single',
                        'double',
                        'suite',
                        'deluxe'
                      )               NOT NULL DEFAULT 'single',
  price_per_night     DECIMAL(10,2)   NOT NULL,
  capacity            TINYINT         NOT NULL DEFAULT 1
                        COMMENT 'Maximum number of guests',
  availability_status ENUM(
                        'available',
                        'booked',
                        'maintenance'
                      )               NOT NULL DEFAULT 'available',
  image_url           VARCHAR(500)    DEFAULT NULL,
  created_at          TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at          TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP
                                               ON UPDATE CURRENT_TIMESTAMP,

  -- Constraints
  PRIMARY KEY (id),

  CONSTRAINT chk_rooms_price CHECK (price_per_night > 0),
  CONSTRAINT chk_rooms_capacity CHECK (capacity BETWEEN 1 AND 20),

  -- room_number is unique per hotel, not globally
  UNIQUE KEY uq_rooms_hotel_number (hotel_id, room_number),

  -- Foreign key: room belongs to a hotel
  CONSTRAINT fk_rooms_hotel
    FOREIGN KEY (hotel_id)
    REFERENCES hotels (id)
    ON DELETE CASCADE    -- deleting a hotel removes all its rooms
    ON UPDATE CASCADE,

  -- Indexes
  INDEX idx_rooms_hotel_id          (hotel_id),
  INDEX idx_rooms_availability      (availability_status),
  INDEX idx_rooms_type_price        (room_type, price_per_night)

) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci
  COMMENT='Individual rooms belonging to a hotel';


-- =============================================================================
-- TABLE: bookings
-- =============================================================================
-- Records a reservation of a room by a user for a date range.
--
-- Date constraint note:
--   MySQL 8.0.16+ supports CHECK constraints natively.
--   CHECK (check_out > check_in) is included below.
--   For MySQL < 8.0.16, this constraint is parsed but not enforced —
--   enforce it in the application layer (controller validation).
-- =============================================================================

CREATE TABLE IF NOT EXISTS bookings (
  id              INT             NOT NULL AUTO_INCREMENT,
  user_id         INT             NOT NULL COMMENT 'FK → users.id',
  room_id         INT             NOT NULL COMMENT 'FK → rooms.id',
  check_in        DATE            NOT NULL,
  check_out       DATE            NOT NULL,
  total_price     DECIMAL(10,2)   NOT NULL,
  booking_status  ENUM(
                    'pending',
                    'confirmed',
                    'cancelled',
                    'completed'
                  )               NOT NULL DEFAULT 'pending',
  created_at      TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP
                                           ON UPDATE CURRENT_TIMESTAMP,

  -- Constraints
  PRIMARY KEY (id),

  -- check_out must be strictly after check_in
  -- Enforced natively on MySQL 8.0.16+; enforce in app layer on older versions
  CONSTRAINT chk_bookings_dates CHECK (check_out > check_in),
  CONSTRAINT chk_bookings_total CHECK (total_price > 0),

  -- Foreign key: booking belongs to a user
  -- RESTRICT prevents deleting a user who has bookings
  CONSTRAINT fk_bookings_user
    FOREIGN KEY (user_id)
    REFERENCES users (id)
    ON DELETE RESTRICT
    ON UPDATE CASCADE,

  -- Foreign key: booking is for a specific room
  -- RESTRICT prevents deleting a room that has bookings
  CONSTRAINT fk_bookings_room
    FOREIGN KEY (room_id)
    REFERENCES rooms (id)
    ON DELETE RESTRICT
    ON UPDATE CASCADE,

  -- Indexes
  INDEX idx_bookings_user_id        (user_id),
  INDEX idx_bookings_room_id        (room_id),
  INDEX idx_bookings_room_overlap   (room_id, booking_status, check_in, check_out),
  INDEX idx_bookings_status         (booking_status),
  INDEX idx_bookings_dates          (check_in, check_out)

) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci
  COMMENT='Room reservations made by customers';


-- =============================================================================
-- TABLE: payments
-- =============================================================================
-- Records payment attempts tied to a booking (1:N relationship).
-- transaction_reference stores the external payment gateway reference ID.
-- No updated_at column is used. The demo payment lifecycle updates only the
-- payment_status field (for example, completed -> refunded).
-- =============================================================================

CREATE TABLE IF NOT EXISTS payments (
  id                    INT             NOT NULL AUTO_INCREMENT,
  booking_id            INT             NOT NULL COMMENT 'FK → bookings.id',
  payment_method        ENUM(
                          'card',
                          'cash',
                          'online'
                        )               NOT NULL,
  amount                DECIMAL(10,2)   NOT NULL,
  payment_status        ENUM(
                          'pending',
                          'completed',
                          'refunded',
                          'failed'
                        )               NOT NULL DEFAULT 'pending',
  transaction_reference VARCHAR(255)    DEFAULT NULL
                          COMMENT 'External payment gateway reference ID',
  created_at            TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,

  -- Constraints
  PRIMARY KEY (id),

  CONSTRAINT chk_payments_amount CHECK (amount > 0),

  -- Foreign key: payment belongs to a booking
  -- RESTRICT prevents deleting a booking that has a payment record
  CONSTRAINT fk_payments_booking
    FOREIGN KEY (booking_id)
    REFERENCES bookings (id)
    ON DELETE RESTRICT
    ON UPDATE CASCADE,

  -- Indexes
  INDEX idx_payments_booking_id     (booking_id),
  INDEX idx_payments_status         (payment_status),
  UNIQUE KEY uq_payments_transaction (transaction_reference)

) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci
  COMMENT='Demo payment records for bookings; no real money is processed';


-- =============================================================================
-- SEED DATA
-- =============================================================================
-- IMPORTANT — PASSWORD SECURITY:
--     The values below are development bcrypt hashes. Before staging or
--     production, replace the demo accounts and generate cost-factor-12 hashes:
--
--       Node.js: bcrypt.hashSync('PlainPassword123!', 12)
--
--     Example hash (for reference only — do NOT reuse):
--       $2b$12$examplehashexamplehashexamplehashexamplehashexample
-- =============================================================================


-- -----------------------------------------------------------------------------
-- Seed: users (1 admin + 2 customers)
-- -----------------------------------------------------------------------------

INSERT INTO users (first_name, last_name, email, password, phone, role) VALUES
  ('Super', 'Admin',    'admin@hotelbooking.com',    '$2a$12$vMY9SuAQQTuRhXPzVqsRke0AM9xjoinivTOyja1inWke.pBG73ije', '+94 77 100 0001', 'admin'),
  ('John',  'Doe',      'john.doe@example.com',      '$2a$12$j3gbhIPqSljanamuYPT.aefPfzTv9cYTFfz/dhOsKqokpStHWr48.', '+94 71 555 2001', 'customer'),
  ('Jane',  'Smith',    'jane.smith@example.com',    '$2a$12$j3gbhIPqSljanamuYPT.aefPfzTv9cYTFfz/dhOsKqokpStHWr48.', '+94 76 555 2002', 'customer');


-- -----------------------------------------------------------------------------
-- Seed: hotels (3 properties)
-- -----------------------------------------------------------------------------

INSERT INTO hotels (name, address, city, description) VALUES
  (
    'Ceylon Grand Hotel',
    '2 Galle Face Green, Colombo 03',
    'Colombo',
    'A refined heritage stay overlooking the Indian Ocean, featuring elegant interiors, sea-facing dining, and easy access to Colombo’s cultural landmarks.'
  ),
  (
    'Hillview Estate Retreat',
    'Tennekumbura, Kandy 20000',
    'Kandy',
    'A serene highland retreat with misty views, private balconies, and warm Sri Lankan hospitality near the Temple of the Tooth Relic.'
  ),
  (
    'The Fort Breeze',
    'No. 14, Lighthouse Street, Galle 80000',
    'Galle',
    'A boutique stay inspired by the old Dutch fort, combining colonial character with modern comfort and easy access to the coast.'
  ),
  (
    'Ella Tea Haven',
    'Greenland Estate, Ella 90090',
    'Ella',
    'A peaceful eco-luxury hideaway surrounded by tea plantations, rainforests, and some of Sri Lanka’s most iconic scenic viewpoints.'
  ),
  (
    'Kandalama Heritage Lodge',
    'Kandalama, Dambulla 21100',
    'Sigiriya',
    'An architectural landmark hidden in lush jungle, perfect for travellers seeking wildlife, history, and panoramic rock views.'
  ),
  (
    'Ocean Breeze Bentota',
    'National Holiday Resort, Bentota 80500',
    'Bentota',
    'A polished beach resort with spacious villas, water activities, and warm sunset views across the golden shoreline.'
  );


-- -----------------------------------------------------------------------------
-- Seed: rooms (16 rooms across 6 hotels)
-- Prices are in LKR
-- -----------------------------------------------------------------------------

INSERT INTO rooms (hotel_id, room_number, room_type, price_per_night, capacity, availability_status, image_url) VALUES

  -- Galle Face Hotel — Colombo (hotel_id = 1)
  (1, '101', 'single',  25000.00, 1, 'available', NULL),
  (1, '102', 'double',  35000.00, 2, 'available', NULL),
  (1, '201', 'deluxe',  55000.00, 3, 'available', NULL),
  (1, '301', 'suite',   85000.00, 4, 'available', NULL),

  -- Earls Regency — Kandy (hotel_id = 2)
  (2, '101', 'single',  18000.00, 1, 'available', NULL),
  (2, '201', 'double',  28000.00, 2, 'available', NULL),
  (2, '301', 'suite',   65000.00, 4, 'available', NULL),

  -- The Fortress Resort — Galle (hotel_id = 3)
  (3, 'A101', 'single', 30000.00, 1, 'available', NULL),
  (3, 'A201', 'double', 45000.00, 2, 'available', NULL),
  (3, 'PH01', 'suite',  95000.00, 6, 'available', NULL),
  
  -- 98 Acres — Ella (hotel_id = 4)
  (4, 'E101', 'double', 40000.00, 2, 'available', NULL),
  (4, 'E102', 'deluxe', 60000.00, 3, 'available', NULL),
  
  -- Heritance Kandalama (hotel_id = 5)
  (5, 'K101', 'double', 35000.00, 2, 'available', NULL),
  (5, 'K201', 'suite',  75000.00, 4, 'available', NULL),

  -- Taj Bentota (hotel_id = 6)
  (6, 'B101', 'double', 32000.00, 2, 'available', NULL),
  (6, 'B201', 'deluxe', 52000.00, 3, 'available', NULL);


-- =============================================================================
-- TABLE: reviews
-- =============================================================================

CREATE TABLE IF NOT EXISTS reviews (
  id           INT            NOT NULL AUTO_INCREMENT,
  user_id      INT            NOT NULL COMMENT 'FK → users.id',
  hotel_id     INT            NOT NULL COMMENT 'FK → hotels.id',
  rating       TINYINT        NOT NULL COMMENT '1-5 star rating',
  comment      TEXT           DEFAULT NULL,
  created_at   TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP,

  PRIMARY KEY (id),
  CONSTRAINT chk_reviews_rating CHECK (rating BETWEEN 1 AND 5),
  UNIQUE KEY uq_reviews_user_hotel (user_id, hotel_id),

  CONSTRAINT fk_reviews_user
    FOREIGN KEY (user_id) REFERENCES users (id)
    ON DELETE CASCADE ON UPDATE CASCADE,

  CONSTRAINT fk_reviews_hotel
    FOREIGN KEY (hotel_id) REFERENCES hotels (id)
    ON DELETE CASCADE ON UPDATE CASCADE,

  INDEX idx_reviews_hotel_id (hotel_id),
  INDEX idx_reviews_rating (rating)

) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci
  COMMENT='Customer reviews and ratings for hotels';


-- =============================================================================
-- TABLE: favorites
-- =============================================================================

CREATE TABLE IF NOT EXISTS favorites (
  id           INT            NOT NULL AUTO_INCREMENT,
  user_id      INT            NOT NULL COMMENT 'FK → users.id',
  hotel_id     INT            NOT NULL COMMENT 'FK → hotels.id',
  created_at   TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP,

  PRIMARY KEY (id),
  UNIQUE KEY uq_favorites_user_hotel (user_id, hotel_id),

  CONSTRAINT fk_favorites_user
    FOREIGN KEY (user_id) REFERENCES users (id)
    ON DELETE CASCADE ON UPDATE CASCADE,

  CONSTRAINT fk_favorites_hotel
    FOREIGN KEY (hotel_id) REFERENCES hotels (id)
    ON DELETE CASCADE ON UPDATE CASCADE,

  INDEX idx_favorites_user_id (user_id)

) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci
  COMMENT='Customer favorite hotels';


-- -----------------------------------------------------------------------------
-- Seed: sample reviews
-- -----------------------------------------------------------------------------

INSERT INTO reviews (user_id, hotel_id, rating, comment) VALUES
  (2, 1, 5, 'The ocean view from Colombo was spectacular and the service felt genuinely warm and professional.'),
  (3, 1, 4, 'Perfect base for a city break with easy access to Galle Face and nearby dining spots.'),
  (2, 2, 5, 'The Kandy retreat was peaceful, beautifully styled, and ideal for a slow weekend away.'),
  (3, 3, 5, 'A charming stay in Galle with lovely architecture and a calm coastal atmosphere.'),
  (2, 4, 5, 'Ella Tea Haven felt like a hidden paradise with breathtaking mountain views.'),
  (3, 5, 4, 'Kandalama Heritage Lodge was unforgettable, especially for the jungle scenery and historic setting.');


-- =============================================================================
-- SCHEMA DOCUMENTATION (inline comments)
-- =============================================================================
--
-- TABLE RELATIONSHIPS
-- ───────────────────
--
--   hotels ──< rooms
--     One hotel has many rooms (1:N).
--     FK: rooms.hotel_id → hotels.id
--     ON DELETE CASCADE  — removing a hotel cascades to its rooms.
--     ON UPDATE CASCADE  — hotel PK changes propagate to room FK.
--
--   users ──< bookings
--     One user can make many bookings (1:N).
--     FK: bookings.user_id → users.id
--     ON DELETE RESTRICT — prevents deleting a user with active bookings.
--     ON UPDATE CASCADE  — user PK changes propagate to booking FK.
--
--   rooms ──< bookings
--     One room can be involved in many bookings over time (1:N).
--     FK: bookings.room_id → rooms.id
--     ON DELETE RESTRICT — prevents deleting a room with booking history.
--     ON UPDATE CASCADE  — room PK changes propagate to booking FK.
--
--   bookings ──< payments
--     One booking has one primary demo payment; status tracks refund state.
--     FK: payments.booking_id → bookings.id
--     ON DELETE RESTRICT — prevents deleting a booking with a payment record.
--     ON UPDATE CASCADE  — booking PK changes propagate to payment FK.
--
-- CARDINALITY SUMMARY
-- ───────────────────
--   users     : bookings  = 1 : N
--   hotels    : rooms     = 1 : N
--   rooms     : bookings  = 1 : N
--   bookings  : payments  = 1 : N (application permits one completed payment at a time)
--
-- INDEXING STRATEGY
-- ─────────────────
--   uq_users_email              — Unique; speeds up login lookup by email.
--   uq_rooms_hotel_number       — Composite unique; enforces room_number uniqueness per hotel.
--   uq_payments_transaction     — Unique; prevents duplicate payment gateway references.
--   idx_hotels_city             — Speeds up hotel search/filter by city.
--   idx_rooms_hotel_id          — Speeds up JOIN when loading rooms for a hotel.
--   idx_rooms_availability      — Speeds up filtering available rooms.
--   idx_rooms_type_price        — Supports filter/sort by room type and price.
--   idx_bookings_user_id        — Speeds up "my bookings" queries.
--   idx_bookings_room_id        — Speeds up availability checks for a specific room.
--   idx_bookings_room_overlap   — Supports locked date-overlap checks.
--   idx_bookings_status         — Speeds up admin filter by booking status.
--   idx_bookings_dates          — Speeds up date-range overlap queries.
--   idx_payments_booking_id     — Speeds up payment lookup by booking.
--   idx_payments_status         — Speeds up admin filter by payment status.
--
-- =============================================================================
