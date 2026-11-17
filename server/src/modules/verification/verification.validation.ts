import { z } from "zod";

export const submitVerificationSchema = z.object({
  documentType: z.enum([
    "NID",
    "STUDENT_ID",
    "ACADEMIC_CERTIFICATE",
    "ADMISSION_RECEIPT",
    "OTHER",
  ]),
  fileObjectKey: z.string().trim().min(3).max(1024),
});

export type SubmitVerificationInput = z.infer<typeof submitVerificationSchema>;

export const reviewVerificationSchema = z.object({
  status: z.enum(["APPROVED", "REJECTED", "RESUBMISSION_REQUIRED"]),
  adminNote: z.string().trim().max(1000).optional(),
});

export type ReviewVerificationInput = z.infer<typeof reviewVerificationSchema>;

export const verificationIdParamSchema = z.object({
  id: z.coerce.number().int().positive(),
});
