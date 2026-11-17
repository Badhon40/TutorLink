import jwt from "jsonwebtoken";
import { env } from "../../config/env";
import { db } from "../../prisma/db";
import { ApiError } from "../../utils/ApiError";
import type {
  LiveClassAccessInfo,
  ParticipantRole,
  RoomTokenClaims,
} from "./live-class.types";

// ─── Constants ────────────────────────────────────────────────────────────────

/** Allow joining this many minutes before the session's scheduled start */
const EARLY_JOIN_MINUTES = 10;

/** Room token validity window (seconds). Long enough to cover the session. */
const TOKEN_TTL_SECONDS = 60 * 60 * 24; // 24 h

// ─── Helpers ──────────────────────────────────────────────────────────────────

function buildRoomId(bookingId: number): string {
  return `tutorlink-room-${bookingId}`;
}

function minutesFromNow(minutes: number): Date {
  return new Date(Date.now() + minutes * 60 * 1000);
}

// ─── Token Generation ─────────────────────────────────────────────────────────

/**
 * Sign a short-lived JWT that grants access to one specific room.
 * The token is verified by the WebSocket signaling server on connection.
 */
export function generateRoomToken(
  bookingId: number,
  userId: number,
  role: ParticipantRole
): string {
  const roomId = buildRoomId(bookingId);

  const payload: Omit<RoomTokenClaims, "exp" | "iat"> = {
    bookingId,
    userId,
    role,
    roomId,
  };

  return jwt.sign(payload, env.LIVE_CLASS_SECRET, {
    expiresIn: TOKEN_TTL_SECONDS,
  });
}

/**
 * Verify and decode a room token.
 * Throws `ApiError(401)` on any verification failure.
 */
export function validateRoomToken(token: string): RoomTokenClaims {
  try {
    return jwt.verify(token, env.LIVE_CLASS_SECRET) as RoomTokenClaims;
  } catch (err: any) {
    if (err?.name === "TokenExpiredError") {
      throw new ApiError(401, "Live-class room token has expired");
    }
    throw new ApiError(401, "Invalid live-class room token");
  }
}

// ─── Room Access Validation ───────────────────────────────────────────────────

/**
 * Full access-control check for a live-class room request.
 *
 * Validates:
 * 1. The booking exists and is `CONFIRMED`.
 * 2. The requesting user is the booking's student, tutor, or an ADMIN.
 * 3. The current time is within the allowed window
 *    (`startAt - EARLY_JOIN_MINUTES` → `endAt`).
 *
 * Returns signed room-token + metadata on success.
 */
export async function getRoomAccessInfo(
  bookingId: number,
  userId: number,
  userRole: "STUDENT" | "TUTOR" | "ADMIN"
): Promise<LiveClassAccessInfo> {
  // 1. Load booking
  let booking: any;
  try {
    booking = await db.orm.public.Booking.where({ id: bookingId }).first();
  } catch (err) {
    throw new ApiError(500, "Failed to load booking");
  }

  if (!booking) {
    throw new ApiError(404, "Booking not found");
  }

  if (booking.status !== "CONFIRMED") {
    throw new ApiError(
      400,
      `Live class is only available for CONFIRMED bookings. Current status: ${booking.status}`
    );
  }

  // 2. Determine participant role
  let participantRole: ParticipantRole;

  if (userRole === "ADMIN") {
    participantRole = "admin";
  } else if (userRole === "STUDENT") {
    let profile: any;
    try {
      profile = await db.orm.public.StudentProfile.where({
        userId,
      }).first();
    } catch {
      throw new ApiError(500, "Failed to load student profile");
    }

    if (!profile || profile.id !== booking.studentId) {
      throw new ApiError(
        403,
        "You are not a participant of this live class session"
      );
    }
    participantRole = "student";
  } else if (userRole === "TUTOR") {
    let profile: any;
    try {
      profile = await db.orm.public.TutorProfile.where({ userId }).first();
    } catch {
      throw new ApiError(500, "Failed to load tutor profile");
    }

    if (!profile || profile.id !== booking.tutorId) {
      throw new ApiError(
        403,
        "You are not a participant of this live class session"
      );
    }
    participantRole = "tutor";
  } else {
    throw new ApiError(403, "Unknown user role");
  }

  // 3. Time-window check
  const now = new Date();
  const earliestJoin = new Date(
    new Date(booking.startAt).getTime() - EARLY_JOIN_MINUTES * 60 * 1000
  );
  const latestJoin = new Date(booking.endAt);

  if (now < earliestJoin) {
    const minutesUntil = Math.ceil(
      (earliestJoin.getTime() - now.getTime()) / 60000
    );
    throw new ApiError(
      400,
      `Live class room is not open yet. It opens ${minutesUntil} minute(s) before the session starts.`
    );
  }

  if (now > latestJoin) {
    throw new ApiError(400, "This live class session has already ended.");
  }

  // 4. Issue room token
  const token = generateRoomToken(bookingId, userId, participantRole);
  const roomId = buildRoomId(bookingId);

  // Build WebSocket URL relative to the API base
  const apiBase = env.API_BASE_URL.replace(/^https?/, (m) =>
    m === "https" ? "wss" : "ws"
  );
  const wsUrl = `${apiBase}/ws/live-class?token=${token}`;

  return {
    bookingId,
    roomId,
    token,
    wsUrl,
    role: participantRole,
    scheduledStartAt: booking.startAt,
    scheduledEndAt: booking.endAt,
    durationMin: booking.durationMin,
  };
}
