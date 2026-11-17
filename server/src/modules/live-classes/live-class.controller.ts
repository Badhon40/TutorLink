import { Request, Response } from "express";
import { z } from "zod";
import { ApiError } from "../../utils/ApiError";
import { ApiResponse } from "../../utils/ApiResponse";
import { catchAsync } from "../../utils/catchAsync";
import type { AuthenticatedUser } from "../../middlewares/auth.middleware";
import { getRoomAccessInfo } from "./live-class.service";

// ─── Validation ───────────────────────────────────────────────────────────────

const bookingIdSchema = z.object({
  bookingId: z.coerce.number().int().positive(),
});

// ─── Controllers ──────────────────────────────────────────────────────────────

/**
 * GET /api/live-classes/:bookingId/token
 *
 * Returns a signed room token + WebSocket URL for the calling user.
 * Enforces participation check and time-window access rules.
 */
export const getLiveClassToken = catchAsync(
  async (req: Request, res: Response) => {
    const auth = res.locals.auth as AuthenticatedUser;

    const params = bookingIdSchema.safeParse(req.params);
    if (!params.success) {
      throw new ApiError(
        400,
        "Invalid booking ID",
        params.error.flatten().fieldErrors
      );
    }

    const accessInfo = await getRoomAccessInfo(
      params.data.bookingId,
      auth.userId,
      auth.role
    );

    return res.status(200).json(
      new ApiResponse(200, "Live class access granted", {
        ...accessInfo,
        instructions: {
          websocket:
            "Connect to `wsUrl` with a WebSocket client. No extra headers needed — the token is in the query string.",
          protocol: [
            "On connect: server sends `{ type: 'peer-joined' }` if the other participant is already in the room.",
            "To offer a WebRTC session: send `{ type: 'offer', payload: { sdp } }`.",
            "To answer: send `{ type: 'answer', payload: { sdp } }`.",
            "To relay ICE candidates: send `{ type: 'ice-candidate', payload: { candidate } }`.",
            "To leave gracefully: send `{ type: 'leave' }`.",
            "Send `{ type: 'ping' }` every 30 s to keep the connection alive.",
          ],
        },
      })
    );
  }
);
