import bcrypt from "bcrypt";
import { db } from "./db";

const SALT_ROUNDS = 12;

export const seedDatabase = async () => {
  console.log("🌱 Starting TutorLink database seeding...");

  // 1. Seed Admin
  const adminEmail = "admin@tutorlink.com";
  let admin = await db.orm.public.User.where({ email: adminEmail }).first();

  if (!admin) {
    const passwordHash = await bcrypt.hash("Admin@123456", SALT_ROUNDS);
    admin = await db.orm.public.User.create({
      email: adminEmail,
      username: "admin",
      name: "TutorLink Administrator",
      phone: "01711111111",
      role: "ADMIN",
      passwordHash,
      isActive: true,
    });
    console.log("✔ Admin account created: admin@tutorlink.com (Admin@123456)");
  } else {
    console.log("ℹ Admin account already exists.");
  }

  // 2. Seed Verified Tutor
  const tutorEmail = "tutor@tutorlink.com";
  let tutorUser = await db.orm.public.User.where({ email: tutorEmail }).first();

  if (!tutorUser) {
    const passwordHash = await bcrypt.hash("Tutor@123456", SALT_ROUNDS);
    tutorUser = await db.orm.public.User.create({
      email: tutorEmail,
      username: "tanvir_ahmed",
      name: "Dr. Tanvir Ahmed",
      phone: "01722222222",
      role: "TUTOR",
      passwordHash,
      isActive: true,
    });

    const tutorProfile = await db.orm.public.TutorProfile.create({
      userId: tutorUser.id,
      qualification: "M.Sc in Applied Mathematics, BUET",
      institution: "Bangladesh University of Engineering and Technology (BUET)",
      department: "Mathematics",
      experienceYears: 6,
      bio: "Experienced mathematics and physics instructor specializing in Higher Secondary and University Admission coaching with over 6 years of proven success.",
      subjects: ["Mathematics", "Higher Mathematics", "Physics"],
      hourlyRate: "600.00",
      location: "Dhanmondi, Dhaka",
      accountNumber: "01722222222",
      payoutMethod: "BKASH",
      isVerified: true,
      averageRating: 4.9,
      totalReviews: 8,
    });

    // Seed weekly availability slots (Sun=0, Tue=2, Thu=4 from 16:00 to 20:00)
    await db.orm.public.TutorAvailability.create({
      tutorProfileId: tutorProfile.id,
      dayOfWeek: 0,
      startTime: "16:00",
      endTime: "20:00",
      isAvailable: true,
    });

    await db.orm.public.TutorAvailability.create({
      tutorProfileId: tutorProfile.id,
      dayOfWeek: 2,
      startTime: "16:00",
      endTime: "20:00",
      isAvailable: true,
    });

    await db.orm.public.TutorAvailability.create({
      tutorProfileId: tutorProfile.id,
      dayOfWeek: 4,
      startTime: "16:00",
      endTime: "20:00",
      isAvailable: true,
    });

    console.log("✔ Sample verified tutor created: tutor@tutorlink.com (Tutor@123456)");
  } else {
    console.log("ℹ Sample tutor already exists.");
  }

  // 3. Seed Student
  const studentEmail = "student@tutorlink.com";
  let studentUser = await db.orm.public.User.where({ email: studentEmail }).first();

  if (!studentUser) {
    const passwordHash = await bcrypt.hash("Student@123456", SALT_ROUNDS);
    studentUser = await db.orm.public.User.create({
      email: studentEmail,
      username: "nafis_rahman",
      name: "Nafis Rahman",
      phone: "01733333333",
      role: "STUDENT",
      passwordHash,
      isActive: true,
    });

    await db.orm.public.StudentProfile.create({
      userId: studentUser.id,
      institution: "Notre Dame College, Dhaka",
      department: "Science",
      educationLevel: "HSC 2nd Year",
      location: "Mirpur, Dhaka",
    });

    console.log("✔ Sample student created: student@tutorlink.com (Student@123456)");
  } else {
    console.log("ℹ Sample student already exists.");
  }

  console.log("🎉 Database seeding completed successfully!");
};

// Execute if run directly via tsx
seedDatabase()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("❌ Database seeding failed:", err);
    process.exit(1);
  });
