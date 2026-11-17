import { db } from "../../prisma/db";
import { ApiError } from "../../utils/ApiError";
import type { StudentProfileInput } from "./student.validation";

// Get own student profile
export const getStudentProfile = async (userId: number) => {
  const profile = await db.orm.public.StudentProfile
    .where({ userId })
    .first();

  if (!profile) {
    throw new ApiError(404, "Student profile not found");
  }

  return profile;
};

// Get student profile by profile ID (for tutors/admins inspecting bookings)
export const getStudentProfileById = async (studentProfileId: number) => {
  const profile = await db.orm.public.StudentProfile
    .where({ id: studentProfileId })
    .first();

  if (!profile) {
    throw new ApiError(404, "Student profile not found");
  }

  const user = await db.orm.public.User.where({ id: profile.userId }).first();

  return {
    ...profile,
    user: user
      ? {
          id: user.id,
          name: user.name,
          username: user.username,
        }
      : null,
  };
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
