import type { Request, Response } from "express";
import { z } from "zod";

import type { AuthenticatedUser } from "../../middlewares/auth.middleware";
import { ApiError } from "../../utils/ApiError";
import { ApiResponse } from "../../utils/ApiResponse";

import {
  getPlatformAnalytics,
  listPlatformUsers,
  updateUserStatus,
  listPlatformPayouts,
  disbursePayout,
} from "./admin.service";

// GET /api/admin/analytics
export const getAnalytics = async (
  _req: Request,
  res: Response
) => {
  const analytics = await getPlatformAnalytics();

  return res.status(200).json(
    new ApiResponse(200, "Platform analytics retrieved successfully", analytics)
  );
};

// GET /api/admin/users
export const getUsers = async (
  req: Request,
  res: Response
) => {
  const role = typeof req.query.role === "string" ? req.query.role : undefined;
  const isActive =
    req.query.isActive === "true"
      ? true
      : req.query.isActive === "false"
      ? false
      : undefined;

  const users = await listPlatformUsers(role, isActive);

  return res.status(200).json(
    new ApiResponse(200, "Users retrieved successfully", users)
  );
};

// PATCH /api/admin/users/:id/status
const updateUserStatusSchema = z.object({
  isActive: z.boolean(),
});

export const setUserStatus = async (
  req: Request,
  res: Response
) => {
  const userId = Number(req.params.id);

  if (!Number.isInteger(userId) || userId <= 0) {
    throw new ApiError(400, "Invalid user ID");
  }

  const parsed = updateUserStatusSchema.safeParse(req.body);

  if (!parsed.success) {
    throw new ApiError(400, "Invalid status payload", parsed.error.flatten().fieldErrors);
  }

  const updated = await updateUserStatus(userId, parsed.data.isActive);

  return res.status(200).json(
    new ApiResponse(200, `User ${parsed.data.isActive ? "activated" : "deactivated"} successfully`, updated)
  );
};

// GET /api/admin/payouts
export const getPayouts = async (
  req: Request,
  res: Response
) => {
  const status = typeof req.query.status === "string" ? req.query.status : undefined;

  const payouts = await listPlatformPayouts(status);

  return res.status(200).json(
    new ApiResponse(200, "Payouts retrieved successfully", payouts)
  );
};

// PATCH /api/admin/payouts/:id/disburse
const disbursePayoutSchema = z.object({
  transferReference: z.string().trim().min(3).max(100),
  adminNote: z.string().trim().max(500).optional(),
});

export const processPayoutDisbursement = async (
  req: Request,
  res: Response
) => {
  const auth = res.locals.auth as AuthenticatedUser;
  const payoutId = Number(req.params.id);

  if (!Number.isInteger(payoutId) || payoutId <= 0) {
    throw new ApiError(400, "Invalid payout ID");
  }

  const parsed = disbursePayoutSchema.safeParse(req.body);

  if (!parsed.success) {
    throw new ApiError(400, "Invalid disbursement data", parsed.error.flatten().fieldErrors);
  }

  const updated = await disbursePayout(
    auth.userId,
    payoutId,
    parsed.data.transferReference,
    parsed.data.adminNote
  );

  return res.status(200).json(
    new ApiResponse(200, "Payout marked as PAID successfully", updated)
  );
};
