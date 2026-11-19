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
// Protected Tutor-Only Routes
// ============================================================
// Tutor Profile Management
router.get("/me", authenticate, authorize("TUTOR"), catchAsync(getMyTutorProfile));
router.patch("/me", authenticate, authorize("TUTOR"), catchAsync(updateMyTutorProfile));

// Tutor Earnings & Payouts (Section 3.3 & 3.7)
router.get("/me/payouts", authenticate, authorize("TUTOR"), catchAsync(getMyTutorPayouts));

// Tutor Availability Scheduling
router.post("/availability", authenticate, authorize("TUTOR"), catchAsync(createMyAvailability));
router.get("/availability", authenticate, authorize("TUTOR"), catchAsync(getMyAvailabilityList));
router.put("/availability/:availabilityId", authenticate, authorize("TUTOR"), catchAsync(updateMyAvailability));
router.delete("/availability/:availabilityId", authenticate, authorize("TUTOR"), catchAsync(deleteMyAvailability));

// ============================================================
// Public Discovery Routes (Accessible by Students and Guests)
// ============================================================
router.get("/", catchAsync(getPublicTutorsList));
router.get("/:tutorId", catchAsync(getPublicTutor));
router.get("/:tutorId/availability", catchAsync(getPublicAvailability));

export default router;
