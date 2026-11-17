import { db } from "../../prisma/db";
import { ApiError } from "../../utils/ApiError";
import { env } from "../../config/env";
import {
  initiateSslcommerzCheckout,
  verifySslcommerzTransaction,
} from "./sslcommerz.service";
import {
  notifyPaymentSuccess,
  notifyLiveClassLink,
} from "../notifications/telegram.service";
import { createNotification } from "../notifications/notification.service";

interface CheckoutContactInput {
  phone?: string;
  address: string;
  city: string;
  postcode: string;
}

export const createPayment = async (
  studentUserId: number,
  bookingId: number,
  idempotencyKey: string,
  contactInfo: CheckoutContactInput
) => {
  // 1. Find user details
  const user = await db.orm.public.User.where({ id: studentUserId }).first();
  if (!user) {
    throw new ApiError(404, "User account not found");
  }

  // 2. Find the student's profile.
  const student = await db.orm.public.StudentProfile
    .where({ userId: studentUserId })
    .first();

  if (!student) {
    throw new ApiError(404, "Student profile not found");
  }

  // 3. Find the booking.
  const booking = await db.orm.public.Booking
    .where({ id: bookingId })
    .first();

  if (!booking) {
    throw new ApiError(404, "Booking not found");
  }

  // 4. Verify booking ownership.
  if (booking.studentId !== student.id) {
    throw new ApiError(
      403,
      "You are not authorized to pay for this booking"
    );
  }

  // 5. Only confirmed bookings can be paid.
  if (booking.status !== "CONFIRMED") {
    throw new ApiError(
      400,
      `Only confirmed bookings can be paid. Current status: ${booking.status}`
    );
  }

  // 6. Check whether this idempotency key was already used.
  let existingByKey = null;
  try {
    existingByKey = await db.orm.public.Payment
      .where({ idempotencyKey })
      .first();
  } catch {
    existingByKey = null;
  }

  if (existingByKey) {
    if (
      existingByKey.bookingId !== booking.id ||
      existingByKey.payerId !== studentUserId
    ) {
      throw new ApiError(
        409,
        "This idempotency key has already been used for another transaction"
      );
    }

    return existingByKey;
  }

  // 7. Find previous payment attempts for this booking.
  let existingPayments: any[] = [];
  try {
    existingPayments = await db.orm.public.Payment
      .where({ bookingId: booking.id })
      .all();
  } catch {
    existingPayments = [];
  }

  // Prevent paying an already-paid booking.
  const successfulPayment = existingPayments.find(
    (payment: any) => payment.status === "SUCCEEDED"
  );

  if (successfulPayment) {
    throw new ApiError(
      409,
      "This booking has already been paid successfully"
    );
  }

  // If there is an active pending payment with valid checkoutUrl, return it
  const activePending = existingPayments.find(
    (payment: any) => payment.status === "PENDING" && payment.checkoutUrl
  );
  if (activePending) {
    return activePending;
  }

  // 8. Calculate payment amount from the booking record.
  const amount = Number(booking.totalAmount);

  if (!Number.isFinite(amount) || amount <= 0) {
    throw new ApiError(
      400,
      "Invalid booking payment amount"
    );
  }

  // 9. Generate transaction reference
  const tranId = `TL-${booking.id}-${Date.now()}`;

  // 10. Call SSLCommerz API
  const checkoutSession = await initiateSslcommerzCheckout({
    tranId,
    amount: amount.toFixed(2),
    productName: `TutorLink Session #${booking.id}`,
    customer: {
      name: user.name,
      email: user.email,
      phone: contactInfo.phone || user.phone || "01700000000",
      address: contactInfo.address,
      city: contactInfo.city,
      postcode: contactInfo.postcode,
      country: "Bangladesh",
    },
    successUrl: `${env.API_BASE_URL}/api/payments/sslcommerz/success`,
    failUrl: `${env.API_BASE_URL}/api/payments/sslcommerz/fail`,
    cancelUrl: `${env.API_BASE_URL}/api/payments/sslcommerz/cancel`,
    ipnUrl: `${env.API_BASE_URL}/api/payments/sslcommerz/ipn`,
  });

  // 11. Create a pending payment record
  return db.orm.public.Payment.create({
    bookingId: booking.id,
    payerId: studentUserId,
    amount: amount.toFixed(2),
    currency: "BDT",
    paymentProvider: "SSLCOMMERZ",
    transactionId: tranId,
    providerSessionId: checkoutSession.sessionKey,
    checkoutUrl: checkoutSession.gatewayPageUrl,
    idempotencyKey,
    status: "PENDING",
  });
};

