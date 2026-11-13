import type { Request, Response } from "express";

import { env } from "../../config/env";
import { ApiResponse } from "../../utils/ApiResponse";
import { registerSchema, loginSchema } from "./auth.validation";
import { registerUser, loginUser , refreshSession, logoutUser} from "./auth.service";
import { ApiError } from "../../utils/ApiError";


export const register = async (req: Request, res: Response) => {
  const parsed = registerSchema.safeParse(req.body);

  if (!parsed.success) {
    throw new ApiError(400, "Invalid registration data");
  }

  const user = await registerUser(parsed.data);

  return res.status(201).json(
    new ApiResponse(201, "Registration successful", user)
  );
};

export const login = async (req: Request, res: Response) => {
  const parsed = loginSchema.safeParse(req.body);

  if (!parsed.success) {
    throw new ApiError(400, "Invalid login data");
  }

  const session = await loginUser(parsed.data);

  res.cookie("refreshToken", session.refreshToken, {
    httpOnly: true,
    secure: env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: env.REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000,
    path: "/api/auth",
  });

  return res.status(200).json(
    new ApiResponse(200, "Login successful", {
      user: session.user,
      accessToken: session.accessToken,
    })
  );
};

export const refresh = async (req: Request, res: Response) => {
  const refreshToken = req.cookies?.refreshToken;

  if (!refreshToken) {
    throw new ApiError(401, "Refresh token is required");
  }

  const session = await refreshSession(refreshToken);

  // Replace the old cookie with the rotated refresh token
  res.cookie("refreshToken", session.refreshToken, {
    httpOnly: true,
    secure: env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: env.REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000,
    path: "/api/auth",
  });

  return res.status(200).json(
    new ApiResponse(200, "Token refreshed successfully", {
      user: session.user,
      accessToken: session.accessToken,
    })
  );
};


export const logout = async (req: Request, res: Response) => {
  const refreshToken = req.cookies?.refreshToken;

  await logoutUser(refreshToken);

  res.clearCookie("refreshToken", {
    httpOnly: true,
    secure: env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/api/auth",
  });

  return res.status(200).json(
    new ApiResponse(200, "Logout successful")
  );
};
