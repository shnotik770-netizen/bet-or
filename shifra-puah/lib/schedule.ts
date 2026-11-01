import type { Weekday, Yoledet, Institution } from "@prisma/client";
import { db } from "./db";
import { toDate, toISO, weekDays, addDays } from "./dates";

export type Stop = Yoledet & { institution: Pick<Institution, "name">; dayNumber: number; totalDays: number };
export type ScheduleDay = { iso: string; weekday: Weekday; stops: Stop[] };

const collator = new Intl.Collator("he", { numeric: true });

/** כמה ימי הגעה יש בתקופה, ומה מספר היום הנוכחי מתוכם */
function visitCounts(y: Yoledet, iso: string) {
  const start = toISO(y.serviceStartDate);
  const end = toISO(y.serviceEndDate);
  let total = 0;
  let current = 0;
  const allowed = new Set(y.serviceDays);
  for (let d = start; d <= end; d = addDays(d, 1)) {
    const wd = (["SUNDAY", "MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY"] as Weekday[])[toDate(d).getUTCDay()];
    if (wd && allowed.has(wd)) {
      total++;
      if (d <= iso) current = total;
    }
  }
  return { dayNumber: current, totalDays: total };
}

/** סידור המתנדבות לשבוע שמתחיל ביום ראשון sundayIso: לכל יום – הכתובות, ממוינות לפי רחוב */
export async function weekSchedule(sundayIso: string): Promise<ScheduleDay[]> {
  const days = weekDays(sundayIso);
  const first = days[0].iso;
  const last = days[days.length - 1].iso;

  const yoldot = await db.yoledet.findMany({
    where: {
      serviceStartDate: { lte: toDate(last) },
      serviceEndDate: { gte: toDate(first) },
    },
    include: { institution: { select: { name: true } } },
  });

  return days.map(({ iso, weekday }) => {
    const stops = yoldot
      .filter(
        (y) => toISO(y.serviceStartDate) <= iso && toISO(y.serviceEndDate) >= iso && y.serviceDays.includes(weekday),
      )
      .map((y) => ({ ...y, ...visitCounts(y, iso) }))
      .sort(
        (a, b) =>
          collator.compare(a.city, b.city) ||
          collator.compare(a.street, b.street) ||
          collator.compare(a.houseNumber, b.houseNumber),
      );
    return { iso, weekday, stops };
  });
}
