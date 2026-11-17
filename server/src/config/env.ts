
import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
  PORT: z.coerce.number().int().min(1).max(65535).default(5000),

  DATABASE_URL: z.string().min(1),

  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),

  CLIENT_URL: z.string().url().default("http://localhost:3000"),

  JWT_ACCESS_SECRET: z.string().min(64),

  ACCESS_TOKEN_EXPIRES_IN: z.string().default("15m"),

  REFRESH_TOKEN_TTL_DAYS: z.coerce.number().int().positive().default(30),

  // SSLCOMMERZ configuration
  SSLCOMMERZ_STORE_ID: z.string().min(1),

  SSLCOMMERZ_STORE_PASSWORD: z.string().min(1),

  SSLCOMMERZ_IS_SANDBOX: z
    .enum(["true", "false"])
    .default("true")
    .transform((value) => value === "true"),

  // Public backend URL for payment callbacks
  API_BASE_URL: z.string().url(),

  // Telegram Bot integration
  TELEGRAM_BOT_TOKEN: z.string().optional(),
  TELEGRAM_BOT_USERNAME: z.string().optional(),

  // Live class room secret
  LIVE_CLASS_SECRET: z.string().default("tutorlink-live-class-secret-key-32chars"),
});

const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
  console.error("Invalid environment configuration:");
  console.error(parsedEnv.error.flatten().fieldErrors);

  throw new Error("Environment validation failed");
}

export const env = parsedEnv.data;
