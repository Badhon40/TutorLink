import type { Request, Response } from "express";

import type { AuthenticatedUser } from "../../middlewares/auth.middleware";
import { ApiError } from "../../utils/ApiError";
import { ApiResponse } from "../../utils/ApiResponse";

import {
  getTutorProfile,
  saveTutorProfile,
  listPublicTutors,
  getPublicTutorById,
  getPublicTutorAvailability,
  getTutorPayouts,
} from "./tutor.service";

import {
  tutorProfileSchema,
  tutorQuerySchema,
  tutorIdParamSchema,
} from "./tutor.validation";

// Public: List and search tutors
export const getPublicTutorsList = async (
  req: Request,
  res: Response
) => {
  const parsed = tutorQuerySchema.safeParse(req.query);

  if (!parsed.success) {
    throw new ApiError(400, "Invalid search query parameters", parsed.error.flatten().fieldErrors);
  }

  const result = await listPublicTutors(parsed.data);

  return res.status(200).json(
    new ApiResponse(200, "Tutors retrieved successfully", result)
  );
};

// Public: Single tutor profile
export const getPublicTutor = async (
  req: Request,
  res: Response
) => {
  const parsed = tutorIdParamSchema.safeParse(req.params);

  if (!parsed.success) {
    throw new ApiError(400, "Invalid tutor ID", parsed.error.flatten().fieldErrors);
  }

  const tutor = await getPublicTutorById(parsed.data.tutorId);

  return res.status(200).json(
    new ApiResponse(200, "Tutor profile retrieved successfully", tutor)
  );
};

// Public: Tutor availability slots
export const getPublicAvailability = async (
  req: Request,
  res: Response
) => {
  const parsed = tutorIdParamSchema.safeParse(req.params);

  if (!parsed.success) {
    throw new ApiError(400, "Invalid tutor ID", parsed.error.flatten().fieldErrors);
  }

  const slots = await getPublicTutorAvailability(parsed.data.tutorId);

  return res.status(200).json(
    new ApiResponse(200, "Tutor availability retrieved successfully", slots)
  );
};

// Private (TUTOR): Self profile
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

// Private (TUTOR): Update self profile
export const updateMyTutorProfile = async (
  req: Request,
  res: Response
) => {
  const auth = res.locals.auth as AuthenticatedUser;

  const parsed = tutorProfileSchema.safeParse(req.body);

  if (!parsed.success) {
    throw new ApiError(400, "Invalid tutor profile data", parsed.error.flatten().fieldErrors);
  }

  const profile = await saveTutorProfile(auth.userId, parsed.data);

  return res.status(200).json(
    new ApiResponse(200, "Tutor profile saved successfully", profile)
  );
};

// Private (TUTOR): Tutor earnings & payouts
export const getMyTutorPayouts = async (
  _req: Request,
  res: Response
) => {
  const auth = res.locals.auth as AuthenticatedUser;

  const earnings = await getTutorPayouts(auth.userId);

  return res.status(200).json(
    new ApiResponse(200, "Tutor payouts retrieved successfully", earnings)
  );
};
