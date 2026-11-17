import { db } from "../../prisma/db";
import { ApiError } from "../../utils/ApiError";

// Platform overview analytics (Section 3.11)
export const getPlatformAnalytics = async () => {
  const users = await db.orm.public.User.all();
  const bookings = await db.orm.public.Booking.all();
  const tutors = await db.orm.public.TutorProfile.all();

  let verifications: any[] = [];
  try {
    verifications = await db.orm.public.VerificationRequest.all();
  } catch {
    verifications = [];
  }

  let payouts: any[] = [];
  try {
    payouts = await db.orm.public.TutorPayout.all();
  } catch {
    payouts = [];
  }

  const totalUsers = users.length;
  const totalStudents = users.filter((u) => u.role === "STUDENT").length;
  const totalTutors = users.filter((u) => u.role === "TUTOR").length;
  const verifiedTutors = tutors.filter((t) => t.isVerified).length;

  const totalBookings = bookings.length;
  const completedBookings = bookings.filter((b) => b.status === "COMPLETED").length;

  const gmv = bookings
    .filter((b) => b.status === "COMPLETED" || b.status === "CONFIRMED")
    .reduce((sum, b) => sum + Number(b.totalAmount), 0);

  // 10% platform commission calculation
  const totalPlatformCommission = Number((gmv * 0.10).toFixed(2));

  const pendingVerifications = verifications.filter((v: any) => v.status === "PENDING").length;
  const pendingPayouts = payouts.filter((p: any) => p.status === "PENDING").length;

  return {
    users: {
      total: totalUsers,
      students: totalStudents,
      tutors: totalTutors,
      verifiedTutors,
    },
    bookings: {
      total: totalBookings,
      completed: completedBookings,
    },
    financials: {
      currency: "BDT",
      gmv: gmv.toFixed(2),
      commissionRate: "10%",
      platformRevenue: totalPlatformCommission.toFixed(2),
    },
    actionItems: {
      pendingVerifications,
      pendingPayouts,
    },
  };
};

// List all platform users with role and status filtering
export const listPlatformUsers = async (role?: string, isActive?: boolean) => {
  let users = await db.orm.public.User.all();

  if (role) {
    users = users.filter((u) => u.role === role);
  }

  if (typeof isActive === "boolean") {
    users = users.filter((u) => u.isActive === isActive);
  }

  return users.map((u) => ({
    id: u.id,
    name: u.name,
    email: u.email,
    username: u.username,
    phone: u.phone,
    role: u.role,
    isActive: u.isActive,
    createdAt: u.createdAt,
  }));
};

// Update user active status (activate/deactivate)
export const updateUserStatus = async (
  userId: number,
  isActive: boolean
) => {
  const user = await db.orm.public.User.where({ id: userId }).first();

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  return db.orm.public.User.where({ id: userId }).update({ isActive });
};

// List pending payouts for review
export const listPlatformPayouts = async (status?: string) => {
  let payouts: any[] = [];
  try {
    payouts = await db.orm.public.TutorPayout.all();
  } catch {
    payouts = [];
  }

  if (status) {
    payouts = payouts.filter((p: any) => p.status === status);
  }

  return Promise.all(
    payouts.map(async (p: any) => {
      const tutor = await db.orm.public.TutorProfile.where({ id: p.tutorProfileId }).first();
      const user = tutor ? await db.orm.public.User.where({ id: tutor.userId }).first() : null;

      return {
        ...p,
        tutorName: user?.name ?? "Tutor",
        tutorEmail: user?.email,
      };
    })
  );
};

// Disburse / complete payout with MFS transaction reference (bKash/Nagad/Rocket)
export const disbursePayout = async (
  adminUserId: number,
  payoutId: number,
  transferReference: string,
  adminNote?: string
) => {
  const payout = await db.orm.public.TutorPayout.where({ id: payoutId }).first();

  if (!payout) {
    throw new ApiError(404, "Payout record not found");
  }

  if (payout.status === "PAID") {
    throw new ApiError(400, "This payout has already been disbursed");
  }

  return db.orm.public.TutorPayout.where({ id: payoutId }).update({
    status: "PAID",
    transferReference,
    adminNote: adminNote ?? null,
    paidById: adminUserId,
    paidAt: new Date(),
  });
};
