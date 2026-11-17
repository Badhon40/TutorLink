import type { Request, Response } from "express";

import type { AuthenticatedUser } from "../../middlewares/auth.middleware";
import { ApiError } from "../../utils/ApiError";
import { ApiResponse } from "../../utils/ApiResponse";

import {
  requestRefund,
  getMyRefunds,
  listAllRefunds,
  processRefund,
} from "./refund.service";

import {
  requestRefundSchema,
  processRefundSchema,
  refundIdParamSchema,
} from "./refund.validation";

// Student requests a refund
export const submitRefundRequest = async (
  req: Request,
  res: Response
) => {
  const auth = res.locals.auth as AuthenticatedUser;

  const parsed = requestRefundSchema.safeParse(req.body);

  if (!parsed.success) {
    throw new ApiError(400, "Invalid refund request data", parsed.error.flatten().fieldErrors);
  }

  const refund = await requestRefund(auth.userId, parsed.data);

  return res.status(201).json(
    new ApiResponse(201, "Refund request submitted successfully", refund)
  );
};

// Student lists their refunds
export const listMyRefunds = async (
  _req: Request,
  res: Response
) => {
  const auth = res.locals.auth as AuthenticatedUser;

  const refunds = await getMyRefunds(auth.userId);

  return res.status(200).json(
    new ApiResponse(200, "Refund requests retrieved successfully", refunds)
  );
};

// Admin lists all refunds
export const getAdminRefunds = async (
  req: Request,
  res: Response
) => {
  const status = typeof req.query.status === "string" ? req.query.status : undefined;

  const refunds = await listAllRefunds(status);

  return res.status(200).json(
    new ApiResponse(200, "Refunds retrieved successfully", refunds)
  );
};

// Admin processes a refund
export const processRefundStatus = async (
  req: Request,
  res: Response
) => {
  const params = refundIdParamSchema.safeParse(req.params);

  if (!params.success) {
    throw new ApiError(400, "Invalid refund ID", params.error.flatten().fieldErrors);
  }

  const body = processRefundSchema.safeParse(req.body);

  if (!body.success) {
    throw new ApiError(400, "Invalid process data", body.error.flatten().fieldErrors);
  }

  const updated = await processRefund(params.data.id, body.data);

  return res.status(200).json(
    new ApiResponse(200, `Refund marked as ${body.data.status}`, updated)
  );
};
