
import bcrypt from "bcrypt";
import { db } from "../../prisma/db";
import { ApiError } from "../../utils/ApiError";
import { AuthSession, AuthUser, LoginInput, RegisterInput } from "./auth.typs";

import {
  generateAccessToken,
  generateRefreshToken,
  generateTokenFamilyId,
  hashRefreshToken,
} from "../../utils/token";
import { env } from "../../config/env";



const SALT_ROUNDS = 12;

export const registerUser = async (
  input: RegisterInput
): Promise<AuthUser> => {
  // 1. Check duplicate email
  const existingEmail = await db.orm.public.User.first({
    email: input.email,
  });

  if (existingEmail) {
    throw new ApiError(409, "Email is already registered");
  }

  // 2. Check duplicate username when supplied
  if (input.username) {
    const existingUsername = await db.orm.public.User.first({
      username: input.username,
    });

    if (existingUsername) {
      throw new ApiError(409, "Username is already taken");
    }
  }

  // 3. Hash password
  const passwordHash = await bcrypt.hash(
    input.password,
    SALT_ROUNDS
  );

  // 4. Create user
  const user = await db.orm.public.User.create({
    name: input.name,
    email: input.email,
    username: input.username ?? null,
    passwordHash,
    phone: input.phone ?? null,
    role: input.role,
  });

  // 5. Return only public user information
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    username: user.username ?? null,
    phone: user.phone ?? null,
    role: user.role,
    isActive: user.isActive,
  };
};


export const loginUser = async (
  input: LoginInput
): Promise<AuthSession> => {
  // 1. Normalize the login identifier
  const identifier = input.identifier.trim().toLowerCase();

  // 2. Find user by email, then username
  let user = await db.orm.public.User.first({
    email: identifier,
  });

  if (!user) {
    user = await db.orm.public.User.first({
      username: identifier,
    });
  }

  // 3. Verify credentials
  if (!user) {
    throw new ApiError(401, "Invalid email/username or password");
  }

  const passwordMatches = await bcrypt.compare(
    input.password,
    user.passwordHash
  );

  if (!passwordMatches) {
    throw new ApiError(401, "Invalid email/username or password");
  }

  // 4. Check account status
  if (!user.isActive) {
    throw new ApiError(403, "Your account is inactive");
  }

  // 5. Generate access and refresh tokens
  const accessToken = generateAccessToken({
    sub: String(user.id),
    role: user.role,
  });

  const refreshToken = generateRefreshToken();

  const familyId = generateTokenFamilyId();

  // 6. Calculate refresh-token expiration
  const expiresAt = new Date(
    Date.now() +
      env.REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000
  );

  // 7. Store only the hashed refresh token
  await db.orm.public.RefreshToken.create({
    userId: user.id,
    tokenHash: hashRefreshToken(refreshToken),
    familyId,
    expiresAt,
  });

  // 8. Return the authentication session
  return {
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      username: user.username,
      phone: user.phone,
      role: user.role,
      isActive: user.isActive,
    },
    accessToken,
    refreshToken,
  };
};



export const refreshSession = async (
  rawRefreshToken: string
): Promise<AuthSession> => {
  if (!rawRefreshToken) {
    throw new ApiError(401, "Refresh token is required");
  }

  const tokenHash = hashRefreshToken(rawRefreshToken);
  const now = new Date();

  const result = await db.transaction(async (tx) => {
    // 1. Find and lock the refresh-token record
    const storedToken = await tx.orm.public.RefreshToken
      .where({ tokenHash })
      .forUpdate()
      .first();

    if (!storedToken) {
      return { status: "INVALID" as const };
    }

    // 2. Detect reuse of an already-revoked token
    if (storedToken.revokedAt) {
      await tx.orm.public.RefreshToken
        .where({
          familyId: storedToken.familyId,
          revokedAt: null,
        })
        .updateAll({ revokedAt: now });

      return { status: "REUSED" as const };
    }

    // 3. Check expiration
    if (storedToken.expiresAt <= now) {
      await tx.orm.public.RefreshToken
        .where({ id: storedToken.id })
        .update({ revokedAt: now });

      return { status: "EXPIRED" as const };
    }

    // 4. Verify the associated user
    const user = await tx.orm.public.User
      .where({ id: storedToken.userId })
      .first();

    if (!user || !user.isActive) {
      await tx.orm.public.RefreshToken
        .where({
          familyId: storedToken.familyId,
          revokedAt: null,
        })
        .updateAll({ revokedAt: now });

      return { status: "INACTIVE" as const };
    }

    // 5. Revoke the old refresh token
    await tx.orm.public.RefreshToken
      .where({ id: storedToken.id })
      .update({ revokedAt: now });

    // 6. Generate replacement tokens
    const newRefreshToken = generateRefreshToken();

    const newAccessToken = generateAccessToken({
      sub: String(user.id),
      role: user.role,
    });

    const expiresAt = new Date(
      Date.now() +
        env.REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000
    );

    // 7. Store the new hashed refresh token
    await tx.orm.public.RefreshToken.create({
      userId: user.id,
      tokenHash: hashRefreshToken(newRefreshToken),
      familyId: storedToken.familyId,
      expiresAt,
    });

    return {
      status: "SUCCESS" as const,
      session: {
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          username: user.username,
          phone: user.phone,
          role: user.role,
          isActive: user.isActive,
        },
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
      },
    };
  });

  // 8. Handle outcomes after the transaction commits
  if (result.status === "REUSED") {
    throw new ApiError(
      401,
      "Refresh token reuse detected. Please log in again."
    );
  }

  if (result.status === "INACTIVE") {
    throw new ApiError(403, "Your account is inactive");
  }

  if (result.status !== "SUCCESS") {
    throw new ApiError(401, "Invalid or expired refresh token");
  }

  return result.session;
};



export const logoutUser = async (
  rawRefreshToken?: string
): Promise<void> => {
  if (!rawRefreshToken) {
    return;
  }

  const tokenHash = hashRefreshToken(rawRefreshToken);

  const storedToken = await db.orm.public.RefreshToken
    .where({ tokenHash })
    .first();

  if (!storedToken || storedToken.revokedAt) {
    return;
  }

  await db.orm.public.RefreshToken
    .where({ id: storedToken.id })
    .update({ revokedAt: new Date() });
};
