
const BANGLADESH_TIMEZONE = "Asia/Dhaka";

const dateFormatter = new Intl.DateTimeFormat("en-GB", {
  timeZone: BANGLADESH_TIMEZONE,
  weekday: "short",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hourCycle: "h23",
});

export const getBangladeshDateParts = (date: Date) => {
  const parts = dateFormatter.formatToParts(date);

  const values = Object.fromEntries(
    parts.map((part) => [part.type, part.value])
  );

  return {
    year: Number(values.year),
    month: Number(values.month),
    day: Number(values.day),
    weekday: values.weekday,
    hour: Number(values.hour),
    minute: Number(values.minute),
    second: Number(values.second),
  };
};

export const getBangladeshDayOfWeek = (date: Date): number => {
  const weekday = getBangladeshDateParts(date).weekday;

  const days: Record<string, number> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  };

  return days[weekday];
};

export const getBangladeshMinutesOfDay = (date: Date): number => {
  const parts = getBangladeshDateParts(date);

  return parts.hour * 60 + parts.minute;
};

export const parseTimeToMinutes = (time: string): number => {
  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(time);

  if (!match) {
    throw new Error(`Invalid time format: ${time}. Expected HH:mm`);
  }

  return Number(match[1]) * 60 + Number(match[2]);
};
