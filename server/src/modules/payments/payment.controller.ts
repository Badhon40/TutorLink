
import type { Request, Response } from "express";

import type { AuthenticatedUser } from "../../middlewares/auth.middleware";
import { ApiError } from "../../utils/ApiError";
import { ApiResponse } from "../../utils/ApiResponse";

import { createPayment } from "./payment.service";
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
    throw new ApiError(400, "Invalid payment data");
  }

  const payment = await createPayment(
    auth.userId,
    parsed.data.bookingId,
    parsed.data.idempotencyKey
  );

  return res.status(201).json(
    new ApiResponse(
      201,
      "Payment initiated successfully",
      payment
    )
  );
};
