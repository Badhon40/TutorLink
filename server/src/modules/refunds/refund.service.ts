import { db } from "../../prisma/db";
import { ApiError } from "../../utils/ApiError";
import type { RequestRefundInput, ProcessRefundInput } from "./refund.validation";

// Student requests refund for cancelled booking payment
export const requestRefund = async (
  studentUserId: number,
  input: RequestRefundInput
) => {
  const payment = await db.orm.public.Payment
    .where({ id: input.paymentId })
    .first();

  if (!payment) {
    throw new ApiError(404, "Payment record not found");
  }

  if (payment.payerId !== studentUserId) {
    throw new ApiError(403, "You can only request refunds for your own payments");
  }

  if (payment.status !== "SUCCEEDED") {
    throw new ApiError(400, "Only successful payments are eligible for a refund");
  }

  // Check booking status
  const booking = await db.orm.public.Booking
    .where({ id: payment.bookingId })
    .first();

  if (!booking || booking.status !== "CANCELLED") {
    throw new ApiError(400, "Refunds are only eligible for cancelled tutoring sessions");
  }

  // Check if an existing refund was already requested
  const existingRefund = await db.orm.public.Refund
    .where({ paymentId: payment.id })
    .first();

  if (existingRefund) {
    throw new ApiError(409, "A refund request has already been filed for this payment");
  }

  return db.orm.public.Refund.create({
    paymentId: payment.id,
    amount: payment.amount,
    reason: input.reason,
    status: "PENDING",
  });
};

// Get current user's refunds
export const getMyRefunds = async (studentUserId: number) => {
  const payments = await db.orm.public.Payment
    .where({ payerId: studentUserId })
    .all();

  const paymentIds = new Set(payments.map((p) => p.id));
  const allRefunds = await db.orm.public.Refund.all();

  return allRefunds.filter((r) => paymentIds.has(r.paymentId));
};

// Admin: List all refunds
export const listAllRefunds = async (statusFilter?: string) => {
  let refunds = await db.orm.public.Refund.all();

  if (statusFilter) {
    refunds = refunds.filter((r) => r.status === statusFilter);
  }

  return Promise.all(
    refunds.map(async (r) => {
      const payment = await db.orm.public.Payment.where({ id: r.paymentId }).first();
      const user = payment
        ? await db.orm.public.User.where({ id: payment.payerId }).first()
        : null;

      return {
        ...r,
        payer: user
          ? {
              id: user.id,
              name: user.name,
              email: user.email,
            }
          : null,
      };
    })
  );
};

// Admin: Process refund
export const processRefund = async (
  refundId: number,
  input: ProcessRefundInput
) => {
  const refund = await db.orm.public.Refund
    .where({ id: refundId })
    .first();

  if (!refund) {
    throw new ApiError(404, "Refund record not found");
  }

  if (refund.status === "SUCCEEDED") {
    throw new ApiError(400, "This refund has already been completed");
  }

  const updatedRefund = await db.orm.public.Refund
    .where({ id: refundId })
    .update({
      status: input.status,
      providerRefundId: input.providerRefundId ?? null,
      processedAt: new Date(),
    });

  if (input.status === "SUCCEEDED") {
    await db.orm.public.Payment
      .where({ id: refund.paymentId })
      .update({
        status: "REFUNDED",
      });
  }

  return updatedRefund;
};
