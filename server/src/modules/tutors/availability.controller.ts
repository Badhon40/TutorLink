import type { Request, Response } from "express";

import type { AuthenticatedUser } from "../../middlewares/auth.middleware";
import { ApiError } from "../../utils/ApiError";
import { ApiResponse } from "../../utils/ApiResponse";

import {
  createAvailability,
  getMyAvailability,
  updateAvailability,
  deleteAvailability,
} from "./availability.service";

import {
  availabilitySchema,
  availabilityIdSchema,
} from "./availability.validation";

// Create an availability window.
export const createMyAvailability = async (
  req: Request,
  res: Response
) => {
  const auth = res.locals.auth as AuthenticatedUser;

  const parsed = availabilitySchema.safeParse(req.body);

  if (!parsed.success) {
    throw new ApiError(400, "Invalid availability data", parsed.error.flatten().fieldErrors);
  }

  const availability = await createAvailability(
    auth.userId,
    parsed.data
  );

  return res.status(201).json(
    new ApiResponse(
      201,
      "Tutor availability created successfully",
      availability
    )
  );
};

// Retrieve availability.
export const getMyAvailabilityList = async (
  _req: Request,
  res: Response
) => {
  const auth = res.locals.auth as AuthenticatedUser;

  const availability = await getMyAvailability(auth.userId);

  return res.status(200).json(
    new ApiResponse(
      200,
      "Tutor availability retrieved successfully",
      availability
    )
  );
};

// Update an availability window.
export const updateMyAvailability = async (
  req: Request,
  res: Response
) => {
  const auth = res.locals.auth as AuthenticatedUser;

  const params = availabilityIdSchema.safeParse(req.params);
  const body = availabilitySchema.safeParse(req.body);

  if (!params.success) {
    throw new ApiError(400, "Invalid availability ID", params.error.flatten().fieldErrors);
  }

  if (!body.success) {
    throw new ApiError(400, "Invalid availability data", body.error.flatten().fieldErrors);
  }

  const availability = await updateAvailability(
    auth.userId,
    params.data.availabilityId,
    body.data
  );

  return res.status(200).json(
    new ApiResponse(
      200,
      "Tutor availability updated successfully",
      availability
    )
  );
};

// Delete an availability window.
export const deleteMyAvailability = async (
  req: Request,
  res: Response
) => {
  const auth = res.locals.auth as AuthenticatedUser;

  const params = availabilityIdSchema.safeParse(req.params);

  if (!params.success) {
    throw new ApiError(400, "Invalid availability ID", params.error.flatten().fieldErrors);
  }

  const result = await deleteAvailability(
    auth.userId,
    params.data.availabilityId
  );

  return res.status(200).json(
    new ApiResponse(
      200,
      "Tutor availability deleted successfully",
      result
    )
  );
};
