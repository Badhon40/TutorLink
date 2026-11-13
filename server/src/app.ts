
import express from "express";
import { db } from "./prisma/db";
import { corsMiddleware } from "./config/cors";
import { globalErrorHandler } from "./middlewares/error.middleware";
import { ApiError } from "./utils/ApiError";
import cookieParser from "cookie-parser";
import authRoutes from "./modules/auth/auth.routes";

const app = express();

// Global middleware
app.use(corsMiddleware);
app.use(express.json());
app.use(cookieParser());


// Basic API route
app.get("/", (_req, res) => {
  res.status(200).send("TutorLink API is running");
});

// API health check
app.get("/api/health", (_req, res) => {
  res.status(200).json({
    success: true,
    message: "TutorLink API is healthy",
  });
});

// Database health check
app.get("/api/health/db", async (_req, res) => {
  try {
    // Execute a real database query without retrieving all users
    await db.orm.public.User.first();

    res.status(200).json({
      success: true,
      message: "PostgreSQL connection successful",
      database: "connected",
    });
  } catch (error) {
    console.error("Database health check failed:", error);

    res.status(503).json({
      success: false,
      message: "Database connection failed",
      database: "disconnected",
    });
  }
});


// Auth routes
app.use("/api/auth", authRoutes);

// Global error handler

app.use(globalErrorHandler);

export default app;
