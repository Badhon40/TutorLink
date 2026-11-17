// ─── WebRTC Live Class – Shared Types ───────────────────────────────────────

export type ParticipantRole = "student" | "tutor" | "admin";

/**
 * All WebSocket message types for the signaling protocol.
 *
 * Client → Server:
 *   join           – enter a room (must include a valid room token)
 *   offer          – send WebRTC SDP offer to the peer
 *   answer         – send WebRTC SDP answer to the peer
 *   ice-candidate  – relay an ICE candidate to the peer
 *   leave          – gracefully leave the room
 *   ping           – keep-alive heartbeat
 *
 * Server → Client:
 *   peer-joined    – the other participant has joined the room
 *   peer-left      – the other participant has left / disconnected
 *   offer          – relayed SDP offer from peer
 *   answer         – relayed SDP answer from peer
 *   ice-candidate  – relayed ICE candidate from peer
 *   error          – something went wrong (message contains details)
 *   pong           – heartbeat reply
 */
export type SignalType =
  | "join"
  | "offer"
  | "answer"
  | "ice-candidate"
  | "leave"
  | "peer-joined"
  | "peer-left"
  | "error"
  | "ping"
  | "pong";

/** Wire format for every WebSocket message */
export interface SignalMessage {
  type: SignalType;
  /** Room the message belongs to (required for all messages except ping/pong) */
  roomId?: string;
  /** Arbitrary payload – SDP, ICE candidate, error text, etc. */
  payload?: unknown;
}

/** Claims embedded in a signed room JWT */
export interface RoomTokenClaims {
  bookingId: number;
  userId: number;
  role: ParticipantRole;
  /** Deterministic room identifier (`tutorlink-room-<bookingId>`) */
  roomId: string;
  /** Standard JWT expiry (Unix seconds) */
  exp: number;
  /** Issued-at (Unix seconds) */
  iat: number;
}

/** Metadata returned to the client when they request a room token */
export interface LiveClassAccessInfo {
  bookingId: number;
  roomId: string;
  token: string;
  wsUrl: string;
  role: ParticipantRole;
  scheduledStartAt: Date;
  scheduledEndAt: Date;
  durationMin: number;
}

/** Internal representation of a connected peer inside a room */
export interface RoomPeer {
  ws: import("ws").WebSocket;
  userId: number;
  role: ParticipantRole;
  joinedAt: Date;
}
