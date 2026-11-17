
import { db } from "../../prisma/db";
import { ApiError } from "../../utils/ApiError";

export const createPayment = async (
  studentUserId: number,
  bookingId: number,
  idempotencyKey: string
) => {
  // 1. Find the student's profile.
  const student = await db.orm.public.StudentProfile
    .where({ userId: studentUserId })
    .first();

  if (!student) {
    throw new ApiError(404, "Student profile not found");
  }

  // 2. Find the booking.
  const booking = await db.orm.public.Booking
    .where({ id: bookingId })
    .first();

  if (!booking) {
    throw new ApiError(404, "Booking not found");
  }

  // 3. Verify booking ownership.
  if (booking.studentId !== student.id) {
    throw new ApiError(
      403,
      "You are not authorized to pay for this booking"
    );
  }

  // 4. Only confirmed bookings can be paid.
  if (booking.status !== "CONFIRMED") {
    throw new ApiError(
      400,
      "Only confirmed bookings can be paid"
    );
  }

  // 5. Check whether this idempotency key was already used.
  const existingByKey = await db.orm.public.Payment
    .where({ idempotencyKey })
    .first();

  if (existingByKey) {
    if (
      existingByKey.bookingId !== booking.id ||
      existingByKey.payerId !== studentUserId
    ) {
      throw new ApiError(
        409,
        "This idempotency key has already been used"
      );
    }

    return existingByKey;
  }

  // 6. Find previous payment attempts for this booking.
  const existingPayments = await db.orm.public.Payment
    .where({ bookingId: booking.id })
    .all();

  // Prevent paying an already-paid booking.
  const successfulPayment = existingPayments.find(
    (payment) => payment.status === "SUCCEEDED"
  );

  if (successfulPayment) {
    throw new ApiError(
      409,
      "This booking has already been paid"
    );
  }

  // Prevent multiple active payment attempts.
  const pendingPayment = existingPayments.find(
    (payment) => payment.status === "PENDING"
  );

  if (pendingPayment) {
    return pendingPayment;
  }

  // 7. Calculate payment amount from the booking record.
  const amount = Number(booking.totalAmount);

  if (!Number.isFinite(amount) || amount <= 0) {
    throw new ApiError(
      400,
      "Invalid booking payment amount"
    );
  }

  // 8. Create a pending payment record.
  return db.orm.public.Payment.create({
    bookingId: booking.id,
    payerId: studentUserId,
    amount: amount.toFixed(2),
    currency: "BDT",
    idempotencyKey,
    status: "PENDING",
  });
};
