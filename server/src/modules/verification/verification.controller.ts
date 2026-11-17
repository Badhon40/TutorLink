import type { Request, Response } from "express";

import type { AuthenticatedUser } from "../../middlewares/auth.middleware";
import { ApiError } from "../../utils/ApiError";
import { ApiResponse } from "../../utils/ApiResponse";

import {
  submitVerification,
  getMyVerificationRequests,
  getAllVerificationRequests,
  reviewVerificationRequest,
} from "./verification.service";

import {
  submitVerificationSchema,
  reviewVerificationSchema,
  verificationIdParamSchema,
} from "./verification.validation";

// Submit verification document
export const submitMyVerification = async (
  req: Request,
  res: Response
) => {
  const auth = res.locals.auth as AuthenticatedUser;

  const parsed = submitVerificationSchema.safeParse(req.body);

  if (!parsed.success) {
    throw new ApiError(400, "Invalid verification submission data", parsed.error.flatten().fieldErrors);
  }

  const request = await submitVerification(auth.userId, parsed.data);

  return res.status(201).json(
    new ApiResponse(201, "Verification document submitted successfully", request)
  );
};

// Get current user's submitted verification requests
export const getMyVerifications = async (
  _req: Request,
  res: Response
) => {
  const auth = res.locals.auth as AuthenticatedUser;

  const requests = await getMyVerificationRequests(auth.userId);

  return res.status(200).json(
    new ApiResponse(200, "Verification requests retrieved successfully", requests)
  );
};

// Admin: List verification requests
export const listAllVerifications = async (
  req: Request,
  res: Response
) => {
  const status = typeof req.query.status === "string" ? req.query.status : undefined;

  const requests = await getAllVerificationRequests(status);

  return res.status(200).json(
    new ApiResponse(200, "Verification requests retrieved successfully", requests)
  );
};

// Admin: Review verification request
export const reviewVerification = async (
  req: Request,
  res: Response
) => {
  const auth = res.locals.auth as AuthenticatedUser;

  const params = verificationIdParamSchema.safeParse(req.params);

  if (!params.success) {
    throw new ApiError(400, "Invalid verification request ID", params.error.flatten().fieldErrors);
  }

  const body = reviewVerificationSchema.safeParse(req.body);

  if (!body.success) {
    throw new ApiError(400, "Invalid review data", body.error.flatten().fieldErrors);
  }

  const updated = await reviewVerificationRequest(
    auth.userId,
    params.data.id,
    body.data
  );

  return res.status(200).json(
    new ApiResponse(200, `Verification request ${body.data.status.toLowerCase()} successfully`, updated)
  );
};
