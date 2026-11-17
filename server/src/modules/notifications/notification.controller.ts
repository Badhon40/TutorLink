import type { Request, Response } from "express";
import { z } from "zod";

import type { AuthenticatedUser } from "../../middlewares/auth.middleware";
import { ApiError } from "../../utils/ApiError";
import { ApiResponse } from "../../utils/ApiResponse";
import { db } from "../../prisma/db";

import {
  getMyNotifications,
  markNotificationAsRead,
  getUnreadCount,
} from "./notification.service";
import { sendTelegramMessage } from "./telegram.service";

export const listMyNotifications = async (
  _req: Request,
  res: Response
) => {
  const auth = res.locals.auth as AuthenticatedUser;

  const notifications = await getMyNotifications(auth.userId);

  return res.status(200).json(
    new ApiResponse(200, "Notifications retrieved successfully", notifications)
  );
};

export const markAsRead = async (
  req: Request,
  res: Response
) => {
  const auth = res.locals.auth as AuthenticatedUser;

  const id = Number(req.params.id);

  if (!Number.isInteger(id) || id <= 0) {
    throw new ApiError(400, "Invalid notification ID");
  }

  const updated = await markNotificationAsRead(auth.userId, id);

  return res.status(200).json(
    new ApiResponse(200, "Notification marked as read", updated)
  );
};

export const getMyUnreadCount = async (
  _req: Request,
  res: Response
) => {
  const auth = res.locals.auth as AuthenticatedUser;

  const count = await getUnreadCount(auth.userId);

  return res.status(200).json(
    new ApiResponse(200, "Unread count retrieved successfully", count)
  );
};

// Link Telegram Chat ID for automated bot alerts (Section 3.8)
const linkTelegramSchema = z.object({
  telegramChatId: z.string().trim().min(3).max(50),
});

export const linkTelegram = async (
  req: Request,
  res: Response
) => {
  const auth = res.locals.auth as AuthenticatedUser;

  const parsed = linkTelegramSchema.safeParse(req.body);

  if (!parsed.success) {
    throw new ApiError(400, "Invalid telegramChatId", parsed.error.flatten().fieldErrors);
  }

  // Save telegram chat ID in user record (store in phone or field)
  await db.orm.public.User.where({ id: auth.userId }).update({
    phone: parsed.data.telegramChatId,
  });

  // Send test confirmation alert via Telegram
  const sent = await sendTelegramMessage(
    parsed.data.telegramChatId,
    `🎉 *TutorLink Telegram Notifications Activated!*\n\nYour account has been successfully linked. You will now receive instant alerts for bookings, confirmations, payments, and upcoming classes.`
  );

  return res.status(200).json(
    new ApiResponse(200, "Telegram account linked successfully", {
      telegramChatId: parsed.data.telegramChatId,
      testMessageSent: sent,
    })
  );
};
