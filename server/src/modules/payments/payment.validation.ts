
import { z } from "zod";

export const createPaymentSchema = z.object({
  bookingId: z.number().int().positive(),
  idempotencyKey: z.string().trim().min(10).max(100),
});

export type CreatePaymentInput = z.infer<
  typeof createPaymentSchema
>;
