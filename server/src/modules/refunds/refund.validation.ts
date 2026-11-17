import { z } from "zod";

export const requestRefundSchema = z.object({
  paymentId: z.number().int().positive(),
  reason: z.string().trim().min(5).max(500),
});

export type RequestRefundInput = z.infer<typeof requestRefundSchema>;

export const processRefundSchema = z.object({
  status: z.enum(["SUCCEEDED", "FAILED"]),
  providerRefundId: z.string().trim().max(100).optional(),
});

export type ProcessRefundInput = z.infer<typeof processRefundSchema>;

export const refundIdParamSchema = z.object({
  id: z.coerce.number().int().positive(),
});
