
import { Router } from "express";

import {
  authenticate,
  authorize,
} from "../../middlewares/auth.middleware";

import { catchAsync } from "../../utils/catchAsync";

import {
  getMyStudentProfile,
  updateMyStudentProfile,
} from "./student.controller";

const router = Router();

// All student routes require authentication and STUDENT role
router.use(authenticate, authorize("STUDENT"));

// Get own student profile
router.get(
  "/me",
  catchAsync(getMyStudentProfile)
);

// Create or partially update own student profile
router.patch(
  "/me",
  catchAsync(updateMyStudentProfile)
);

export default router;
