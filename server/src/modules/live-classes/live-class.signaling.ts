/**
 * WebRTC Signaling Server — TutorLink Live Classes
 * ─────────────────────────────────────────────────
 * Architecture
 * ────────────
 *  • A single `WebSocketServer` is attached to the existing HTTP server and
 *    handles upgrade requests on the path `/ws/live-class`.
 *  • Every room maps to a bookingId and can hold at most TWO authenticated
 *    peers (one "student" and one "tutor"; admins may join as observers but
 *    are not relayed to).
 *  • The room token (signed JWT) is passed as a `?token=` query-string param
 *    during the WebSocket handshake — no additional auth headers are needed.
 *  • Signal messages are relayed peer-to-peer:  client A → server → client B.
 *
 * Message Protocol (JSON over WebSocket)
 * ────────────────────────────────────────
 *  Client → Server
 *    { type: "join"          }   – implicit on connection (no extra send needed)
 *    { type: "offer",         payload: <RTCSessionDescriptionInit> }
 *    { type: "answer",        payload: <RTCSessionDescriptionInit> }
 *    { type: "ice-candidate", payload: <RTCIceCandidateInit>      }
 *    { type: "leave"         }   – graceful disconnect
 *    { type: "ping"          }   – keep-alive (server replies "pong")
 *
 *  Server → Client
 *    { type: "peer-joined"   }   – other peer entered the room
 *    { type: "peer-left"     }   – other peer left / disconnected
 *    { type: "offer",         payload: … }
 *    { type: "answer",        payload: … }
 *    { type: "ice-candidate", payload: … }
 *    { type: "error",         payload: { message: string } }
 *    { type: "pong"          }
 */

import http from "http";
import { URL } from "url";
import { WebSocket, WebSocketServer } from "ws";
import { validateRoomToken } from "./live-class.service";
import type { RoomPeer, SignalMessage, SignalType } from "./live-class.types";

// ─── Room Registry ────────────────────────────────────────────────────────────

/**
 * rooms: roomId → Map<role → RoomPeer>
 *
 * We allow at most two canonical roles ("student" / "tutor") in a room.
 * An "admin" peer joins as an observer (receives no relayed signals and does
 * not trigger "peer-joined" for the participants).
 */
const rooms = new Map<string, Map<string, RoomPeer>>();

// ─── Utilities ────────────────────────────────────────────────────────────────

function send(ws: WebSocket, type: SignalType, payload?: unknown): void {
  if (ws.readyState !== WebSocket.OPEN) return;
  const msg: SignalMessage = { type, roomId: undefined, payload };
  ws.send(JSON.stringify(msg));
}

function sendError(ws: WebSocket, message: string): void {
  send(ws, "error", { message });
}

function getOtherPeer(
  roomId: string,
  myRole: string
): RoomPeer | undefined {
  const room = rooms.get(roomId);
  if (!room) return undefined;
  for (const [role, peer] of room.entries()) {
    if (role !== myRole && role !== "admin") return peer;
  }
  return undefined;
}

function relay(
  roomId: string,
  fromRole: string,
  type: SignalType,
  payload?: unknown
): void {
  const peer = getOtherPeer(roomId, fromRole);
  if (peer) send(peer.ws, type, payload);
}

// ─── Attach to HTTP Server ────────────────────────────────────────────────────

