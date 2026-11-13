
import cors, { type CorsOptions } from "cors";

const allowedOrigins = [
  "http://localhost:3000",
  "http://127.0.0.1:3000",
];

const corsOptions: CorsOptions = {
  origin: (origin, callback) => {
    // Allow requests without an Origin header
    // (e.g. curl, Postman, server-to-server requests).
    if (!origin || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    return callback(new Error("Not allowed by CORS"));
  },

  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],

  allowedHeaders: ["Content-Type", "Authorization"],

  credentials: true,

  optionsSuccessStatus: 204,
};

export const corsMiddleware = cors(corsOptions);
