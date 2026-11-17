import { db } from "../../prisma/db";
import { ApiError } from "../../utils/ApiError";
import type { TutorProfileInput, TutorQueryInput } from "./tutor.validation";

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
    payoutMethod: input.payoutMethod ?? null,
  });
};

// Public Discovery: Search and list tutors with filters
export const listPublicTutors = async (query: TutorQueryInput) => {
  const page = query.page ?? 1;
  const limit = query.limit ?? 10;

  // Retrieve all tutor profiles
  let tutors = await db.orm.public.TutorProfile.all();

  // Filter in-memory for flexible matching
  if (query.search) {
    const term = query.search.toLowerCase();
    tutors = tutors.filter((tutor) => {
      const bioMatch = tutor.bio?.toLowerCase().includes(term);
      const qualMatch = tutor.qualification?.toLowerCase().includes(term);
      const instMatch = tutor.institution?.toLowerCase().includes(term);
      const deptMatch = tutor.department?.toLowerCase().includes(term);
      const subjMatch = tutor.subjects?.some((s) => s.toLowerCase().includes(term));
      return bioMatch || qualMatch || instMatch || deptMatch || subjMatch;
    });
  }

  if (query.subject) {
    const subjTerm = query.subject.toLowerCase();
    tutors = tutors.filter((tutor) =>
      tutor.subjects?.some((s) => s.toLowerCase().includes(subjTerm))
    );
  }

  if (query.location) {
    const locTerm = query.location.toLowerCase();
    tutors = tutors.filter((tutor) =>
      tutor.location?.toLowerCase().includes(locTerm)
    );
  }

  if (query.minRate !== undefined) {
    tutors = tutors.filter((tutor) => Number(tutor.hourlyRate) >= query.minRate!);
  }

  if (query.maxRate !== undefined) {
    tutors = tutors.filter((tutor) => Number(tutor.hourlyRate) <= query.maxRate!);
  }

  if (query.minRating !== undefined) {
    tutors = tutors.filter((tutor) => tutor.averageRating >= query.minRating!);
  }

  const total = tutors.length;
  const totalPages = Math.ceil(total / limit);
  const startIndex = (page - 1) * limit;
  const paginatedTutors = tutors.slice(startIndex, startIndex + limit);

  // Attach user names and emails (sanitized)
  const populatedTutors = await Promise.all(
    paginatedTutors.map(async (tutor) => {
      const user = await db.orm.public.User.where({ id: tutor.userId }).first();
      return {
        ...tutor,
        user: user
          ? {
              id: user.id,
              name: user.name,
              username: user.username,
            }
          : null,
      };
    })
  );

  return {
    tutors: populatedTutors,
    pagination: {
      total,
      page,
      limit,
      totalPages,
    },
  };
};

// Public Discovery: Single tutor profile with availability and reviews
export const getPublicTutorById = async (tutorId: number) => {
  const tutor = await db.orm.public.TutorProfile
    .where({ id: tutorId })
    .first();

  if (!tutor) {
    throw new ApiError(404, "Tutor profile not found");
  }

  const user = await db.orm.public.User.where({ id: tutor.userId }).first();
  const availability = await db.orm.public.TutorAvailability
    .where({ tutorProfileId: tutor.id, isAvailable: true })
    .all();

  let reviews: any[] = [];
  try {
    reviews = await db.orm.public.Review
      .where({ tutorId: tutor.id })
      .all();
  } catch {
    reviews = [];
  }

  return {
    ...tutor,
    user: user
      ? {
          id: user.id,
          name: user.name,
          username: user.username,
        }
      : null,
    availability,
    reviews,
  };
};

// Public Discovery: Get tutor availability
export const getPublicTutorAvailability = async (tutorId: number) => {
  const tutor = await db.orm.public.TutorProfile
    .where({ id: tutorId })
    .first();

  if (!tutor) {
    throw new ApiError(404, "Tutor profile not found");
  }

  return db.orm.public.TutorAvailability
    .where({ tutorProfileId: tutor.id, isAvailable: true })
    .all();
};

// Tutor earnings & payouts (Section 3.3)
export const getTutorPayouts = async (tutorUserId: number) => {
  const tutor = await db.orm.public.TutorProfile
    .where({ userId: tutorUserId })
    .first();

  if (!tutor) {
    throw new ApiError(404, "Tutor profile not found");
  }

  let payouts: any[] = [];
  try {
    payouts = await db.orm.public.TutorPayout
      .where({ tutorProfileId: tutor.id })
      .all();
  } catch {
    payouts = [];
  }

  const totalEarned = payouts
    .filter((p: any) => p.status === "PAID")
    .reduce((sum: number, p: any) => sum + Number(p.netAmount), 0);

  const pendingPayout = payouts
    .filter((p: any) => p.status === "PENDING" || p.status === "APPROVED")
    .reduce((sum: number, p: any) => sum + Number(p.netAmount), 0);

  return {
    summary: {
      totalEarned: totalEarned.toFixed(2),
      pendingPayout: pendingPayout.toFixed(2),
      payoutMethod: tutor.payoutMethod,
      accountNumber: tutor.accountNumber,
    },
    payouts,
  };
};
