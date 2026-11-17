import { Router } from "express";

import {
  authenticate,
  authorize,
} from "../../middlewares/auth.middleware";

import { catchAsync } from "../../utils/catchAsync";

import {
  createMyBooking,
  getBooking,
  listMyBookings,
  respondToMyBooking,
  cancelMyBooking,
  completeMyBooking,
  getBookingLiveClass,
} from "./booking.controller";

const router = Router();

// All booking routes require authentication.
router.use(authenticate);

// Student creates a booking.
router.post(
  "/",
  authorize("STUDENT"),
  catchAsync(createMyBooking)
);

// Student or tutor views their bookings.
router.get(
  "/",
  authorize("STUDENT", "TUTOR"),
  catchAsync(listMyBookings)
);

// Retrieve a specific booking.
router.get(
  "/:bookingId",
  authorize("STUDENT", "TUTOR", "ADMIN"),
  catchAsync(getBooking)
);

// Tutor accepts or rejects a booking.
router.patch(
  "/:bookingId/respond",
  authorize("TUTOR"),
  catchAsync(respondToMyBooking)
);

// Student or tutor cancels a booking.
router.patch(
  "/:bookingId/cancel",
  authorize("STUDENT", "TUTOR"),
  catchAsync(cancelMyBooking)
);

// Tutor marks a booking as completed.
router.patch(
  "/:bookingId/complete",
  authorize("TUTOR"),
  catchAsync(completeMyBooking)
);

// Retrieve live class session access
router.get(
  "/:bookingId/live-class",
  authorize("STUDENT", "TUTOR", "ADMIN"),
  catchAsync(getBookingLiveClass)
);

export default router;
