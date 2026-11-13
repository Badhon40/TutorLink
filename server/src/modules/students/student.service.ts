
import { db } from "../../prisma/db";
import { ApiError } from "../../utils/ApiError";
import type { StudentProfileInput } from "./student.validation";

// Get a student's profile
export const getStudentProfile = async (userId: number) => {
  const profile = await db.orm.public.StudentProfile
    .where({ userId })
    .first();

  if (!profile) {
    throw new ApiError(404, "Student profile not found");
  }

  return profile;
};

// Create or update a student's profile

export const saveStudentProfile = async (
  userId: number,
  input: StudentProfileInput
) => {
  const existingProfile = await db.orm.public.StudentProfile
    .where({ userId })
    .first();

  if (existingProfile) {
    return await db.orm.public.StudentProfile
      .where({ userId })
      .update(input);
  }

  return await db.orm.public.StudentProfile.create({
    userId,
    institution: input.institution ?? null,
    department: input.department ?? null,
    educationLevel: input.educationLevel ?? null,
    location: input.location ?? null,
    profileImage: input.profileImage ?? null,
  });
};

