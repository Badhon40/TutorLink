import { Router } from "express";

import {
  authenticate,
  authorize,
} from "../../middlewares/auth.middleware";

import { catchAsync } from "../../utils/catchAsync";

import { getTutorRecommendations } from "./recommendation.controller";

const router = Router();

router.use(authenticate, authorize("STUDENT"));

// Student retrieves personalized tutor recommendations (Section 3.4)
router.get("/tutors", catchAsync(getTutorRecommendations));

export default router;
