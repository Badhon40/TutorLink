
import { z } from "zod";

export const createBookingSchema = z
  .object({
    tutorId: z.number().int().positive(),

    startAt: z.coerce.date(),

    durationMin: z
      .number()
      .int()
      .min(30)
      .max(480),

    studentMessage: z
      .string()
      .trim()
      .max(1000)
      .nullable()
      .optional(),
  })
  .strict()
  .refine(
    (data) => data.startAt.getTime() > Date.now(),
    {
      message: "Booking must be scheduled in the future",
      path: ["startAt"],
    }
  );

export const bookingIdSchema = z.object({
  bookingId: z.coerce.number().int().positive(),
});

export const bookingListQuerySchema = z.object({
  status: z
    .enum([
      "PENDING",
      "CONFIRMED",
      "COMPLETED",
      "CANCELLED",
      "REJECTED",
    ])
    .optional(),

  page: z.coerce.number().int().positive().default(1),

  limit: z.coerce.number().int().min(1).max(50).default(10),
});

export const bookingDecisionSchema = z
  .object({
    decision: z.enum(["CONFIRMED", "REJECTED"]),
    tutorMessage: z.string().trim().max(1000).nullable().optional(),
  })
  .strict();

export const cancelBookingSchema = z
  .object({
    cancellationReason: z.string().trim().min(3).max(500),
  })
  .strict();

export type CreateBookingInput = z.infer<typeof createBookingSchema>;
export type BookingIdInput = z.infer<typeof bookingIdSchema>;
export type BookingListQueryInput = z.infer<typeof bookingListQuerySchema>;
export type BookingDecisionInput = z.infer<typeof bookingDecisionSchema>;
export type CancelBookingInput = z.infer<typeof cancelBookingSchema>;