import { Router } from "express";

import {
  authenticate,
  authorize,
} from "../../middlewares/auth.middleware";

import { catchAsync } from "../../utils/catchAsync";

import {
  getPublicTutorsList,
  getPublicTutor,
  getPublicAvailability,
  getMyTutorProfile,
  updateMyTutorProfile,
  getMyTutorPayouts,
} from "./tutor.controller";

import {
  createMyAvailability,
  getMyAvailabilityList,
  updateMyAvailability,
  deleteMyAvailability,
} from "./availability.controller";

const router = Router();

// ============================================================
// Public Discovery Routes (Accessible by Students and Guests)
// ============================================================
router.get("/", catchAsync(getPublicTutorsList));
router.get("/:tutorId", catchAsync(getPublicTutor));
router.get("/:tutorId/availability", catchAsync(getPublicAvailability));

// ============================================================
// Protected Tutor-Only Routes
// ============================================================
router.use(authenticate, authorize("TUTOR"));

// Tutor Profile Management
router.get("/me", catchAsync(getMyTutorProfile));
router.patch("/me", catchAsync(updateMyTutorProfile));

// Tutor Earnings & Payouts (Section 3.3 & 3.7)
router.get("/me/payouts", catchAsync(getMyTutorPayouts));

// Tutor Availability Scheduling
router.post("/availability", catchAsync(createMyAvailability));
router.get("/availability", catchAsync(getMyAvailabilityList));
router.put("/availability/:availabilityId", catchAsync(updateMyAvailability));
router.delete("/availability/:availabilityId", catchAsync(deleteMyAvailability));

export default router;
