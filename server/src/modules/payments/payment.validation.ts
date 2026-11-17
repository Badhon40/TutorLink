
import { z } from "zod";

export const createPaymentSchema = z.object({
  bookingId: z.number().int().positive(),

  idempotencyKey: z.string().trim().min(10).max(100),

  // Checkout contact and address information
  phone: z.string().trim().min(7).max(20).optional(),

  address: z.string().trim().min(3).max(200),

  city: z.string().trim().min(2).max(100),

  postcode: z.string().trim().min(3).max(15),
});

export type CreatePaymentInput = z.infer<
  typeof createPaymentSchema
>;
