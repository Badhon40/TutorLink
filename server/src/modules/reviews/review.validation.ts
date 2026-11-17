import { z } from "zod";

export const createReviewSchema = z.object({
  bookingId: z.number().int().positive(),
  rating: z.number().int().min(1).max(5),
  comment: z.string().trim().max(1000).optional(),
});

export type CreateReviewInput = z.infer<typeof createReviewSchema>;

export const tutorReviewParamSchema = z.object({
  tutorId: z.coerce.number().int().positive(),
});
