
import { Router } from "express";

import {
  authenticate,
  authorize,
} from "../../middlewares/auth.middleware";

import { catchAsync } from "../../utils/catchAsync";

import {
  getMyTutorProfile,
  updateMyTutorProfile,
} from "./tutor.controller";

const router = Router();

// All routes require an authenticated TUTOR account.
router.use(authenticate, authorize("TUTOR"));

// Retrieve the logged-in tutor's profile.
router.get("/me", catchAsync(getMyTutorProfile));

// Create or update the logged-in tutor's profile.
router.patch("/me", catchAsync(updateMyTutorProfile));

export default router;
