# 🗄️ Database Design — Hotel Booking Management System

> **Engine:** InnoDB | **Charset:** utf8mb4 / utf8mb4_unicode_ci | **Database:** `hotel_booking_db`

---

## 📊 ER Diagram (Text/ASCII)

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│                         HOTEL BOOKING SYSTEM — ER DIAGRAM                        │
└──────────────────────────────────────────────────────────────────────────────────┘

  ┌─────────────┐          ┌─────────────────┐          ┌──────────────────┐
  │   users     │          │    hotels        │          │     rooms        │
  ├─────────────┤          ├─────────────────┤          ├──────────────────┤
  │ PK id       │          │ PK id           │ 1      N │ PK id            │
  │    first_name│         │    name         │──────────│ FK hotel_id      │
  │    last_name │         │    address      │          │    room_number   │
  │    email    │          │    city         │          │    room_type     │
  │    password │          │    description  │          │    price_per_night│
  │    phone    │          │    created_at   │          │    capacity      │
  │    role     │          │    updated_at   │          │    availability_ │
  │    created_at│         └─────────────────┘          │      status      │
  │    updated_at│                                      │    image_url     │
  └──────┬──────┘                                       │    created_at    │
         │                                              │    updated_at    │
         │ 1                                            └───────┬──────────┘
         │                                                      │
         │                                                      │ 1
         │                                                      │
         │ N                ┌────────────────────┐             │ N
         └──────────────────│      bookings       │─────────────┘
                            ├────────────────────┤
                            │ PK id              │
                            │ FK user_id         │ 1
                            │ FK room_id         │──────────┐
                            │    check_in        │          │
                            │    check_out       │          │ N (logical 1:1)
                            │    total_price     │          │
                            │    booking_status  │   ┌──────┴─────────────┐
                            │    created_at      │   │      payments       │
                            │    updated_at      │   ├────────────────────┤
                            └────────────────────┘   │ PK id              │
                                                      │ FK booking_id      │
                                                      │    payment_method  │
                                                      │    amount          │
                                                      │    payment_status  │
                                                      │    transaction_ref │
                                                      │    created_at      │
                                                      └────────────────────┘


  Cardinality Key:
    1 ──────── N   = One-to-Many
    1 ──────── 1   = One-to-One (logical)
    PK = Primary Key
    FK = Foreign Key