// Handle SSLCommerz Success Callback (Section 3.7)
export const handleSslcommerzSuccess = async (payload: Record<string, any>) => {
  const tranId = payload.tran_id;
  const valId = payload.val_id;

  if (!tranId || !valId) {
    throw new ApiError(400, "Missing tran_id or val_id in gateway response");
  }

  // Server-to-server transaction verification
  const verification = await verifySslcommerzTransaction(valId);

  if (!verification.isValid) {
    throw new ApiError(400, "Payment verification failed with gateway");
  }

  const payment = await db.orm.public.Payment.where({ transactionId: tranId }).first();

  if (!payment) {
    throw new ApiError(404, "Payment record not found for transaction ID");
  }

  if (payment.status === "SUCCEEDED") {
    return payment;
  }

  // Update payment status to SUCCEEDED
  const updatedPayment = await db.orm.public.Payment.where({ id: payment.id }).update({
    status: "SUCCEEDED",
    paymentMethod: verification.cardType || payload.card_type || "SSLCOMMERZ",
    paidAt: new Date(),
  });

  // Notify student (Telegram & In-App)
  let payer = null;
  try {
    payer = await db.orm.public.User.where({ id: payment.payerId }).first();
  } catch {
    payer = null;
  }

  if (payer) {
    await notifyPaymentSuccess(payer.phone || null, {
      bookingId: payment.bookingId,
      amount: payment.amount.toString(),
      transactionId: payment.transactionId || tranId,
    }).catch(() => null);

    await createNotification(
      payer.id,
      "PAYMENT_UPDATE",
      "Payment Received",
      `Your payment of ৳${payment.amount} BDT for booking #${payment.bookingId} was successfully processed.`
    );
  }

  // ── Notify both student and tutor with their personal join links ──
  try {
    const booking = await db.orm.public.Payment
      .where({ id: payment.id })
      .first()
      .then(() => db.orm.public.Booking.where({ id: payment.bookingId }).first());

    if (booking) {
      const [studentProfile, tutorProfile] = await Promise.all([
        db.orm.public.StudentProfile.where({ id: booking.studentId }).first(),
        db.orm.public.TutorProfile.where({ id: booking.tutorId }).first(),
      ]);

      const [studentUser, tutorUser] = await Promise.all([
        studentProfile
          ? db.orm.public.User.where({ id: studentProfile.userId }).first()
          : Promise.resolve(null),
        tutorProfile
          ? db.orm.public.User.where({ id: tutorProfile.userId }).first()
          : Promise.resolve(null),
      ]);

      const baseJoinUrl = `${env.CLIENT_URL}/live/${booking.id}`;

      await Promise.all([
        // Notify student
        studentUser?.phone
          ? notifyLiveClassLink(studentUser.phone, {
              bookingId: booking.id,
              role: "student",
              otherPartyName: tutorUser?.name ?? "your tutor",
              scheduledStartAt: booking.startAt,
              durationMin: booking.durationMin,
              joinUrl: baseJoinUrl,
            }).catch(() => null)
          : Promise.resolve(),

        // Notify tutor
        tutorUser?.phone
          ? notifyLiveClassLink(tutorUser.phone, {
              bookingId: booking.id,
              role: "tutor",
              otherPartyName: studentUser?.name ?? "your student",
              scheduledStartAt: booking.startAt,
              durationMin: booking.durationMin,
              joinUrl: baseJoinUrl,
            }).catch(() => null)
          : Promise.resolve(),
      ]);
    }
  } catch (err) {
    console.warn("[LiveClass] Could not send join-link notifications:", err);
  }

  return updatedPayment;
};

// Handle SSLCommerz Failure Callback
export const handleSslcommerzFail = async (payload: Record<string, any>) => {
  const tranId = payload.tran_id;
  if (!tranId) return null;

  try {
    const payment = await db.orm.public.Payment.where({ transactionId: tranId }).first();
    if (!payment) return null;

    return await db.orm.public.Payment.where({ id: payment.id }).update({
      status: "FAILED",
      failureReason: payload.error || payload.failedreason || "Payment failed at gateway",
    });
  } catch {
    return null;
  }
};

// Handle SSLCommerz Cancel Callback
export const handleSslcommerzCancel = async (payload: Record<string, any>) => {
  const tranId = payload.tran_id;
  if (!tranId) return null;

  try {
    const payment = await db.orm.public.Payment.where({ transactionId: tranId }).first();
    if (!payment) return null;

    return await db.orm.public.Payment.where({ id: payment.id }).update({
      status: "CANCELLED",
      failureReason: "Cancelled by student",
    });
  } catch {
    return null;
  }
};

export const getMyPayments = async (studentUserId: number) => {
  return db.orm.public.Payment
    .where({ payerId: studentUserId })
    .all();
};

export const getMyPaymentById = async (
  studentUserId: number,
  paymentId: number
) => {
  const payment = await db.orm.public.Payment
    .where({
      id: paymentId,
      payerId: studentUserId,
    })
    .first();

  if (!payment) {
    throw new ApiError(404, "Payment not found");
  }

  return payment;
};
