import express from "express";
import helmet from "helmet";
import morgan from "morgan";
import cookieParser from "cookie-parser";

import { db } from "./prisma/db";
import { corsMiddleware } from "./config/cors";
import { globalErrorHandler } from "./middlewares/error.middleware";
import { env } from "./config/env";

import authRoutes from "./modules/auth/auth.routes";
import studentRoutes from "./modules/students/student.routes";
import tutorRoutes from "./modules/tutors/tutor.routes";
import bookingRoutes from "./modules/bookings/booking.routes";
import paymentRoutes from "./modules/payments/payment.routes";
import verificationRoutes from "./modules/verification/verification.routes";
import reviewRoutes from "./modules/reviews/review.routes";
import notificationRoutes from "./modules/notifications/notification.routes";
import adminRoutes from "./modules/admin/admin.routes";
import recommendationRoutes from "./modules/recommendations/recommendation.routes";
import refundRoutes from "./modules/refunds/refund.routes";
import liveClassRoutes from "./modules/live-classes/live-class.routes";
import { getRoomStats } from "./modules/live-classes/live-class.signaling";

const app = express();

// Security and Logging Middleware
app.use(helmet());
if (env.NODE_ENV !== "test") {
  app.use(morgan("dev"));
}

// Global Parsers
app.use(corsMiddleware);
app.use(express.json());
// URL-encoded parser required for payment gateway IPN and form redirects
app.use(express.urlencoded({ extended: true }));
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

// Core Feature Routes
app.use("/api/auth", authRoutes);
app.use("/api/students", studentRoutes);
app.use("/api/tutors", tutorRoutes);
app.use("/api/bookings", bookingRoutes);
app.use("/api/payments", paymentRoutes);

// Extended Platform Routes
app.use("/api/verification", verificationRoutes);
app.use("/api/reviews", reviewRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/recommendations", recommendationRoutes);
app.use("/api/refunds", refundRoutes);
app.use("/api/live-classes", liveClassRoutes);

// Live class room diagnostics (admin-useful, no auth so it stays simple)
app.get("/api/health/live-classes", (_req, res) => {
  res.status(200).json({ success: true, ...getRoomStats() });
});

// Global error handler
app.use(globalErrorHandler);

export default app;
