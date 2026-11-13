
import type { Request, Response } from "express";

import type { AuthenticatedUser } from "../../middlewares/auth.middleware";
import { ApiError } from "../../utils/ApiError";
import { ApiResponse } from "../../utils/ApiResponse";

import {
  getStudentProfile,
  saveStudentProfile,
} from "./student.service";

import { studentProfileSchema } from "./student.validation";

// GET /api/students/me
export const getMyStudentProfile = async (
  _req: Request,
  res: Response
) => {
  const auth = res.locals.auth as AuthenticatedUser;

  const profile = await getStudentProfile(auth.userId);

  return res.status(200).json(
    new ApiResponse(
      200,
      "Student profile retrieved successfully",
      profile
    )
  );
};

// PATCH /api/students/me
export const updateMyStudentProfile = async (
  req: Request,
  res: Response
) => {
  const auth = res.locals.auth as AuthenticatedUser;

  const parsed = studentProfileSchema.safeParse(req.body);

  if (!parsed.success) {
    throw new ApiError(400, "Invalid student profile data");
  }

  const profile = await saveStudentProfile(
    auth.userId,
    parsed.data
  );

  return res.status(200).json(
    new ApiResponse(
      200,
      "Student profile saved successfully",
      profile
    )
  );
};
