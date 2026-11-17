import { Router } from "express";

import {
  authenticate,
  authorize,
} from "../../middlewares/auth.middleware";

import { catchAsync } from "../../utils/catchAsync";

import {
  getMyStudentProfile,
  getStudentProfileDetails,
  updateMyStudentProfile,
} from "./student.controller";

const router = Router();

router.use(authenticate);

// Get own student profile
router.get(
  "/me",
  authorize("STUDENT"),
  catchAsync(getMyStudentProfile)
);

// Create or partially update own student profile
router.patch(
  "/me",
  authorize("STUDENT"),
  catchAsync(updateMyStudentProfile)
);

// Tutors or admins view student details for booking verification
router.get(
  "/:studentId",
  authorize("STUDENT", "TUTOR", "ADMIN"),
  catchAsync(getStudentProfileDetails)
);

export default router;
