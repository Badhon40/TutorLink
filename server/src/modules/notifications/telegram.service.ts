import { env } from "../../config/env";

export const sendTelegramMessage = async (
  chatId: string | number,
  text: string
): Promise<boolean> => {
  if (!env.TELEGRAM_BOT_TOKEN) {
    console.log(`[Telegram Mock to ${chatId}]:\n${text}\n`);
    return true;
  }

  const endpoint = `https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`;

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: "Markdown",
      }),
      signal: AbortSignal.timeout(10000),
    });

    return response.ok;
  } catch (error) {
    console.error(`Failed to send Telegram message to ${chatId}:`, error);
    return false;
  }
};

// Dispatch booking creation notification to tutor
export const notifyBookingRequested = async (
  tutorChatId: string | number | null | undefined,
  details: {
    bookingId: number;
    studentName: string;
    startAt: Date;
    durationMin: number;
    amount: string;
  }
) => {
  if (!tutorChatId) return;

  const message = `🔔 *New Booking Request on TutorLink!*
━━━━━━━━━━━━━━━━━━
• *Booking ID:* #${details.bookingId}
• *Student:* ${details.studentName}
• *Scheduled Time:* ${details.startAt.toLocaleString("en-GB", { timeZone: "Asia/Dhaka" })}
• *Duration:* ${details.durationMin} minutes
• *Total Fee:* ৳${details.amount}

Please log in to your TutorLink portal to confirm or reject this request.`;

  await sendTelegramMessage(tutorChatId, message);
};

// Dispatch booking decision notification to student
export const notifyBookingDecision = async (
  studentChatId: string | number | null | undefined,
  details: {
    bookingId: number;
    tutorName: string;
    decision: "CONFIRMED" | "REJECTED";
    tutorMessage?: string | null;
  }
) => {
  if (!studentChatId) return;

  const isConfirmed = details.decision === "CONFIRMED";
  const icon = isConfirmed ? "✅" : "❌";

  const message = `${icon} *Booking Request ${details.decision}!*
━━━━━━━━━━━━━━━━━━
• *Booking ID:* #${details.bookingId}
• *Tutor:* ${details.tutorName}
• *Status:* ${details.decision}
${details.tutorMessage ? `• *Tutor Note:* _"${details.tutorMessage}"_\n` : ""}
${
  isConfirmed
    ? "Please proceed to the payment page on TutorLink to complete your booking."
    : "You may explore other available tutors on TutorLink."
}`;

  await sendTelegramMessage(studentChatId, message);
};

// Dispatch live class join link to both student and tutor
export const notifyLiveClassLink = async (
  chatId: string | number | null | undefined,
  details: {
    bookingId: number;
    role: "student" | "tutor";
    otherPartyName: string;
    scheduledStartAt: Date;
    durationMin: number;
    joinUrl: string;
  }
) => {
  if (!chatId) return;

  const roleLabel = details.role === "student" ? "🎓 Student" : "📚 Tutor";
  const otherLabel = details.role === "student" ? "Tutor" : "Student";

  const message = `🎥 *Your Live Class is Confirmed!*
━━━━━━━━━━━━━━━━━━
• *Booking ID:* #${details.bookingId}
• *Role:* ${roleLabel}
• *${otherLabel}:* ${details.otherPartyName}
• *Scheduled Time:* ${details.scheduledStartAt.toLocaleString("en-GB", { timeZone: "Asia/Dhaka" })}
• *Duration:* ${details.durationMin} minutes

🔗 *Your Join Link:*
${details.joinUrl}

_The room opens 10 minutes before your session. Use the link above to join directly._`;

  await sendTelegramMessage(chatId, message);
};

// Dispatch payment success notification
export const notifyPaymentSuccess = async (
  chatId: string | number | null | undefined,
  details: {
    bookingId: number;
    amount: string;
    transactionId: string;
  }
) => {
  if (!chatId) return;

  const message = `💳 *Payment Succeeded!*
━━━━━━━━━━━━━━━━━━
• *Booking ID:* #${details.bookingId}
• *Amount Paid:* ৳${details.amount} BDT
• *Transaction ID:* \`${details.transactionId}\`

Your tutoring session is officially confirmed. Get ready for your live class!`;

  await sendTelegramMessage(chatId, message);
};
