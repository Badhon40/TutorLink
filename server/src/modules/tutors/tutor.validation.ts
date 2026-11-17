import { z } from "zod";

export const tutorProfileSchema = z
  .object({
    qualification: z.string().trim().max(200).nullable().optional(),

    institution: z.string().trim().max(150).nullable().optional(),

    department: z.string().trim().max(150).nullable().optional(),

    experienceYears: z.number().int().min(0).max(60).optional(),

    bio: z.string().trim().max(2000).nullable().optional(),

    subjects: z
      .array(z.string().trim().min(1).max(100))
      .max(30)
      .optional(),

    hourlyRate: z.number().positive().max(100000).optional(),

    location: z.string().trim().max(200).nullable().optional(),

    profileImage: z.string().trim().max(2048).nullable().optional(),

    accountNumber: z.string().trim().max(50).nullable().optional(),

    payoutMethod: z.enum(["BKASH", "NAGAD", "ROCKET"]).optional(),
  })
  .strict()
  .refine(
    (data) => Object.keys(data).length > 0,
    "At least one profile field must be provided"
  );

export type TutorProfileInput = z.infer<typeof tutorProfileSchema>;

export const tutorQuerySchema = z.object({
  search: z.string().trim().optional(),
  subject: z.string().trim().optional(),
  location: z.string().trim().optional(),
  minRate: z.coerce.number().min(0).optional(),
  maxRate: z.coerce.number().positive().optional(),
  minRating: z.coerce.number().min(0).max(5).optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(50).default(10),
});

export type TutorQueryInput = z.infer<typeof tutorQuerySchema>;

export const tutorIdParamSchema = z.object({
  tutorId: z.coerce.number().int().positive(),
});
