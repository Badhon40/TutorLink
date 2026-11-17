import http from "http";
import app from "./app";
import { env } from "./config/env";
import { attachSignalingServer } from "./modules/live-classes/live-class.signaling";

// ─── HTTP + WebSocket Server ──────────────────────────────────────────────────

const server = http.createServer(app);

// Attach WebRTC signaling WebSocket server at ws://…/ws/live-class
attachSignalingServer(server);

// ─── Start Listening ──────────────────────────────────────────────────────────

server.listen(env.PORT, () => {
  console.log(`✅ TutorLink Server is running on port ${env.PORT}`);
  console.log(`   REST API  → http://localhost:${env.PORT}/api`);
  console.log(`   WebSocket → ws://localhost:${env.PORT}/ws/live-class`);
  console.log(`   Env       → ${env.NODE_ENV}`);
});

// ─── Graceful Shutdown ────────────────────────────────────────────────────────

process.on("SIGTERM", () => {
  console.log("SIGTERM received — shutting down gracefully");
  server.close(() => {
    console.log("HTTP server closed");
    process.exit(0);
  });
});

process.on("SIGINT", () => {
  console.log("SIGINT received — shutting down");
  server.close(() => process.exit(0));
});
