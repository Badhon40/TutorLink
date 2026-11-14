
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

import {
  createMyAvailability,
  getMyAvailabilityList,
  updateMyAvailability,
  deleteMyAvailability,
} from "./availability.controller";

const router = Router();

router.use(authenticate, authorize("TUTOR"));

// Tutor profile
router.get("/me", catchAsync(getMyTutorProfile));
router.patch("/me", catchAsync(updateMyTutorProfile));

// Tutor availability
router.post("/availability", catchAsync(createMyAvailability));
router.get("/availability", catchAsync(getMyAvailabilityList));

router.put(
  "/availability/:availabilityId",
  catchAsync(updateMyAvailability)
);

router.delete(
  "/availability/:availabilityId",
  catchAsync(deleteMyAvailability)
);

export default router;
