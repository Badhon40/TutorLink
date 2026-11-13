
import type { Request, Response } from "express";

import type { AuthenticatedUser } from "../../middlewares/auth.middleware";
import { ApiError } from "../../utils/ApiError";
import { ApiResponse } from "../../utils/ApiResponse";

import {
  getTutorProfile,
  saveTutorProfile,
} from "./tutor.service";

import { tutorProfileSchema } from "./tutor.validation";

export const getMyTutorProfile = async (
  _req: Request,
  res: Response
) => {
  const auth = res.locals.auth as AuthenticatedUser;

  const profile = await getTutorProfile(auth.userId);

  return res.status(200).json(
    new ApiResponse(200, "Tutor profile retrieved successfully", profile)
  );
};

export const updateMyTutorProfile = async (
  req: Request,
  res: Response
) => {
  const auth = res.locals.auth as AuthenticatedUser;

  const parsed = tutorProfileSchema.safeParse(req.body);

  if (!parsed.success) {
    throw new ApiError(400, "Invalid tutor profile data");
  }

  const profile = await saveTutorProfile(auth.userId, parsed.data);

  return res.status(200).json(
    new ApiResponse(200, "Tutor profile saved successfully", profile)
  );
};