export function attachSignalingServer(server: http.Server): void {
  const wss = new WebSocketServer({ noServer: true });

  // Only handle upgrades on /ws/live-class
  server.on("upgrade", (request, socket, head) => {
    const reqUrl = new URL(
      request.url ?? "/",
      `http://${request.headers.host}`
    );

    if (reqUrl.pathname !== "/ws/live-class") {
      socket.destroy();
      return;
    }

    // Validate token before accepting the upgrade
    const token = reqUrl.searchParams.get("token");
    if (!token) {
      socket.write("HTTP/1.1 401 Unauthorized\r\n\r\n");
      socket.destroy();
      return;
    }

    let claims: ReturnType<typeof validateRoomToken>;
    try {
      claims = validateRoomToken(token);
    } catch {
      socket.write("HTTP/1.1 401 Unauthorized\r\n\r\n");
      socket.destroy();
      return;
    }

    // Upgrade accepted — attach claims as custom property
    wss.handleUpgrade(request, socket, head, (ws) => {
      (ws as any)._claims = claims;
      wss.emit("connection", ws, request);
    });
  });

  // ─── Connection Handler ──────────────────────────────────────────────────

  wss.on("connection", (ws: WebSocket) => {
    const claims = (ws as any)._claims as ReturnType<typeof validateRoomToken>;
    const { roomId, role, userId, bookingId } = claims;

    console.log(
      `[LiveClass] CONNECT  bookingId=${bookingId} userId=${userId} role=${role} room=${roomId}`
    );

    // Ensure room exists
    if (!rooms.has(roomId)) {
      rooms.set(roomId, new Map());
    }
    const room = rooms.get(roomId)!;

    // Reject duplicate role (a user refreshing tabs shouldn't silently evict the old connection)
    if (room.has(role)) {
      const existing = room.get(role)!;
      if (existing.ws.readyState === WebSocket.OPEN) {
        sendError(ws, "Another connection with your role is already in this room.");
        ws.close(4000, "Duplicate role in room");
        return;
      }
      // Old socket is dead — replace it
      room.delete(role);
    }

    // Add peer to room
    const peer: RoomPeer = { ws, userId, role, joinedAt: new Date() };
    room.set(role, peer);

    // Notify the other participant that a peer has joined
    if (role !== "admin") {
      relay(roomId, role, "peer-joined");
    }

    // ─── Message Handler ───────────────────────────────────────────────────

    ws.on("message", (data) => {
      let msg: SignalMessage;
      try {
        msg = JSON.parse(data.toString()) as SignalMessage;
      } catch {
        sendError(ws, "Malformed JSON message.");
        return;
      }

      switch (msg.type) {
        // Keep-alive
        case "ping":
          send(ws, "pong");
          break;

        // WebRTC signaling — relay to the peer
        case "offer":
        case "answer":
        case "ice-candidate":
          if (role === "admin") {
            sendError(ws, "Admin observers cannot send WebRTC signals.");
            break;
          }
          relay(roomId, role, msg.type, msg.payload);
          break;

        // Graceful leave
        case "leave":
          handleLeave(ws, roomId, role);
          break;

        default:
          sendError(ws, `Unknown message type: ${(msg as any).type}`);
      }
    });

    // ─── Disconnect Handler ────────────────────────────────────────────────

    ws.on("close", () => {
      console.log(
        `[LiveClass] CLOSE    bookingId=${bookingId} userId=${userId} role=${role}`
      );
      handleLeave(ws, roomId, role);
    });

    ws.on("error", (err) => {
      console.error(
        `[LiveClass] ERROR    bookingId=${bookingId} userId=${userId} role=${role}`,
        err.message
      );
    });
  });

  console.log("[LiveClass] WebRTC signaling server attached at /ws/live-class");
}

// ─── Leave Logic ──────────────────────────────────────────────────────────────

function handleLeave(ws: WebSocket, roomId: string, role: string): void {
  const room = rooms.get(roomId);
  if (!room) return;

  // Only remove if this exact socket is still the registered peer
  const existing = room.get(role);
  if (existing && existing.ws === ws) {
    room.delete(role);

    // Notify the remaining participant
    if (role !== "admin") {
      for (const [, peer] of room.entries()) {
        if (peer.role !== "admin") {
          send(peer.ws, "peer-left");
        }
      }
    }

    // Clean up empty rooms
    if (room.size === 0) {
      rooms.delete(roomId);
      console.log(`[LiveClass] ROOM_CLOSED room=${roomId}`);
    }
  }
}

// ─── Room Diagnostics (for admin/health endpoints) ────────────────────────────

export function getRoomStats(): { totalRooms: number; rooms: object[] } {
  const roomList: object[] = [];
  for (const [roomId, peers] of rooms.entries()) {
    roomList.push({
      roomId,
      participants: Array.from(peers.values()).map((p) => ({
        role: p.role,
        userId: p.userId,
        joinedAt: p.joinedAt,
        connected: p.ws.readyState === WebSocket.OPEN,
      })),
    });
  }
  return { totalRooms: rooms.size, rooms: roomList };
}
