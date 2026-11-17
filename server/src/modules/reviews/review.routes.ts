import { Router } from "express";

import {
  authenticate,
  authorize,
} from "../../middlewares/auth.middleware";

import { catchAsync } from "../../utils/catchAsync";

import {
  submitReview,
  getTutorReviews,
} from "./review.controller";

const router = Router();

// Public: View reviews for any tutor
router.get("/tutors/:tutorId", catchAsync(getTutorReviews));

// Protected: Student submits review for completed booking
router.post(
  "/",
  authenticate,
  authorize("STUDENT"),
  catchAsync(submitReview)
);

export default router;
