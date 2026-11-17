import type { Request, Response } from "express";

import type { AuthenticatedUser } from "../../middlewares/auth.middleware";
import { ApiError } from "../../utils/ApiError";
import { ApiResponse } from "../../utils/ApiResponse";

import {
  createReview,
  getReviewsForTutor,
} from "./review.service";

import {
  createReviewSchema,
  tutorReviewParamSchema,
} from "./review.validation";

// Student submits review
export const submitReview = async (
  req: Request,
  res: Response
) => {
  const auth = res.locals.auth as AuthenticatedUser;

  const parsed = createReviewSchema.safeParse(req.body);

  if (!parsed.success) {
    throw new ApiError(400, "Invalid review data", parsed.error.flatten().fieldErrors);
  }

  const review = await createReview(auth.userId, parsed.data);

  return res.status(201).json(
    new ApiResponse(201, "Review submitted successfully", review)
  );
};

// Public: Get reviews for a tutor
export const getTutorReviews = async (
  req: Request,
  res: Response
) => {
  const params = tutorReviewParamSchema.safeParse(req.params);

  if (!params.success) {
    throw new ApiError(400, "Invalid tutor ID", params.error.flatten().fieldErrors);
  }

  const reviews = await getReviewsForTutor(params.data.tutorId);

  return res.status(200).json(
    new ApiResponse(200, "Tutor reviews retrieved successfully", reviews)
  );
};
