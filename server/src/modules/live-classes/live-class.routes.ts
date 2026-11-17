import { Router } from "express";
import { authenticate } from "../../middlewares/auth.middleware";
import { getLiveClassToken } from "./live-class.controller";

const router = Router();

/**
 * GET /api/live-classes/:bookingId/token
 * → Returns a signed room token + WebSocket URL for a confirmed booking.
 *   Requires: authenticated user who is a participant (student/tutor) or admin.
 */
router.get("/:bookingId/token", authenticate, getLiveClassToken);

export default router;
