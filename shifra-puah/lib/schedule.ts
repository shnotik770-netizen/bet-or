import type { Yoledet } from "@prisma/client";
import type { Weekday } from "./labels";
import { db } from "./db";
import { toDate, toISO, weekDays } from "./dates";

export type Stop = Yoledet & {
  visitId: number;
  visitNote: string | null;
  institutions: { name: string }[];
  /** מספר ההגעה מתוך כל השיבוצים של היולדת */
  visitNumber: number;
  totalVisits: number;
};
export type ScheduleDay = { iso: string; weekday: Weekday; stops: Stop[] };

const collator = new Intl.Collator("he", { numeric: true });

/** סדר היום של המתנדבות לשבוע שמתחיל ביום ראשון: לכל יום – הכתובות, ממוינות לפי רחוב */
export async function weekSchedule(sundayIso: string): Promise<ScheduleDay[]> {
  const days = weekDays(sundayIso);
  const visits = await db.visit.findMany({
    where: { date: { gte: toDate(days[0].iso), lte: toDate(days[days.length - 1].iso) } },
    include: { yoledet: { include: { institutions: { select: { name: true } } } } },
  });

  // כל תאריכי השיבוץ של היולדות האלה, בשביל "הגעה 3 מתוך 6"
  const ids = [...new Set(visits.map((v) => v.yoledetId))];
  const all = await db.visit.findMany({ where: { yoledetId: { in: ids } }, select: { yoledetId: true, date: true }, orderBy: { date: "asc" } });
  const datesBy = new Map<number, string[]>();
  for (const v of all) datesBy.set(v.yoledetId, [...(datesBy.get(v.yoledetId) ?? []), toISO(v.date)]);

  return days.map(({ iso, weekday }) => {
    const stops = visits
      .filter((v) => toISO(v.date) === iso)
      .map((v) => {
        const dates = datesBy.get(v.yoledetId) ?? [];
        return {
          ...v.yoledet,
          visitId: v.id,
          visitNote: v.note,
          visitNumber: dates.indexOf(iso) + 1,
          totalVisits: dates.length,
        };
      })
      .sort(
        (a, b) =>
          Number(!a.street) - Number(!b.street) ||
          collator.compare(a.city ?? "", b.city ?? "") ||
          collator.compare(a.street ?? "", b.street ?? "") ||
          collator.compare(a.houseNumber ?? "", b.houseNumber ?? ""),
      );
    return { iso, weekday, stops };
  });
}
