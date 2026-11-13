
import { db } from "../../prisma/db";
import { ApiError } from "../../utils/ApiError";
import type { TutorProfileInput } from "./tutor.validation";

export const getTutorProfile = async (userId: number) => {
  const profile = await db.orm.public.TutorProfile
    .where({ userId })
    .first();

  if (!profile) {
    throw new ApiError(404, "Tutor profile not found");
  }

  return profile;
};

export const saveTutorProfile = async (
  userId: number,
  input: TutorProfileInput
) => {
  const existingProfile = await db.orm.public.TutorProfile
    .where({ userId })
    .first();

  const { hourlyRate, ...otherFields } = input;

  const profileData = {
    ...otherFields,
    ...(hourlyRate !== undefined
      ? { hourlyRate: hourlyRate.toString() }
      : {}),
  };

  if (existingProfile) {
    return await db.orm.public.TutorProfile
      .where({ userId })
      .update(profileData);
  }

  if (hourlyRate === undefined) {
    throw new ApiError(400, "Hourly rate is required when creating a tutor profile");
  }

  return await db.orm.public.TutorProfile.create({
    userId,
    qualification: input.qualification ?? null,
    institution: input.institution ?? null,
    department: input.department ?? null,
    experienceYears: input.experienceYears ?? 0,
    bio: input.bio ?? null,
    subjects: input.subjects ?? [],
    hourlyRate: hourlyRate.toString(),
    location: input.location ?? null,
    profileImage: input.profileImage ?? null,
    accountNumber: input.accountNumber ?? null,
  });
};
