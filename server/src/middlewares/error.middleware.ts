
import type { ErrorRequestHandler } from "express";
import { ApiError } from "../utils/ApiError";

export const globalErrorHandler: ErrorRequestHandler = (
  error,
  _req,
  res,
  next
) => {
  if (res.headersSent) {
    return next(error);
  }

  let statusCode = 500;
  let message = "Internal server error";

  if (error instanceof ApiError) {
    statusCode = error.statusCode;
    message = error.message;
  } else if (error instanceof SyntaxError && "status" in error) {
    const bodyError = error as SyntaxError & { status?: number };

    if (bodyError.status === 400) {
      statusCode = 400;
      message = "Invalid JSON request body";
    }
  }

  if (statusCode >= 500) {
    console.error(error);
  }

  res.status(statusCode).json({
    success: false,
    statusCode,
    message,
  });
};

