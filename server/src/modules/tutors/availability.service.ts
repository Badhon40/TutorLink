
import { db } from "../../prisma/db";
import { ApiError } from "../../utils/ApiError";
import type { AvailabilityInput } from "./availability.validation";

// Create a tutor availability window.
export const createAvailability = async (
  userId: number,
  input: AvailabilityInput
) => {
  // Find the authenticated tutor's profile.
  const tutor = await db.orm.public.TutorProfile
    .where({ userId })
    .first();

  if (!tutor) {
    throw new ApiError(404, "Tutor profile not found");
  }

  // Retrieve existing availability windows.
  const existingSlots = await db.orm.public.TutorAvailability
    .where({ tutorProfileId: tutor.id })
    .all();

  // Prevent overlapping active availability windows.
  if (input.isAvailable) {
    const newStart = input.startTime;
    const newEnd = input.endTime;

    const hasOverlap = existingSlots.some((slot) => {
      if (
        !slot.isAvailable ||
        slot.dayOfWeek !== input.dayOfWeek
      ) {
        return false;
      }

      return (
        newStart < slot.endTime &&
        newEnd > slot.startTime
      );
    });

    if (hasOverlap) {
      throw new ApiError(
        409,
        "This availability window overlaps an existing schedule"
      );
    }
  }

  return await db.orm.public.TutorAvailability.create({
    tutorProfileId: tutor.id,
    dayOfWeek: input.dayOfWeek,
    startTime: input.startTime,
    endTime: input.endTime,
    isAvailable: input.isAvailable,
  });
};

// Retrieve the authenticated tutor's availability.
export const getMyAvailability = async (userId: number) => {
  const tutor = await db.orm.public.TutorProfile
    .where({ userId })
    .first();

  if (!tutor) {
    throw new ApiError(404, "Tutor profile not found");
  }

  const availability = await db.orm.public.TutorAvailability
    .where({ tutorProfileId: tutor.id })
    .all();

  return availability.sort((a, b) => {
    if (a.dayOfWeek !== b.dayOfWeek) {
      return a.dayOfWeek - b.dayOfWeek;
    }

    return a.startTime.localeCompare(b.startTime);
  });
};



export const updateAvailability = async (
  userId: number,
  availabilityId: number,
  input: AvailabilityInput
) => {
  const tutor = await db.orm.public.TutorProfile
    .where({ userId })
    .first();

  if (!tutor) {
    throw new ApiError(404, "Tutor profile not found");
  }

  const existingSlot = await db.orm.public.TutorAvailability
    .where({
      id: availabilityId,
      tutorProfileId: tutor.id,
    })
    .first();

  if (!existingSlot) {
    throw new ApiError(404, "Availability slot not found");
  }

  const allSlots = await db.orm.public.TutorAvailability
    .where({ tutorProfileId: tutor.id })
    .all();

  if (input.isAvailable) {
    const hasOverlap = allSlots.some((slot) => {
      if (
        slot.id === availabilityId ||
        !slot.isAvailable ||
        slot.dayOfWeek !== input.dayOfWeek
      ) {
        return false;
      }

      return (
        input.startTime < slot.endTime &&
        input.endTime > slot.startTime
      );
    });

    if (hasOverlap) {
      throw new ApiError(
        409,
        "This availability window overlaps another schedule"
      );
    }
  }

  return await db.orm.public.TutorAvailability
    .where({
      id: availabilityId,
      tutorProfileId: tutor.id,
    })
    .update({
      dayOfWeek: input.dayOfWeek,
      startTime: input.startTime,
      endTime: input.endTime,
      isAvailable: input.isAvailable,
    });
};



export const deleteAvailability = async (
  userId: number,
  availabilityId: number
) => {
  const tutor = await db.orm.public.TutorProfile
    .where({ userId })
    .first();

  if (!tutor) {
    throw new ApiError(404, "Tutor profile not found");
  }

  const existingSlot = await db.orm.public.TutorAvailability
    .where({
      id: availabilityId,
      tutorProfileId: tutor.id,
    })
    .first();

  if (!existingSlot) {
    throw new ApiError(404, "Availability slot not found");
  }

  await db.orm.public.TutorAvailability
    .where({
      id: availabilityId,
      tutorProfileId: tutor.id,
    })
    .delete();

  return { availabilityId };
};
