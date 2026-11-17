import type { Request, Response } from "express";

import type { AuthenticatedUser } from "../../middlewares/auth.middleware";
import { db } from "../../prisma/db";
import { ApiError } from "../../utils/ApiError";
import { ApiResponse } from "../../utils/ApiResponse";
import { getRoomAccessInfo } from "../live-classes/live-class.service";

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
    throw new ApiError(400, "Invalid booking data", parsed.error.flatten().fieldErrors);
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
    throw new ApiError(400, "Invalid booking ID", parsed.error.flatten().fieldErrors);
  }

  const booking = await getBookingById(parsed.data.bookingId);
  const auth = res.locals.auth as AuthenticatedUser;

  // Only the student or tutor involved (or admin) can view the booking.
  let authorized = false;

  if (auth.role === "STUDENT") {
    const profile = await db.orm.public.StudentProfile
      .where({ userId: auth.userId })
      .first();

    authorized = profile?.id === booking.studentId;
  }

  if (auth.role === "TUTOR") {
    const profile = await db.orm.public.TutorProfile
      .where({ userId: auth.userId })
      .first();

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
    throw new ApiError(400, "Invalid booking query parameters", parsed.error.flatten().fieldErrors);
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

  if (!params.success) {
    throw new ApiError(400, "Invalid booking ID", params.error.flatten().fieldErrors);
  }

  if (!body.success) {
    throw new ApiError(400, "Invalid booking response decision", body.error.flatten().fieldErrors);
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

  if (!params.success) {
    throw new ApiError(400, "Invalid booking ID", params.error.flatten().fieldErrors);
  }

  if (!body.success) {
    throw new ApiError(400, "Invalid cancellation reason", body.error.flatten().fieldErrors);
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
    throw new ApiError(400, "Invalid booking ID", params.error.flatten().fieldErrors);
  }

  const booking = await completeBooking(
    auth.userId,
    params.data.bookingId
  );

  return res.status(200).json(
    new ApiResponse(200, "Booking completed successfully", booking)
  );
};

// Live class access endpoint (Section 3.6)
// Delegates to live-class.service for full access control + signed room token
export const getBookingLiveClass = async (
  req: Request,
  res: Response
) => {
  const auth = res.locals.auth as AuthenticatedUser;
  const params = bookingIdSchema.safeParse(req.params);

  if (!params.success) {
    throw new ApiError(400, "Invalid booking ID", params.error.flatten().fieldErrors);
  }

  const accessInfo = await getRoomAccessInfo(
    params.data.bookingId,
    auth.userId,
    auth.role
  );

  return res.status(200).json(
    new ApiResponse(200, "Live class access granted", accessInfo)
  );
};
