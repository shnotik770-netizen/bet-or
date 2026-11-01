import type { Weekday } from "@prisma/client";
import { WEEKDAYS } from "./labels";

// כל התאריכים באפליקציה הם "יום קלנדרי" בפורמט YYYY-MM-DD.
// במסד הם נשמרים כ-@db.Date, ו-Prisma מחזיר אותם כ-Date בחצות UTC.

const DAY_MS = 24 * 60 * 60 * 1000;

/** היום הנוכחי בישראל */
export function todayIL(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jerusalem" }).format(new Date());
}

export function isISODate(s: string | undefined | null): s is string {
  return !!s && /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(s + "T00:00:00Z"));
}

export function toDate(iso: string): Date {
  return new Date(iso + "T00:00:00Z");
}

export function toISO(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function addDays(iso: string, n: number): string {
  return toISO(new Date(toDate(iso).getTime() + n * DAY_MS));
}

/** יום ראשון של השבוע שבו נמצא התאריך */
export function weekStart(iso: string): string {
  return addDays(iso, -toDate(iso).getUTCDay());
}

/** ראשון–שישי של השבוע */
export function weekDays(sundayIso: string): { iso: string; weekday: Weekday }[] {
  return WEEKDAYS.map((weekday, i) => ({ iso: addDays(sundayIso, i), weekday }));
}

/** יום בשבוע של תאריך, או null בשבת */
export function weekdayOf(iso: string): Weekday | null {
  return WEEKDAYS[toDate(iso).getUTCDay()] ?? null;
}

const gregFmt = new Intl.DateTimeFormat("he-IL", { day: "numeric", month: "numeric", timeZone: "UTC" });
const gregLongFmt = new Intl.DateTimeFormat("he-IL", {
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});
const hebFmt = new Intl.DateTimeFormat("he-IL-u-ca-hebrew", {
  day: "numeric",
  month: "long",
  timeZone: "UTC",
});

export const fmtShort = (iso: string) => gregFmt.format(toDate(iso));
export const fmtLong = (iso: string) => gregLongFmt.format(toDate(iso));
export const fmtHebrew = (iso: string) => hebFmt.format(toDate(iso));
