# TutorLink API Documentation

## Base URL

```text
http://localhost:5000
```

Protected endpoints require:

```http
Authorization: Bearer <accessToken>
Content-Type: application/json
```

Most successful responses use this format:

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Operation successful",
  "data": {}
}
```

Errors use this format:

```json
{
  "success": false,
  "statusCode": 400,
  "message": "Invalid request",
  "errors": {}
}
```

## Health

| Method | Endpoint | Auth |
|---|---|---|
| GET | `/` | Public |
| GET | `/api/health` | Public |
| GET | `/api/health/db` | Public |
| GET | `/api/health/live-classes` | Public |

## Authentication

### Register

`POST /api/auth/register`

```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "username": "johndoe",
  "password": "Password123",
  "phone": "01700000000",
  "role": "STUDENT"
}
```

`role` can be `STUDENT` or `TUTOR`.

### Login

`POST /api/auth/login`

```json
{
  "identifier": "student@tutorlink.com",
  "password": "Student@123456"
}
```

The response contains an access token. A refresh token is returned as an
HTTP-only cookie named `refreshToken`.

### Refresh and logout

| Method | Endpoint | Body/Auth |
|---|---|---|
| POST | `/api/auth/refresh` | Refresh-token cookie |
| POST | `/api/auth/logout` | Refresh-token cookie |
| GET | `/api/auth/me` | Bearer token |

## Students

| Method | Endpoint | Roles |
|---|---|---|
| GET | `/api/students/me` | STUDENT |
| PATCH | `/api/students/me` | STUDENT |
| GET | `/api/students/:studentId` | STUDENT, TUTOR, ADMIN |

`PATCH /api/students/me`:

```json
{
  "institution": "Notre Dame College",
  "department": "Science",
  "educationLevel": "HSC",
  "location": "Dhaka",
  "profileImage": "https://example.com/profile.jpg"
}
```

## Tutors

### Public discovery

| Method | Endpoint |
|---|---|
| GET | `/api/tutors` |
| GET | `/api/tutors/:tutorId` |
| GET | `/api/tutors/:tutorId/availability` |

`GET /api/tutors` supports:

```text
search, subject, location, minRate, maxRate, minRating, page, limit
```

Example:

```text
/api/tutors?subject=Mathematics&minRate=300&maxRate=1000&page=1&limit=10
```

### Tutor profile and availability

| Method | Endpoint |
|---|---|
| GET | `/api/tutors/me` |
| PATCH | `/api/tutors/me` |
| GET | `/api/tutors/me/payouts` |
| POST | `/api/tutors/availability` |
| GET | `/api/tutors/availability` |
| PUT | `/api/tutors/availability/:availabilityId` |
| DELETE | `/api/tutors/availability/:availabilityId` |

All endpoints in this section require a TUTOR token.

`PATCH /api/tutors/me`:

```json
{
  "qualification": "M.Sc. in Computer Science",
  "institution": "BUET",
  "department": "CSE",
  "experienceYears": 5,
  "bio": "Experienced programming tutor.",
  "subjects": ["Programming", "Mathematics"],
  "hourlyRate": 600,
  "location": "Dhaka",
  "profileImage": "https://example.com/tutor.jpg",
  "accountNumber": "01700000000",
  "payoutMethod": "BKASH"
}
```

`payoutMethod` can be `BKASH`, `NAGAD`, or `ROCKET`.

`POST /api/tutors/availability`:

```json
{
  "dayOfWeek": 1,
  "startTime": "10:00",
  "endTime": "12:00",
  "isAvailable": true
}
```

`dayOfWeek` uses Sunday `0` through Saturday `6`.

## Bookings

| Method | Endpoint | Roles |
|---|---|---|
| POST | `/api/bookings` | STUDENT |
| GET | `/api/bookings` | STUDENT, TUTOR |
| GET | `/api/bookings/:bookingId` | STUDENT, TUTOR, ADMIN |
| PATCH | `/api/bookings/:bookingId/respond` | TUTOR |
| PATCH | `/api/bookings/:bookingId/cancel` | STUDENT, TUTOR |
| PATCH | `/api/bookings/:bookingId/complete` | TUTOR |
| GET | `/api/bookings/:bookingId/live-class` | STUDENT, TUTOR, ADMIN |

`POST /api/bookings`:

```json
{
  "tutorId": 2,
  "startAt": "2026-12-01T10:00:00.000Z",
  "durationMin": 60,
  "studentMessage": "Please focus on calculus."
}
```

`GET /api/bookings` supports:

```text
status, page, limit
```

Valid statuses are `PENDING`, `CONFIRMED`, `COMPLETED`, `CANCELLED`, and
`REJECTED`.

`PATCH /api/bookings/:bookingId/respond`:

```json
{
  "decision": "CONFIRMED",
  "tutorMessage": "Booking confirmed."
}
```

`decision` can be `CONFIRMED` or `REJECTED`.

`PATCH /api/bookings/:bookingId/cancel`:

```json
{
  "cancellationReason": "Unable to attend the scheduled session."
}
```

## Live classes

`GET /api/live-classes/:bookingId/token`

Requires an authenticated booking participant or ADMIN. The booking must be
`CONFIRMED`, and the request must be within the session window. Access opens
10 minutes before `startAt`.

Example response data:

```json
{
  "bookingId": 1,
  "roomId": "tutorlink-room-1",
  "token": "<room-token>",
  "wsUrl": "ws://localhost:5000/ws/live-class?token=<room-token>",
  "role": "student",
  "scheduledStartAt": "2026-12-01T10:00:00.000Z",
  "scheduledEndAt": "2026-12-01T11:00:00.000Z",
  "durationMin": 60
}
```

WebSocket messages:

```json
{ "type": "offer", "payload": { "sdp": {} } }
```

```json
{ "type": "answer", "payload": { "sdp": {} } }
```

```json
{ "type": "ice-candidate", "payload": { "candidate": {} } }
```

```json
{ "type": "leave" }
```

```json
{ "type": "ping" }
```

## Payments

| Method | Endpoint | Roles |
|---|---|---|
| POST | `/api/payments` | STUDENT |
| GET | `/api/payments` | STUDENT |
| GET | `/api/payments/:paymentId` | STUDENT |

`POST /api/payments`:

```json
{
  "bookingId": 1,
  "idempotencyKey": "booking-1-payment-unique",
  "phone": "01700000000",
  "address": "House 10, Road 5",
  "city": "Dhaka",
  "postcode": "1207"
}
```

SSLCommerz callbacks are public gateway endpoints:

```text
POST /api/payments/sslcommerz/success
POST /api/payments/sslcommerz/fail
POST /api/payments/sslcommerz/cancel
POST /api/payments/sslcommerz/ipn
```

These endpoints accept SSLCommerz form data using
`application/x-www-form-urlencoded`.

## Refunds

| Method | Endpoint | Roles |
|---|---|---|
| POST | `/api/refunds` | STUDENT |
| GET | `/api/refunds/my-refunds` | STUDENT |
| GET | `/api/refunds/admin/all` | ADMIN |
| PATCH | `/api/refunds/admin/:id` | ADMIN |

`POST /api/refunds`:

```json
{
  "paymentId": 1,
  "reason": "The tutor cancelled the confirmed session."
}
```

`PATCH /api/refunds/admin/:id`:

```json
{
  "status": "SUCCEEDED",
  "providerRefundId": "REF-123456"
}
```

`status` can be `SUCCEEDED` or `FAILED`.

## Verification

| Method | Endpoint | Roles |
|---|---|---|
| POST | `/api/verification/submit` | STUDENT, TUTOR |
| GET | `/api/verification/my-requests` | STUDENT, TUTOR |
| GET | `/api/verification/admin/requests` | ADMIN |
| PATCH | `/api/verification/admin/requests/:id` | ADMIN |

`POST /api/verification/submit`:

```json
{
  "documentType": "NID",
  "fileObjectKey": "verification/user-1/nid-front.jpg"
}
```

Valid document types are `NID`, `STUDENT_ID`, `ACADEMIC_CERTIFICATE`,
`ADMISSION_RECEIPT`, and `OTHER`.

`PATCH /api/verification/admin/requests/:id`:

```json
{
  "status": "APPROVED",
  "adminNote": "Document verified."
}
```

Valid statuses are `APPROVED`, `REJECTED`, and `RESUBMISSION_REQUIRED`.

## Reviews

| Method | Endpoint | Roles |
|---|---|---|
| POST | `/api/reviews` | STUDENT |
| GET | `/api/reviews/tutors/:tutorId` | Public |

`POST /api/reviews`:

```json
{
  "bookingId": 1,
  "rating": 5,
  "comment": "Excellent tutor and very helpful session."
}
```

`rating` must be between `1` and `5`.

## Notifications

| Method | Endpoint |
|---|---|
| GET | `/api/notifications` |
| GET | `/api/notifications/unread-count` |
| PATCH | `/api/notifications/:id/read` |
| POST | `/api/notifications/telegram/link` |

All notification endpoints require authentication.

`POST /api/notifications/telegram/link`:

```json
{
  "telegramChatId": "123456789"
}
```

## Recommendations

`GET /api/recommendations/tutors`

Requires a STUDENT token.

## Admin

All admin endpoints require an ADMIN token.

| Method | Endpoint |
|---|---|
| GET | `/api/admin/analytics` |
| GET | `/api/admin/users` |
| PATCH | `/api/admin/users/:id/status` |
| GET | `/api/admin/payouts` |
| PATCH | `/api/admin/payouts/:id/disburse` |

`GET /api/admin/users` supports `role` and `isActive` query parameters.

`PATCH /api/admin/users/:id/status`:

```json
{
  "isActive": false
}
```

`PATCH /api/admin/payouts/:id/disburse`:

```json
{
  "transferReference": "BKASH-TXN-123456",
  "adminNote": "Payout sent to tutor."
}
```

## Seed accounts

| Role | Email | Password |
|---|---|---|
| ADMIN | `admin@tutorlink.com` | `Admin@123456` |
| TUTOR | `tutor@tutorlink.com` | `Tutor@123456` |
| STUDENT | `student@tutorlink.com` | `Student@123456` |

