# TutorLink
## AI-Powered Tutor Booking Platform with Live Classes and Smart Notifications

**TutorLink** is a comprehensive, web-based tutor booking platform designed for Bangladesh (BDT currency, Asia/Dhaka timezone, SSLCommerz payment gateway, and bKash/Nagad/Rocket mobile financial services).

---

### Project Architecture & Documentation

- Comprehensive System Blueprint & Audit: **[architecture.md](architecture.md)**
- Database Data Contract: **[server/src/prisma/contract.prisma](server/src/prisma/contract.prisma)**
- Server Environment Configuration: **[server/.env.example](server/.env.example)**

---

### Key Capabilities

1. **Role-Based Authentication**:
   - Students, Tutors, and Administrators.
   - 15-minute JWT Access Tokens + SHA-256 hashed DB refresh tokens with rotation and token-family reuse detection.
2. **Student & Tutor Profiles**:
   - Student academic level, institution, department, and location.
   - Tutor qualifications, subjects, hourly rates (BDT), experience, and payout methods (bKash, Nagad, Rocket).
3. **Public Tutor Discovery**:
   - Filter and search tutors by keyword, subject, hourly rate, rating, and location with pagination.
   - Public view of tutor qualifications, reviews, and availability windows.
4. **Availability & Booking State Machine**:
   - Recurring weekly availability schedules with overlap protection.
   - Conflict-free session booking with Asia/Dhaka day boundaries.
   - Lifecycle: `PENDING` -> `CONFIRMED` -> `COMPLETED` (or `CANCELLED` / `REJECTED`).
5. **Live Classes (Section 3.6)**:
   - In-app live class session management with deterministic secure room access (`GET /api/bookings/:id/live-class`).
6. **SSLCommerz Payment Gateway (Section 3.7)**:
   - Local Bangladesh payment rails (Credit/Debit cards, bKash, Nagad, Rocket, Net Banking).
   - Server-to-server transaction validation (`validationserverAPI.php`) and IPN handling.
   - 10% platform commission calculation upon booking completion.
7. **Refund Management**:
   - Students request refunds for cancelled sessions; admins approve or reject requests.
8. **Smart Notifications (Section 3.8)**:
   - Automated instant notifications via Telegram Bot API for booking requests, decisions, payments, and class reminders.
   - User account linking (`POST /api/notifications/telegram/link`).
   - In-app notification center with unread badge tracking.
9. **Document Verification (Section 3.9)**:
   - Verification submissions for NID, student ID cards, and academic certificates.
   - AI assessment integration and administrator approval queue (auto-verifies tutor on approval).
10. **Reviews and Ratings (Section 3.10)**:
    - 1-to-5 star student reviews for completed sessions with automatic tutor rating aggregation.
11. **Admin Platform Operations (Section 3.11)**:
    - Platform metrics & GMV calculation.
    - User account activation/deactivation.
    - MFS tutor payout approval and disbursement logging.
12. **AI Tutor Recommendations (Section 3.4)**:
    - Personalized tutor recommendations matching subjects, rating, proximity, and past history.

---

### Seeded Test Accounts

The database includes the following ready-to-use test accounts:

| Role | Email | Password | Details |
| :--- | :--- | :--- | :--- |
| **Admin** | `admin@tutorlink.com` | `Admin@123456` | Platform Administrator |
| **Tutor** | `tutor@tutorlink.com` | `Tutor@123456` | Dr. Tanvir Ahmed (BUET M.Sc, Verified, ৳600/hr, bKash) |
| **Student** | `student@tutorlink.com` | `Student@123456` | Nafis Rahman (Notre Dame College, HSC) |

---

### Quick Start Guide

#### Prerequisites
- Node.js >= 20.x
- PostgreSQL 15+ running locally (or remote connection string)

#### 1. Setup Backend Environment
```bash
cd server
cp .env.example .env
# Edit .env with your PostgreSQL credentials and SSLCOMMERZ/JWT keys
```

#### 2. Install Dependencies
```bash
npm install
```

#### 3. Database Migration, Verify & Seed
```bash
npm run contract:emit
npm run db:verify
npm run seed
```

#### 4. Run Development Server
```bash
npm run dev
# Server runs on http://localhost:5000
# Health check: http://localhost:5000/api/health
```

---

### API Route Overview

| Module | Route Prefix | Key Endpoints |
| :--- | :--- | :--- |
| **Auth** | `/api/auth` | `POST /register`, `POST /login`, `POST /refresh`, `POST /logout`, `GET /me` |
| **Students** | `/api/students` | `GET /me`, `PATCH /me`, `GET /:studentId` |
| **Tutors** | `/api/tutors` | `GET /` (Public), `GET /:tutorId` (Public), `GET /:tutorId/availability`, `GET /me`, `PATCH /me`, `GET /me/payouts`, `/availability` |
| **Bookings** | `/api/bookings` | `POST /`, `GET /`, `GET /:bookingId`, `PATCH /:id/respond`, `PATCH /:id/cancel`, `PATCH /:id/complete`, `GET /:id/live-class` |
| **Payments** | `/api/payments` | `POST /`, `GET /`, `GET /:paymentId`, `POST /sslcommerz/success`, `/fail`, `/cancel`, `/ipn` |
| **Refunds** | `/api/refunds` | `POST /`, `GET /my-refunds`, `GET /admin/all`, `PATCH /admin/:id` |
| **Verification** | `/api/verification` | `POST /submit`, `GET /my-requests`, `GET /admin/requests`, `PATCH /admin/requests/:id` |
| **Reviews** | `/api/reviews` | `POST /`, `GET /tutors/:tutorId` |
| **Notifications** | `/api/notifications` | `GET /`, `GET /unread-count`, `PATCH /:id/read`, `POST /telegram/link` |
| **Admin** | `/api/admin` | `GET /analytics`, `GET /users`, `PATCH /users/:id/status`, `GET /payouts`, `PATCH /payouts/:id/disburse` |
| **Recommendations**| `/api/recommendations`| `GET /tutors` |
