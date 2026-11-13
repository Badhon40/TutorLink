
import { z } from "zod";

// ==========================================
// REGISTER VALIDATION
// ==========================================

export const registerSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(2, "Name must contain at least 2 characters")
      .max(100, "Name cannot exceed 100 characters"),

    email: z
      .string()
      .trim()
      .email("Please provide a valid email address")
      .max(254)
      .transform((value) => value.toLowerCase()),

    username: z
      .string()
      .trim()
      .min(3, "Username must contain at least 3 characters")
      .max(30, "Username cannot exceed 30 characters")
      .regex(
        /^[a-zA-Z0-9_]+$/,
        "Username can only contain letters, numbers and underscores"
      )
      .transform((value) => value.toLowerCase())
      .optional(),

    password: z
      .string()
      .min(8, "Password must contain at least 8 characters")
      .max(72, "Password cannot exceed 72 characters"),

    phone: z
      .string()
      .trim()
      .min(7, "Phone number is too short")
      .max(20, "Phone number is too long")
      .optional(),

    // Public registration supports Student and Tutor only.
    role: z.enum(["STUDENT", "TUTOR"]).default("STUDENT"),
  })
  .strict();

// ==========================================
// LOGIN VALIDATION
// ==========================================

export const loginSchema = z
  .object({
    identifier: z
      .string()
      .trim()
      .min(1, "Email or username is required"),

    password: z
  .string()
  .min(8, "Password must contain at least 8 characters")
  .max(72, "Password cannot exceed 72 characters")
  .refine(
    (value) => new TextEncoder().encode(value).length <= 72,
    "Password cannot exceed 72 UTF-8 bytes"
  ),
  })
  .strict();

// ==========================================
// TYPES
// ==========================================

export type RegisterInput = z.infer<typeof registerSchema>;

export type LoginInput = z.infer<typeof loginSchema>;
