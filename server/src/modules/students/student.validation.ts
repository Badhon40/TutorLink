
import { z } from "zod";

export const studentProfileSchema = z
  .object({
    institution: z.string().trim().max(150).nullable().optional(),

    department: z.string().trim().max(150).nullable().optional(),

    educationLevel: z.string().trim().max(100).nullable().optional(),

    location: z.string().trim().max(200).nullable().optional(),

    profileImage: z.string().trim().max(2048).nullable().optional(),
  })
  .strict()
  .refine(
    (data) => Object.keys(data).length > 0,
    "At least one profile field must be provided"
  );

export type StudentProfileInput = z.infer<
  typeof studentProfileSchema
>;
