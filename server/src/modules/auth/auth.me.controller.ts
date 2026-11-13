
import type { Request, Response } from "express";

import { db } from "../../prisma/db";
import { ApiError } from "../../utils/ApiError";
import { ApiResponse } from "../../utils/ApiResponse";
import type { AuthenticatedUser } from "../../middlewares/auth.middleware";

export const getMe = async (_req: Request, res: Response) => {
  const auth = res.locals.auth as AuthenticatedUser;

  const user = await db.orm.public.User
    .where({ id: auth.userId })
    .first();

  if (!user || !user.isActive) {
    throw new ApiError(404, "User not found");
  }

  const userData = {
    id: user.id,
    name: user.name,
    email: user.email,
    username: user.username,
    phone: user.phone,
    role: user.role,
    isActive: user.isActive,
    createdAt: user.createdAt,
  };

  return res.status(200).json(
    new ApiResponse(
      200,
      "User profile retrieved successfully",
      userData
    )
  );
};
