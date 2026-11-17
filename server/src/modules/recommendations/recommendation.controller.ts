import type { Request, Response } from "express";

import type { AuthenticatedUser } from "../../middlewares/auth.middleware";
import { ApiResponse } from "../../utils/ApiResponse";

import { getRecommendedTutorsForStudent } from "./recommendation.service";

export const getTutorRecommendations = async (
  _req: Request,
  res: Response
) => {
  const auth = res.locals.auth as AuthenticatedUser;

  const recommendations = await getRecommendedTutorsForStudent(auth.userId);

  return res.status(200).json(
    new ApiResponse(200, "Recommended tutors retrieved successfully", recommendations)
  );
};
