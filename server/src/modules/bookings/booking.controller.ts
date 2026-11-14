
import type { Request, Response } from "express";

import type { AuthenticatedUser } from "../../middlewares/auth.middleware";
import { ApiError } from "../../utils/ApiError";
import { ApiResponse } from "../../utils/ApiResponse";

import {
  createBooking,
  getBookingById,
  getMyBookings,
  respondToBooking,
  cancelBooking,
  completeBooking,
} from "./booking.service";

import {
  createBookingSchema,
  bookingIdSchema,
  bookingListQuerySchema,
  bookingDecisionSchema,
  cancelBookingSchema,
} from "./booking.validation";

// Create a booking request.
export const createMyBooking = async (
  req: Request,
  res: Response
) => {
  const auth = res.locals.auth as AuthenticatedUser;

  const parsed = createBookingSchema.safeParse(req.body);

  if (!parsed.success) {
    throw new ApiError(400, "Invalid booking data");
  }

  const booking = await createBooking(auth.userId, parsed.data);

  return res.status(201).json(
    new ApiResponse(201, "Booking request created successfully", booking)
  );
};

// Retrieve a booking by ID.
export const getBooking = async (
  req: Request,
  res: Response
) => {
  const parsed = bookingIdSchema.safeParse(req.params);

  if (!parsed.success) {
    throw new ApiError(400, "Invalid booking ID");
  }

  const booking = await getBookingById(parsed.data.bookingId);
  const auth = res.locals.auth as AuthenticatedUser;

  // Only the student or tutor involved can view the booking.
  let authorized = false;

  if (auth.role === "STUDENT") {
    const profile = await import("../../prisma/db.js").then(({ db }) =>
      db.orm.public.StudentProfile.where({ userId: auth.userId }).first()
    );

    authorized = profile?.id === booking.studentId;
  }

  if (auth.role === "TUTOR") {
    const profile = await import("../../prisma/db.js").then(({ db }) =>
      db.orm.public.TutorProfile.where({ userId: auth.userId }).first()
    );

    authorized = profile?.id === booking.tutorId;
  }

  if (!authorized && auth.role !== "ADMIN") {
    throw new ApiError(403, "You cannot access this booking");
  }

  return res.status(200).json(
    new ApiResponse(200, "Booking retrieved successfully", booking)
  );
};

// List current user's bookings.
export const listMyBookings = async (
  req: Request,
  res: Response
) => {
  const auth = res.locals.auth as AuthenticatedUser;

  if (auth.role === "ADMIN") {
    throw new ApiError(403, "Admins cannot use this endpoint");
  }

  const parsed = bookingListQuerySchema.safeParse(req.query);

  if (!parsed.success) {
    throw new ApiError(400, "Invalid booking query parameters");
  }

  const result = await getMyBookings(
    auth.userId,
    auth.role,
    parsed.data
  );

  return res.status(200).json(
    new ApiResponse(200, "Bookings retrieved successfully", result)
  );
};

// Tutor accepts or rejects a booking.
export const respondToMyBooking = async (
  req: Request,
  res: Response
) => {
  const auth = res.locals.auth as AuthenticatedUser;

  const params = bookingIdSchema.safeParse(req.params);
  const body = bookingDecisionSchema.safeParse(req.body);

  if (!params.success || !body.success) {
    throw new ApiError(400, "Invalid booking response data");
  }

  const booking = await respondToBooking(
    auth.userId,
    params.data.bookingId,
    body.data.decision,
    body.data.tutorMessage
  );

  return res.status(200).json(
    new ApiResponse(200, "Booking response submitted successfully", booking)
  );
};

// Student or tutor cancels a booking.
export const cancelMyBooking = async (
  req: Request,
  res: Response
) => {
  const auth = res.locals.auth as AuthenticatedUser;

  if (auth.role === "ADMIN") {
    throw new ApiError(403, "Admins cannot use this endpoint");
  }

  const params = bookingIdSchema.safeParse(req.params);
  const body = cancelBookingSchema.safeParse(req.body);

  if (!params.success || !body.success) {
    throw new ApiError(400, "Invalid cancellation data");
  }

  const booking = await cancelBooking(
    auth.userId,
    auth.role,
    params.data.bookingId,
    body.data.cancellationReason
  );

  return res.status(200).json(
    new ApiResponse(200, "Booking cancelled successfully", booking)
  );
};

// Tutor marks a booking as completed.
export const completeMyBooking = async (
  req: Request,
  res: Response
) => {
  const auth = res.locals.auth as AuthenticatedUser;

  const params = bookingIdSchema.safeParse(req.params);

  if (!params.success) {
    throw new ApiError(400, "Invalid booking ID");
  }

  const booking = await completeBooking(
    auth.userId,
    params.data.bookingId
  );

  return res.status(200).json(
    new ApiResponse(200, "Booking completed successfully", booking)
  );
};
