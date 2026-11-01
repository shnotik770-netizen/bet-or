import { db } from "./db";
import { addDays, toDate, todayIL } from "./dates";

export const RECENT_DAYS = 30;

export type Group = "none" | "once" | "multi";

export const groupLabel: Record<Group, string> = {
  none: "לא שובצו כלל",
  once: "שובצו פעם אחת",
  multi: "שובצו 2 פעמים ומעלה",
};

export function isGroup(s: string | undefined): s is Group {
  return s === "none" || s === "once" || s === "multi";
}

/**
 * יולדות שילדו ב-30 הימים האחרונים, מחולקות לפי מספר השיבוצים (כל השיבוצים, גם שעברו).
 * יולדת בלי תאריך לידה נספרת לפי תאריך הרישום, כדי שהוספה מהירה לא תיעלם.
 */
export async function recentGroups(): Promise<Record<Group, number[]>> {
  const since = toDate(addDays(todayIL(), -(RECENT_DAYS - 1)));
  const list = await db.yoledet.findMany({
    where: {
      OR: [{ birthDate: { gte: since } }, { birthDate: null, createdAt: { gte: since } }],
    },
    select: { id: true, _count: { select: { visits: true } } },
  });
  const groups: Record<Group, number[]> = { none: [], once: [], multi: [] };
  for (const y of list) {
    const n = y._count.visits;
    groups[n === 0 ? "none" : n === 1 ? "once" : "multi"].push(y.id);
  }
  return groups;
}
