import type { Request, Response } from "express";

import type { AuthenticatedUser } from "../../middlewares/auth.middleware";
import { ApiError } from "../../utils/ApiError";
import { ApiResponse } from "../../utils/ApiResponse";
import { env } from "../../config/env";

import {
  createPayment,
  getMyPayments,
  getMyPaymentById,
  handleSslcommerzSuccess,
  handleSslcommerzFail,
  handleSslcommerzCancel,
} from "./payment.service";

import { createPaymentSchema } from "./payment.validation";

// Student initiates payment for a confirmed booking.
export const createMyPayment = async (
  req: Request,
  res: Response
) => {
  const auth = res.locals.auth as AuthenticatedUser;

  if (auth.role !== "STUDENT") {
    throw new ApiError(
      403,
      "Only students can initiate payments"
    );
  }

  const parsed = createPaymentSchema.safeParse(req.body);

  if (!parsed.success) {
    throw new ApiError(400, "Invalid payment data", parsed.error.flatten().fieldErrors);
  }

  const payment = await createPayment(
    auth.userId,
    parsed.data.bookingId,
    parsed.data.idempotencyKey,
    {
      phone: parsed.data.phone,
      address: parsed.data.address,
      city: parsed.data.city,
      postcode: parsed.data.postcode,
    }
  );

  return res.status(201).json(
    new ApiResponse(
      201,
      "Payment initiated successfully",
      payment
    )
  );
};

// Student views their payment history.
export const listMyPayments = async (
  _req: Request,
  res: Response
) => {
  const auth = res.locals.auth as AuthenticatedUser;

  if (auth.role !== "STUDENT") {
    throw new ApiError(403, "Only students can view payment history");
  }

  const payments = await getMyPayments(auth.userId);

  return res.status(200).json(
    new ApiResponse(
      200,
      "Payment history retrieved successfully",
      payments
    )
  );
};

// Student views a specific payment.
export const getMyPayment = async (
  req: Request,
  res: Response
) => {
  const auth = res.locals.auth as AuthenticatedUser;

  if (auth.role !== "STUDENT") {
    throw new ApiError(403, "Only students can view payment details");
  }

  const paymentId = Number(req.params.paymentId);

  if (!Number.isInteger(paymentId) || paymentId <= 0) {
    throw new ApiError(400, "Invalid payment ID");
  }

  const payment = await getMyPaymentById(
    auth.userId,
    paymentId
  );

  return res.status(200).json(
    new ApiResponse(
      200,
      "Payment details retrieved successfully",
      payment
    )
  );
};

// SSLCommerz Success Callback (POST from gateway)
export const sslcommerzSuccessCallback = async (
  req: Request,
  res: Response
) => {
  const payload = req.body;
  const updatedPayment = await handleSslcommerzSuccess(payload);

  // If request accepts HTML (browser redirect from gateway), redirect to frontend
  if (req.accepts("html")) {
    const redirectUrl = `${env.CLIENT_URL}/payment/success?tran_id=${payload.tran_id}`;
    return res.redirect(redirectUrl);
  }

  return res.status(200).json(
    new ApiResponse(200, "Payment verified successfully", updatedPayment)
  );
};

// SSLCommerz Failure Callback
export const sslcommerzFailCallback = async (
  req: Request,
  res: Response
) => {
  const payload = req.body;
  await handleSslcommerzFail(payload);

  if (req.accepts("html")) {
    const redirectUrl = `${env.CLIENT_URL}/payment/fail?tran_id=${payload.tran_id || ""}`;
    return res.redirect(redirectUrl);
  }

  return res.status(200).json(
    new ApiResponse(200, "Payment failed status recorded", null)
  );
};

// SSLCommerz Cancellation Callback
export const sslcommerzCancelCallback = async (
  req: Request,
  res: Response
) => {
  const payload = req.body;
  await handleSslcommerzCancel(payload);

  if (req.accepts("html")) {
    const redirectUrl = `${env.CLIENT_URL}/payment/cancel?tran_id=${payload.tran_id || ""}`;
    return res.redirect(redirectUrl);
  }

  return res.status(200).json(
    new ApiResponse(200, "Payment cancelled by user", null)
  );
};

// SSLCommerz IPN (Instant Payment Notification) Webhook
export const sslcommerzIpnWebhook = async (
  req: Request,
  res: Response
) => {
  const payload = req.body;

  try {
    await handleSslcommerzSuccess(payload);
    return res.status(200).send("IPN_PROCESSED");
  } catch (error) {
    console.error("SSLCommerz IPN processing error:", error);
    return res.status(200).send("IPN_FAILED");
  }
};
