
import {
  getBangladeshDayOfWeek,
  getBangladeshMinutesOfDay,
  parseTimeToMinutes,
} from "../../utils/datetime";

interface AvailabilityWindow {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  isAvailable: boolean;
}

interface BookingSchedule {
  startAt: Date;
  endAt: Date;
}

export const isWithinTutorAvailability = (
  schedule: BookingSchedule,
  availability: AvailabilityWindow[]
): boolean => {
  const startDay = getBangladeshDayOfWeek(schedule.startAt);
  const endDay = getBangladeshDayOfWeek(schedule.endAt);

  // A booking must start and end on the same Bangladesh calendar day.
  if (startDay !== endDay) return false;

  const bookingStart = getBangladeshMinutesOfDay(schedule.startAt);
  const bookingEnd = getBangladeshMinutesOfDay(schedule.endAt);

  return availability.some((window) => {
    if (!window.isAvailable || window.dayOfWeek !== startDay) {
      return false;
    }

    const availableStart = parseTimeToMinutes(window.startTime);
    const availableEnd = parseTimeToMinutes(window.endTime);

    return (
      bookingStart >= availableStart &&
      bookingEnd <= availableEnd &&
      bookingEnd > bookingStart
    );
  });
};
