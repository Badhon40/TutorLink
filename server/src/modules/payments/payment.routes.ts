
import { Router } from "express";

import {
  authenticate,
  authorize,
} from "../../middlewares/auth.middleware";

import { catchAsync } from "../../utils/catchAsync";

import {
  createMyPayment,
} from "./payment.controller";

const router = Router();

// All payment routes require authentication.
router.use(authenticate);

// Student initiates payment for a confirmed booking.
router.post(
  "/",
  authorize("STUDENT"),
  catchAsync(createMyPayment)
);

export default router;
