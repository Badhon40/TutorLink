import { Router } from "express";

import {
  authenticate,
  authorize,
} from "../../middlewares/auth.middleware";

import { catchAsync } from "../../utils/catchAsync";

import {
  submitRefundRequest,
  listMyRefunds,
  getAdminRefunds,
  processRefundStatus,
} from "./refund.controller";

const router = Router();

router.use(authenticate);

// Student requests a refund for cancelled booking
router.post(
  "/",
  authorize("STUDENT"),
  catchAsync(submitRefundRequest)
);

// Student views own refunds
router.get(
  "/my-refunds",
  authorize("STUDENT"),
  catchAsync(listMyRefunds)
);

// Admin: View all platform refund requests
router.get(
  "/admin/all",
  authorize("ADMIN"),
  catchAsync(getAdminRefunds)
);

// Admin: Process refund (approve/fail)
router.patch(
  "/admin/:id",
  authorize("ADMIN"),
  catchAsync(processRefundStatus)
);

export default router;
