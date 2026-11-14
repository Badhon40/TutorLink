
import { z } from "zod";

export const availabilitySchema = z
  .object({
    dayOfWeek: z.number().int().min(0).max(6),

    startTime: z
      .string()
      .regex(/^([01]\d|2[0-3]):[0-5]\d$/),

    endTime: z
      .string()
      .regex(/^([01]\d|2[0-3]):[0-5]\d$/),

    isAvailable: z.boolean().default(true),
  })
  .strict()
  .refine(
    (data) => data.startTime < data.endTime,
    {
      message: "End time must be later than start time",
      path: ["endTime"],
    }
  );

export const availabilityIdSchema = z.object({
  availabilityId: z.coerce.number().int().positive(),
});

export type AvailabilityInput = z.infer<typeof availabilitySchema>;
