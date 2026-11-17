import { db } from "../../prisma/db";
import { ApiError } from "../../utils/ApiError";

export const getRecommendedTutorsForStudent = async (studentUserId: number) => {
  const student = await db.orm.public.StudentProfile
    .where({ userId: studentUserId })
    .first();

  if (!student) {
    throw new ApiError(404, "Student profile not found");
  }

  // Get past bookings to infer preferred subjects or tutors
  let pastBookings: any[] = [];
  try {
    pastBookings = await db.orm.public.Booking
      .where({ studentId: student.id })
      .all();
  } catch {
    pastBookings = [];
  }

  const pastTutorIds = new Set(pastBookings.map((b: any) => b.tutorId));

  // Get active tutors
  const tutors = await db.orm.public.TutorProfile.all();

  // Score each tutor according to heuristic algorithm (Section 3.4)
  const scoredTutors = await Promise.all(
    tutors.map(async (tutor) => {
      let score = 0;
      const reasons: string[] = [];

      // Rating score: up to 30 points
      if (tutor.averageRating > 0) {
        score += tutor.averageRating * 6;
        if (tutor.averageRating >= 4.5) {
          reasons.push("Top-rated tutor");
        }
      }

      // Verified status: +15 points
      if (tutor.isVerified) {
        score += 15;
        reasons.push("Verified credentials");
      }

      // Experience: up to 15 points
      if (tutor.experienceYears > 0) {
        const expScore = Math.min(15, tutor.experienceYears * 3);
        score += expScore;
        if (tutor.experienceYears >= 3) {
          reasons.push(`${tutor.experienceYears}+ years experience`);
        }
      }

      // Location proximity match: +20 points
      if (
        student.location &&
        tutor.location &&
        student.location.toLowerCase().includes(tutor.location.toLowerCase())
      ) {
        score += 20;
        reasons.push(`Nearby in ${tutor.location}`);
      }

      // Previous booking affinity: +10 points
      if (pastTutorIds.has(tutor.id)) {
        score += 10;
        reasons.push("Previously booked");
      }

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
        recommendationScore: Math.round(score),
        matchReasons: reasons,
      };
    })
  );

  // Sort descending by recommendation score
  return scoredTutors
    .sort((a, b) => b.recommendationScore - a.recommendationScore)
    .slice(0, 10);
};
