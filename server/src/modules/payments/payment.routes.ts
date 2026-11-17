import { Router } from "express";

import {
  authenticate,
  authorize,
} from "../../middlewares/auth.middleware";

import { catchAsync } from "../../utils/catchAsync";

import {
  createMyPayment,
  listMyPayments,
  getMyPayment,
  sslcommerzSuccessCallback,
  sslcommerzFailCallback,
  sslcommerzCancelCallback,
  sslcommerzIpnWebhook,
} from "./payment.controller";

const router = Router();

// ============================================================
// Public / Gateway Webhook Callbacks (Called by SSLCOMMERZ)
// ============================================================
router.post("/sslcommerz/success", catchAsync(sslcommerzSuccessCallback));
router.post("/sslcommerz/fail", catchAsync(sslcommerzFailCallback));
router.post("/sslcommerz/cancel", catchAsync(sslcommerzCancelCallback));
router.post("/sslcommerz/ipn", catchAsync(sslcommerzIpnWebhook));

// ============================================================
// Protected Student Payment Routes
// ============================================================
router.use(authenticate);

// Student initiates payment for a confirmed booking.
router.post(
  "/",
  authorize("STUDENT"),
  catchAsync(createMyPayment)
);

// Student views payment history.
router.get(
  "/",
  authorize("STUDENT"),
  catchAsync(listMyPayments)
);

// Student views a specific payment.
router.get(
  "/:paymentId",
  authorize("STUDENT"),
  catchAsync(getMyPayment)
);

export default router;