```

---

## 📋 Table Descriptions

### 1. `users`
Stores all user accounts — both **admins** and **customers**.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | `INT` | PK, AUTO_INCREMENT | Unique user identifier |
| `first_name` | `VARCHAR(50)` | NOT NULL | User's first name |
| `last_name` | `VARCHAR(50)` | NOT NULL | User's last name |
| `email` | `VARCHAR(150)` | NOT NULL, UNIQUE | Login identifier; must be globally unique |
| `password` | `VARCHAR(255)` | NOT NULL | **bcrypt hash** — never store plain text |
| `phone` | `VARCHAR(20)` | NULL | Optional contact number |
| `role` | `ENUM('admin','customer')` | NOT NULL, DEFAULT 'customer' | Controls access level |
| `created_at` | `TIMESTAMP` | DEFAULT CURRENT_TIMESTAMP | Record creation time |
| `updated_at` | `TIMESTAMP` | ON UPDATE CURRENT_TIMESTAMP | Last modification time |

> **Security note:** The `password` column must always store a bcrypt hash with cost factor ≥ 12. The column length of 255 accommodates bcrypt's 60-character output format with room for future algorithm changes.

---

### 2. `hotels`
Represents a physical hotel property. Each hotel owns multiple rooms.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | `INT` | PK, AUTO_INCREMENT | Unique hotel identifier |
| `name` | `VARCHAR(150)` | NOT NULL | Hotel display name |
| `address` | `VARCHAR(255)` | NOT NULL | Street address |
| `city` | `VARCHAR(100)` | NOT NULL | City (indexed for search) |
| `description` | `TEXT` | NULL | Marketing description |
| `created_at` | `TIMESTAMP` | DEFAULT CURRENT_TIMESTAMP | Record creation time |
| `updated_at` | `TIMESTAMP` | ON UPDATE CURRENT_TIMESTAMP | Last modification time |

---

### 3. `rooms`
Represents an individual bookable room within a hotel.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | `INT` | PK, AUTO_INCREMENT | Unique room identifier |
| `hotel_id` | `INT` | NOT NULL, FK → hotels.id | Parent hotel |
| `room_number` | `VARCHAR(20)` | NOT NULL | Physical room identifier (e.g., "301", "PH01") |
| `room_type` | `ENUM('single','double','suite','deluxe')` | NOT NULL | Room category |
| `price_per_night` | `DECIMAL(10,2)` | NOT NULL | Nightly rate in USD |
| `capacity` | `TINYINT` | NOT NULL, DEFAULT 1 | Maximum guest count |
| `availability_status` | `ENUM('available','booked','maintenance')` | NOT NULL, DEFAULT 'available' | Current room state |
| `image_url` | `VARCHAR(500)` | NULL | Primary photo URL |
| `created_at` | `TIMESTAMP` | DEFAULT CURRENT_TIMESTAMP | Record creation time |
| `updated_at` | `TIMESTAMP` | ON UPDATE CURRENT_TIMESTAMP | Last modification time |

> **Composite unique constraint:** `(hotel_id, room_number)` — room numbers are unique **per hotel**, not globally. Room 101 can exist in multiple hotels.

---

### 4. `bookings`
Records a customer's reservation of a room for a specific date range.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | `INT` | PK, AUTO_INCREMENT | Unique booking identifier |
| `user_id` | `INT` | NOT NULL, FK → users.id | Customer who made the booking |
| `room_id` | `INT` | NOT NULL, FK → rooms.id | Room being reserved |
| `check_in` | `DATE` | NOT NULL | Arrival date |
| `check_out` | `DATE` | NOT NULL | Departure date |
| `total_price` | `DECIMAL(10,2)` | NOT NULL | Pre-calculated total (nights × price_per_night) |
| `booking_status` | `ENUM('pending','confirmed','cancelled','completed')` | NOT NULL, DEFAULT 'pending' | Lifecycle state |
| `created_at` | `TIMESTAMP` | DEFAULT CURRENT_TIMESTAMP | Record creation time |
| `updated_at` | `TIMESTAMP` | ON UPDATE CURRENT_TIMESTAMP | Last modification time |

> **Date constraint:** `CHECK (check_out > check_in)` is enforced natively on **MySQL 8.0.16+**. On older versions, enforce this in the application controller layer before inserting.

> **Total price:** Stored as a snapshot at booking time. This preserves the correct amount even if `price_per_night` is later updated on the room.

---

### 5. `payments`
Records a financial transaction associated with a booking.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | `INT` | PK, AUTO_INCREMENT | Unique payment identifier |
| `booking_id` | `INT` | NOT NULL, FK → bookings.id | Associated booking |
| `payment_method` | `ENUM('card','cash','online')` | NOT NULL | How payment was made |
| `amount` | `DECIMAL(10,2)` | NOT NULL | Amount charged or refunded |
| `payment_status` | `ENUM('pending','completed','refunded','failed')` | NOT NULL, DEFAULT 'pending' | Transaction state |
| `transaction_reference` | `VARCHAR(255)` | NULL, UNIQUE | External gateway reference ID |
| `created_at` | `TIMESTAMP` | DEFAULT CURRENT_TIMESTAMP | Record creation time |

> **Immutability:** Payments have no `updated_at` column by design. Payment records are treated as **immutable audit entries**. Refunds create a new payment record with a negative or reversed amount rather than mutating the original.

---

## 🔗 Relationship Explanations

### hotels → rooms (`1:N`)
```
hotels.id  ←──FK──  rooms.hotel_id
```
- One hotel owns **many rooms**.
- **ON DELETE CASCADE:** Deleting a hotel automatically removes all its rooms. This prevents orphaned room records.
- **ON UPDATE CASCADE:** If a hotel's primary key changes (rare), all child room FKs update automatically.

---

### users → bookings (`1:N`)
```
users.id  ←──FK──  bookings.user_id
```
- One user can make **many bookings** over time.
- **ON DELETE RESTRICT:** A user **cannot be deleted** while they have booking records. This preserves the booking audit trail and prevents data loss.
- **ON UPDATE CASCADE:** User PK changes propagate to bookings.

---

### rooms → bookings (`1:N`)
```
rooms.id  ←──FK──  bookings.room_id
```
- One room can appear in **many bookings** across different time periods.
- **ON DELETE RESTRICT:** A room **cannot be deleted** while historical bookings reference it. Deactivate rooms via `availability_status = 'maintenance'` instead.
- **ON UPDATE CASCADE:** Room PK changes propagate to bookings.

---

### bookings → payments (`1:1 logical, 1:N schema`)
```
bookings.id  ←──FK──  payments.booking_id
```
- Each booking has **one primary payment**.
- The schema allows multiple payment rows per booking (`1:N`) to support **refund records** without mutation.
- **ON DELETE RESTRICT:** A booking with a payment record cannot be deleted — it must be cancelled via status update.
- **ON UPDATE CASCADE:** Booking PK changes propagate to payments.

---

## 🔑 Primary Keys

| Table | PK Column | Type |
|-------|-----------|------|
| `users` | `id` | INT AUTO_INCREMENT |
| `hotels` | `id` | INT AUTO_INCREMENT |
| `rooms` | `id` | INT AUTO_INCREMENT |
| `bookings` | `id` | INT AUTO_INCREMENT |
| `payments` | `id` | INT AUTO_INCREMENT |

All primary keys use `INT AUTO_INCREMENT` for simplicity and join performance. For distributed systems, consider `BIGINT` or `UUID`.

---

## 🔗 Foreign Keys

| FK Name | Child Table | Child Column | Parent Table | Parent Column | ON DELETE | ON UPDATE |
|---------|-------------|--------------|--------------|---------------|-----------|-----------|
| `fk_rooms_hotel` | `rooms` | `hotel_id` | `hotels` | `id` | CASCADE | CASCADE |
| `fk_bookings_user` | `bookings` | `user_id` | `users` | `id` | RESTRICT | CASCADE |
| `fk_bookings_room` | `bookings` | `room_id` | `rooms` | `id` | RESTRICT | CASCADE |
| `fk_payments_booking` | `payments` | `booking_id` | `bookings` | `id` | RESTRICT | CASCADE |

---

## 📈 Indexing Strategy

| Index Name | Table | Columns | Type | Rationale |
|-----------|-------|---------|------|-----------|
| `uq_users_email` | `users` | `email` | UNIQUE | Fast login lookup; prevents duplicate accounts |
| `uq_rooms_hotel_number` | `rooms` | `(hotel_id, room_number)` | UNIQUE | Scoped uniqueness for room numbers per hotel |
| `uq_payments_transaction` | `payments` | `transaction_reference` | UNIQUE | Prevents duplicate gateway charge references |
| `idx_hotels_city` | `hotels` | `city` | INDEX | Search/filter hotels by city |
| `idx_rooms_hotel_id` | `rooms` | `hotel_id` | INDEX | JOIN performance when loading a hotel's rooms |
| `idx_rooms_availability` | `rooms` | `availability_status` | INDEX | Filter available rooms quickly |
| `idx_rooms_type_price` | `rooms` | `(room_type, price_per_night)` | INDEX | Sort/filter by type and price range |
| `idx_bookings_user_id` | `bookings` | `user_id` | INDEX | "My bookings" user query |
| `idx_bookings_room_id` | `bookings` | `room_id` | INDEX | Room availability overlap check |
| `idx_bookings_status` | `bookings` | `booking_status` | INDEX | Admin filter by status |
| `idx_bookings_dates` | `bookings` | `(check_in, check_out)` | INDEX | Date-range overlap queries |
| `idx_payments_booking_id` | `payments` | `booking_id` | INDEX | Payment lookup for a booking |
| `idx_payments_status` | `payments` | `payment_status` | INDEX | Admin filter by payment status |

---

## 🌱 Seed Data Summary

| Entity | Count | Details |
|--------|-------|---------|
| Admin users | 1 | `admin@hotelbooking.com` |
| Customer users | 2 | `john.doe@example.com`, `jane.smith@example.com` |
| Hotels | 3 | Miami, Aspen, New York |
| Rooms | 10 | 4 (Miami) + 3 (Aspen) + 3 (New York) |

> ⚠️ **All seed passwords are plain-text placeholders.** Replace with `bcrypt.hashSync('password', 12)` before running in any shared or live environment.

---

## 🚀 Future Scalability Notes

### Short-Term (Phase 2–3)
- **Room images:** Add a separate `room_images` table (`id`, `room_id`, `url`, `sort_order`) to support multiple photos per room instead of a single `image_url` column.
- **Hotel amenities:** Add an `amenities` table with a `hotel_amenities` junction table (many-to-many).
- **Reviews:** Add a `reviews` table (`id`, `user_id`, `hotel_id`, `rating`, `comment`, `created_at`).

### Medium-Term (Phase 4–5)
- **Booking overlap prevention:** Add a MySQL stored procedure or enforce via app-layer query:
  ```sql
  SELECT id FROM bookings
  WHERE room_id = ? AND booking_status != 'cancelled'
    AND check_in < ? AND check_out > ?
  ```
- **Currency support:** Add a `currency` column (`CHAR(3)`, DEFAULT `'USD'`) to `payments` for multi-currency support.
- **Soft deletes:** Add `deleted_at TIMESTAMP NULL` to `users`, `hotels`, and `rooms` for recoverable deletion.

### Long-Term (Phase 6+)
- **Read replicas:** The connection pool in `config/db.js` can be extended to route `SELECT` queries to a read replica.
- **INT → BIGINT PKs:** Migrate to `BIGINT` primary keys if the system scales beyond ~2 billion records.
- **Partitioning:** Partition the `bookings` table by `check_in` year/month for large datasets.
- **Full-text search:** Add `FULLTEXT` index on `hotels(name, city, description)` for search functionality.
- **Audit log table:** Add a generic `audit_logs` table to track who changed what and when across all entities.

---

## 📄 Files

| File | Location | Purpose |
|------|----------|---------|
| `database.sql` | `backend/database/database.sql` | Executable schema + seed data |
| `DATABASE_DESIGN.md` | `DATABASE_DESIGN.md` | This document |
