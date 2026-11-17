import { db } from "../../prisma/db";
import { ApiError } from "../../utils/ApiError";

export const createNotification = async (
  userId: number,
  type: "BOOKING_UPDATE" | "PAYMENT_UPDATE" | "VERIFICATION_UPDATE" | "SYSTEM",
  title: string,
  message: string
) => {
  try {
    return await db.orm.public.Notification.create({
      userId,
      type,
      title,
      message,
      isRead: false,
    });
  } catch (err) {
    console.warn("Could not save notification to DB:", err);
    return null;
  }
};

export const getMyNotifications = async (userId: number) => {
  let notifications: any[] = [];
  try {
    notifications = await db.orm.public.Notification
      .where({ userId })
      .all();
  } catch {
    notifications = [];
  }

  return notifications.sort(
    (a: any, b: any) => b.createdAt.getTime() - a.createdAt.getTime()
  );
};

export const markNotificationAsRead = async (
  userId: number,
  notificationId: number
) => {
  const notification = await db.orm.public.Notification
    .where({ id: notificationId, userId })
    .first();

  if (!notification) {
    throw new ApiError(404, "Notification not found");
  }

  return db.orm.public.Notification
    .where({ id: notificationId })
    .update({
      isRead: true,
      readAt: new Date(),
    });
};

export const getUnreadCount = async (userId: number) => {
  let unread: any[] = [];
  try {
    unread = await db.orm.public.Notification
      .where({ userId, isRead: false })
      .all();
  } catch {
    unread = [];
  }

  return { unreadCount: unread.length };
};
