import { Router } from "express";

import {
  authenticate,
  authorize,
} from "../../middlewares/auth.middleware";

import { catchAsync } from "../../utils/catchAsync";

import {
  submitMyVerification,
  getMyVerifications,
  listAllVerifications,
  reviewVerification,
} from "./verification.controller";

const router = Router();

router.use(authenticate);

// Student or Tutor submits verification document
router.post(
  "/submit",
  authorize("STUDENT", "TUTOR"),
  catchAsync(submitMyVerification)
);

// View user's own verification requests
router.get(
  "/my-requests",
  authorize("STUDENT", "TUTOR"),
  catchAsync(getMyVerifications)
);

// Admin: View all verification requests
router.get(
  "/admin/requests",
  authorize("ADMIN"),
  catchAsync(listAllVerifications)
);

// Admin: Approve or reject verification request
router.patch(
  "/admin/requests/:id",
  authorize("ADMIN"),
  catchAsync(reviewVerification)
);

export default router;
