import { Router } from "express";

import {
  authenticate,
  authorize,
} from "../../middlewares/auth.middleware";

import { catchAsync } from "../../utils/catchAsync";

import {
  getAnalytics,
  getUsers,
  setUserStatus,
  getPayouts,
  processPayoutDisbursement,
} from "./admin.controller";

const router = Router();

// All admin routes strictly require authentication and ADMIN role
router.use(authenticate, authorize("ADMIN"));

// Platform Metrics & Overview
router.get("/analytics", catchAsync(getAnalytics));

// User Management
router.get("/users", catchAsync(getUsers));
router.patch("/users/:id/status", catchAsync(setUserStatus));

// Payout Management
router.get("/payouts", catchAsync(getPayouts));
router.patch("/payouts/:id/disburse", catchAsync(processPayoutDisbursement));

export default router;
