import { db } from "../../prisma/db";
import { ApiError } from "../../utils/ApiError";
import type { CreateReviewInput } from "./review.validation";

// Create review for a completed booking
export const createReview = async (
  studentUserId: number,
  input: CreateReviewInput
) => {
  // Find student profile
  const student = await db.orm.public.StudentProfile
    .where({ userId: studentUserId })
    .first();

  if (!student) {
    throw new ApiError(404, "Student profile not found");
  }

  // Find booking
  const booking = await db.orm.public.Booking
    .where({ id: input.bookingId })
    .first();

  if (!booking) {
    throw new ApiError(404, "Booking not found");
  }

  // Verify ownership
  if (booking.studentId !== student.id) {
    throw new ApiError(403, "You can only review your own bookings");
  }

  // Only COMPLETED bookings can be reviewed
  if (booking.status !== "COMPLETED") {
    throw new ApiError(400, "Only completed tutoring sessions can be reviewed");
  }

  // Check if already reviewed
  const existingReview = await db.orm.public.Review
    .where({ bookingId: booking.id })
    .first()
    .catch(() => null);

  if (existingReview) {
    throw new ApiError(409, "A review for this session has already been submitted");
  }

  // Create review
  const review = await db.orm.public.Review.create({
    bookingId: booking.id,
    tutorId: booking.tutorId,
    studentId: student.id,
    rating: input.rating,
    comment: input.comment ?? null,
  });

  // Recalculate tutor rating & review counts
  try {
    const allReviews = await db.orm.public.Review
      .where({ tutorId: booking.tutorId })
      .all();

    const totalReviews = allReviews.length;
    const averageRating =
      totalReviews > 0
        ? Number(
            (
              allReviews.reduce((sum, r) => sum + r.rating, 0) / totalReviews
            ).toFixed(2)
          )
        : 0;

    await db.orm.public.TutorProfile
      .where({ id: booking.tutorId })
      .update({
        averageRating,
        totalReviews,
      });
  } catch (err) {
    console.warn("Could not update tutor averageRating:", err);
  }

  return review;
};

// Get reviews for a tutor
export const getReviewsForTutor = async (tutorId: number) => {
  const reviews = await db.orm.public.Review
    .where({ tutorId })
    .all();

  return Promise.all(
    reviews.map(async (review) => {
      const student = await db.orm.public.StudentProfile
        .where({ id: review.studentId })
        .first();

      const user = student
        ? await db.orm.public.User.where({ id: student.userId }).first()
        : null;

      return {
        ...review,
        student: {
          name: user ? user.name : "Student",
          institution: student?.institution,
        },
      };
    })
  );
};
