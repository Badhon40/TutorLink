
import type { RequestHandler } from "express";

import { db } from "../prisma/db";
import { ApiError } from "../utils/ApiError";
import { verifyAccessToken, type UserRole } from "../utils/token";


export interface AuthenticatedUser {
  userId: number;
  role: UserRole;
}

// Verify access token and authenticate the user
export const authenticate: RequestHandler = async (
  req,
  res,
  next
) => {
  const authorization = req.headers.authorization;

  if (!authorization || !authorization.startsWith("Bearer ")) {
    throw new ApiError(401, "Access token is required");
  }

  const token = authorization.split(" ")[1];

  if (!token) {
    throw new ApiError(401, "Invalid authorization header");
  }

  let payload;

  try {
    payload = verifyAccessToken(token);
  } catch {
    throw new ApiError(401, "Invalid or expired access token");
  }

  const userId = Number(payload.sub);

  if (!Number.isSafeInteger(userId) || userId <= 0) {
    throw new ApiError(401, "Invalid access token");
  }

  // Fetch the latest user information from the database
  const user = await db.orm.public.User
    .where({ id: userId })
    .first();

  if (!user || !user.isActive) {
    throw new ApiError(401, "User account is unavailable");
  }

  // Store authenticated user information for downstream middleware
  res.locals.auth = {
  userId: user.id,
  role: user.role as UserRole,
};

  next();
};



// Role-based authorization
export const authorize = (...allowedRoles: UserRole[]): RequestHandler => {
  return (_req, res, next) => {
    const auth = res.locals.auth as
      | { userId: number; role: UserRole }
      | undefined;

    if (!auth) {
      throw new ApiError(401, "Authentication required");
    }

    if (!allowedRoles.includes(auth.role)) {
      throw new ApiError(403, "You do not have permission");
    }

    next();
  };
};
