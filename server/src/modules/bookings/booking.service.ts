import { db } from "../../prisma/db";
import { ApiError } from "../../utils/ApiError";
import type { CreateBookingInput } from "./booking.validation";
import { isWithinTutorAvailability } from "./booking.helpers";
import {
  notifyBookingRequested,
  notifyBookingDecision,
} from "../notifications/telegram.service";
import { createNotification } from "../notifications/notification.service";

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

  const studentUser = await db.orm.public.User.where({ id: studentUserId }).first();

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

  const booking = await db.orm.public.Booking.create({
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

  // Dispatch notifications (Telegram & In-App)
  const tutorUser = await db.orm.public.User.where({ id: tutor.userId }).first();
  if (tutorUser) {
    await notifyBookingRequested(tutorUser.phone || null, {
      bookingId: booking.id,
      studentName: studentUser?.name || "Student",
      startAt,
      durationMin: input.durationMin,
      amount: totalAmount.toFixed(2),
    }).catch(() => null);

    await createNotification(
      tutorUser.id,
      "BOOKING_UPDATE",
      "New Booking Request",
      `Student ${studentUser?.name || "Someone"} requested a ${input.durationMin}-min tutoring session.`
    );
  }

  return booking;
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

  const tutorUser = await db.orm.public.User.where({ id: tutorUserId }).first();

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
  const updatedBooking = await db.orm.public.Booking
    .where({ id: bookingId })
    .update({
      status: decision,
      tutorMessage: tutorMessage ?? null,
    });

  // Notify student (Telegram & In-App)
  const student = await db.orm.public.StudentProfile.where({ id: booking.studentId }).first();
  const studentUser = student
    ? await db.orm.public.User.where({ id: student.userId }).first()
    : null;

  if (studentUser) {
    await notifyBookingDecision(studentUser.phone || null, {
      bookingId: booking.id,
      tutorName: tutorUser?.name || "Tutor",
      decision,
      tutorMessage,
    }).catch(() => null);

    await createNotification(
      studentUser.id,
      "BOOKING_UPDATE",
      `Booking ${decision}`,
      `Your booking request #${booking.id} was ${decision.toLowerCase()} by ${tutorUser?.name || "the tutor"}.`
    );
  }

  return updatedBooking;
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

  const updatedBooking = await db.orm.public.Booking
    .where({ id: bookingId })
    .update({
      status: "COMPLETED",
    });

  // Calculate 10% platform commission model (Section 3.7)
  const grossAmount = Number(booking.totalAmount);
  const commissionRate = 0.10;
  const commissionAmount = Number((grossAmount * commissionRate).toFixed(2));
  const netAmount = Number((grossAmount - commissionAmount).toFixed(2));

  // Auto-generate tutor payout record
  try {
    let existingPayout = null;
    try {
      existingPayout = await db.orm.public.TutorPayout
        .where({ bookingId: booking.id })
        .first();
    } catch {
      existingPayout = null;
    }

    if (!existingPayout && tutor.payoutMethod && tutor.accountNumber) {
      await db.orm.public.TutorPayout.create({
        bookingId: booking.id,
        tutorProfileId: tutor.id,
        grossAmount: grossAmount.toFixed(2),
        commissionRate: commissionRate.toFixed(2),
        commissionAmount: commissionAmount.toFixed(2),
        netAmount: netAmount.toFixed(2),
        currency: "BDT",
        payoutMethod: tutor.payoutMethod,
        payoutAccountNumber: tutor.accountNumber,
        status: "PENDING",
      });
    }
  } catch (err) {
    console.warn("Could not create payout record for completed booking:", err);
  }

  // Notify tutor
  await createNotification(
    tutorUserId,
    "BOOKING_UPDATE",
    "Session Completed",
    `Booking #${booking.id} is marked complete. Net earnings: ৳${netAmount} BDT (10% platform commission applied).`
  );

  return updatedBooking;
};
