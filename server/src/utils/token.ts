
import crypto from "node:crypto";
import jwt, { type SignOptions } from "jsonwebtoken";

import { env } from "../config/env";

export type UserRole = "STUDENT" | "TUTOR" | "ADMIN";

export interface AccessTokenPayload {
  sub: string;
  role: UserRole;
}

export const generateAccessToken = (
  user: AccessTokenPayload
): string => {
  return jwt.sign(
    { role: user.role },
    env.JWT_ACCESS_SECRET,
    {
      subject: user.sub,
      expiresIn: env.ACCESS_TOKEN_EXPIRES_IN as SignOptions["expiresIn"],
      issuer: "tutorlink-api",
      audience: "tutorlink-client",
    }
  );
};

export const verifyAccessToken = (
  token: string
): AccessTokenPayload => {
  const decoded = jwt.verify(token, env.JWT_ACCESS_SECRET, {
    issuer: "tutorlink-api",
    audience: "tutorlink-client",
  });

  if (
    typeof decoded === "string" ||
    typeof decoded.sub !== "string" ||
    !["STUDENT", "TUTOR", "ADMIN"].includes(
      String(decoded.role)
    )
  ) {
    throw new Error("Invalid access token payload");
  }

  return {
    sub: decoded.sub,
    role: decoded.role as UserRole,
  };
};

export const generateRefreshToken = (): string => {
  return crypto.randomBytes(64).toString("base64url");
};

export const hashRefreshToken = (token: string): string => {
  return crypto.createHash("sha256").update(token).digest("hex");
};

export const generateTokenFamilyId = (): string => {
  return crypto.randomUUID();
};
