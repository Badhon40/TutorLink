
import { db } from "../../prisma/db";
import { ApiError } from "../../utils/ApiError";
import type { CreateBookingInput } from "./booking.validation";
import { isWithinTutorAvailability } from "./booking.helpers";

export const createBooking = async (
  studentUserId: number,
  input: CreateBookingInput
) => {
  // Find the student's profile.
  const student = await db.orm.public.StudentProfile
    .where({ userId: studentUserId })
    .first();

  if (!student) {
    throw new ApiError(404, "Student profile not found");
  }

  // Find the tutor's profile.
  const tutor = await db.orm.public.TutorProfile
    .where({ id: input.tutorId })
    .first();

  if (!tutor) {
    throw new ApiError(404, "Tutor profile not found");
  }

  if (!tutor.isVerified) {
    throw new ApiError(403, "This tutor is not verified");
  }

  if (tutor.userId === studentUserId) {
    throw new ApiError(400, "You cannot book your own tutor profile");
  }

  const startAt = input.startAt;
  const endAt = new Date(
    startAt.getTime() + input.durationMin * 60 * 1000
  );

  // Check tutor availability.
  const availability = await db.orm.public.TutorAvailability
    .where({
      tutorProfileId: tutor.id,
      isAvailable: true,
    })
    .all();

  const isAvailable = isWithinTutorAvailability(
    { startAt, endAt },
    availability
  );

  if (!isAvailable) {
    throw new ApiError(
      400,
      "The requested time is outside the tutor's availability"
    );
  }

  // Check for overlapping active bookings.
  const existingBookings = await db.orm.public.Booking
    .where({ tutorId: tutor.id })
    .all();

  const hasConflict = existingBookings.some((booking) => {
    if (
      booking.status !== "PENDING" &&
      booking.status !== "CONFIRMED"
    ) {
      return false;
    }

    return (
      startAt < booking.endAt &&
      endAt > booking.startAt
    );
  });

  if (hasConflict) {
    throw new ApiError(
      409,
      "The tutor already has a booking during this time"
    );
  }

  // Calculate the amount using the tutor's current hourly rate.
  const hourlyRate = Number(tutor.hourlyRate);
  const totalAmount =
    (hourlyRate * input.durationMin) / 60;

  if (!Number.isFinite(totalAmount) || totalAmount <= 0) {
    throw new ApiError(400, "Tutor hourly rate is invalid");
  }

  return db.orm.public.Booking.create({
    studentId: student.id,
    tutorId: tutor.id,
    startAt,
    endAt,
    durationMin: input.durationMin,
    hourlyRate: hourlyRate.toString(),
    totalAmount: totalAmount.toFixed(2),
    status: "PENDING",
    studentMessage: input.studentMessage ?? null,
  });
};

export const getBookingById = async (bookingId: number) => {
  const booking = await db.orm.public.Booking
    .where({ id: bookingId })
    .first();

  if (!booking) {
    throw new ApiError(404, "Booking not found");
  }

  return booking;
};



type BookingUserRole = "STUDENT" | "TUTOR";

export const getMyBookings = async (
  userId: number,
  role: BookingUserRole,
  options?: {
    status?: string;
    page?: number;
    limit?: number;
  }
) => {
  const page = options?.page ?? 1;
  const limit = options?.limit ?? 10;

  let bookings;

  if (role === "STUDENT") {
    const profile = await db.orm.public.StudentProfile
      .where({ userId })
      .first();

    if (!profile) {
      throw new ApiError(404, "Student profile not found");
    }

    bookings = await db.orm.public.Booking
      .where({ studentId: profile.id })
      .all();
  } else {
    const profile = await db.orm.public.TutorProfile
      .where({ userId })
      .first();

    if (!profile) {
      throw new ApiError(404, "Tutor profile not found");
    }

    bookings = await db.orm.public.Booking
      .where({ tutorId: profile.id })
      .all();
  }

  let filteredBookings = bookings;

  if (options?.status) {
    filteredBookings = filteredBookings.filter(
      (booking) => booking.status === options.status
    );
  }

  filteredBookings.sort(
    (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
  );

  const total = filteredBookings.length;
  const totalPages = Math.ceil(total / limit);
  const startIndex = (page - 1) * limit;

  return {
    bookings: filteredBookings.slice(startIndex, startIndex + limit),
    pagination: {
      total,
      page,
      limit,
      totalPages,
    },
  };
};



export const respondToBooking = async (
  tutorUserId: number,
  bookingId: number,
  decision: "CONFIRMED" | "REJECTED",
  tutorMessage?: string | null
) => {
  // Find the tutor profile.
  const tutor = await db.orm.public.TutorProfile
    .where({ userId: tutorUserId })
    .first();

  if (!tutor) {
    throw new ApiError(404, "Tutor profile not found");
  }

  // Find the booking.
  const booking = await getBookingById(bookingId);

  // Verify booking ownership.
  if (booking.tutorId !== tutor.id) {
    throw new ApiError(
      403,
      "You are not authorized to respond to this booking"
    );
  }

  // Only pending bookings can be accepted or rejected.
  if (booking.status !== "PENDING") {
    throw new ApiError(
      400,
      "Only pending bookings can be accepted or rejected"
    );
  }

  // Update booking status.
  return await db.orm.public.Booking
    .where({ id: bookingId })
    .update({
      status: decision,
      tutorMessage: tutorMessage ?? null,
    });
};



export const cancelBooking = async (
  userId: number,
  role: BookingUserRole,
  bookingId: number,
  cancellationReason: string
) => {
  let profileId: number;

  if (role === "STUDENT") {
    const profile = await db.orm.public.StudentProfile
      .where({ userId })
      .first();

    if (!profile) {
      throw new ApiError(404, "Student profile not found");
    }

    profileId = profile.id;
  } else {
    const profile = await db.orm.public.TutorProfile
      .where({ userId })
      .first();

    if (!profile) {
      throw new ApiError(404, "Tutor profile not found");
    }

    profileId = profile.id;
  }

  const booking = await getBookingById(bookingId);

  const isOwner =
    role === "STUDENT"
      ? booking.studentId === profileId
      : booking.tutorId === profileId;

  if (!isOwner) {
    throw new ApiError(
      403,
      "You are not authorized to cancel this booking"
    );
  }

  if (!["PENDING", "CONFIRMED"].includes(booking.status)) {
    throw new ApiError(
      400,
      "Only pending or confirmed bookings can be cancelled"
    );
  }

  return await db.orm.public.Booking
    .where({ id: bookingId })
    .update({
      status: "CANCELLED",
      cancellationReason,
    });
};



export const completeBooking = async (
  tutorUserId: number,
  bookingId: number
) => {
  // Find tutor profile.
  const tutor = await db.orm.public.TutorProfile
    .where({ userId: tutorUserId })
    .first();

  if (!tutor) {
    throw new ApiError(404, "Tutor profile not found");
  }

  // Find booking.
  const booking = await getBookingById(bookingId);

  // Verify ownership.
  if (booking.tutorId !== tutor.id) {
    throw new ApiError(
      403,
      "You are not authorized to complete this booking"
    );
  }

  // Only confirmed bookings can be completed.
  if (booking.status !== "CONFIRMED") {
    throw new ApiError(
      400,
      "Only confirmed bookings can be completed"
    );
  }

  // Ensure the scheduled lesson has ended.
  if (booking.endAt.getTime() > Date.now()) {
    throw new ApiError(
      400,
      "A booking cannot be completed before its scheduled end time"
    );
  }

  return await db.orm.public.Booking
    .where({ id: bookingId })
    .update({
      status: "COMPLETED",
    });
};
