import { Router } from "express";

import {
  authenticate,
} from "../../middlewares/auth.middleware";

import { catchAsync } from "../../utils/catchAsync";

import {
  listMyNotifications,
  markAsRead,
  getMyUnreadCount,
  linkTelegram,
} from "./notification.controller";

const router = Router();

router.use(authenticate);

// View user's notifications
router.get("/", catchAsync(listMyNotifications));

// Get unread badge count
router.get("/unread-count", catchAsync(getMyUnreadCount));

// Mark notification as read
router.patch("/:id/read", catchAsync(markAsRead));

// Link Telegram Bot Account for automated alerts (Section 3.8)
router.post("/telegram/link", catchAsync(linkTelegram));

export default router;
