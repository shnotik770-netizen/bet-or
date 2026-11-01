import Link from "next/link";
import { db } from "@/lib/db";
import { weekSchedule } from "@/lib/schedule";
import { fmtHebrew, fmtLong, fmtShort, toDate, todayIL, toISO, weekStart } from "@/lib/dates";
import { genderLabel, weekdayLabel } from "@/lib/labels";
import { fullAddress } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const today = todayIL();
  const monthStart = today.slice(0, 8) + "01";
  const [week, activeCount, monthBirths, recent, instCount] = await Promise.all([
    weekSchedule(weekStart(today)),
    db.yoledet.count({ where: { serviceEndDate: { gte: toDate(today) } } }),
    db.yoledet.count({ where: { birthDate: { gte: toDate(monthStart) } } }),
    db.yoledet.findMany({ orderBy: { createdAt: "desc" }, take: 5, include: { institution: { select: { name: true } } } }),
    db.institution.count({ where: { isActive: true } }),
  ]);
  const todayStops = week.find((d) => d.iso === today)?.stops ?? [];
  const isShabbat = !week.some((d) => d.iso === today);

  return (
    <div className="space-y-8">
      <section className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <p className="text-sm font-medium text-gold-700">{fmtHebrew(today)} · {fmtLong(today)}</p>
          <h1 className="text-3xl font-bold text-brand-900">שפרה ופועה</h1>
          <p className="text-slate-600">ניהול ורישום יולדות וסידור מתנדבות · מוסדות חב״ד עפולה</p>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <Link href="/volunteers" className="group card relative overflow-hidden border-brand-700 bg-brand-700 p-6 text-white md:col-span-2 hover:bg-brand-800">
          <div className="absolute -start-10 -top-10 size-40 rounded-full bg-white/5" />
          <div className="absolute -bottom-16 start-24 size-48 rounded-full bg-gold-400/10" />
          <div className="relative">
            <span className="text-3xl" aria-hidden>🍲</span>
            <h2 className="mt-2 text-2xl font-bold">סדר יום מתנדבות</h2>
            <p className="mt-1 text-brand-100">כל הכתובות לפי ימי השבוע</p>
            <p className="mt-4 text-lg">
              {isShabbat ? (
                "שבת שלום!"
              ) : (
                <>
                  היום, יום {weekdayLabel[week.find((d) => d.iso === today)!.weekday]}:{" "}
                  <strong className="text-gold-200">{todayStops.length} כתובות</strong>
                </>
              )}
              <span className="ms-2 inline-block transition group-hover:-translate-x-1">←</span>
            </p>
          </div>
        </Link>
        <Link href="/yoldot/new" className="card flex flex-col justify-between border-blush-200 bg-blush-50 p-6 hover:border-blush-400">
          <div>
            <span className="text-3xl" aria-hidden>👶</span>
            <h2 className="mt-2 text-xl font-bold text-brand-900">רישום יולדת חדשה</h2>
            <p className="mt-1 text-slate-600">טופס קצר, והכתובת נכנסת לסידור</p>
          </div>
          <span className="mt-4 font-medium text-blush-700">לטופס ←</span>
        </Link>
      </section>

      <section className="grid grid-cols-3 gap-3">
        <StatCard href="/yoldot" value={activeCount} label="יולדות בסידור כעת" />
        <StatCard href="/yoldot?show=all" value={monthBirths} label="לידות החודש" />
        <StatCard href="/institutions" value={instCount} label="מוסדות פעילים" />
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <div className="card p-5">
          <h2 className="mb-3 font-semibold text-brand-900">היום אצל המתנדבות</h2>
          {todayStops.length === 0 ? (
            <p className="text-sm text-slate-400">אין הגעות היום</p>
          ) : (
            <ul className="space-y-2">
              {todayStops.slice(0, 6).map((s) => (
                <li key={s.id} className="flex items-center justify-between gap-2 text-sm">
                  <span className="font-medium text-slate-800">{fullAddress(s)}</span>
                  <span className="text-slate-500">{s.fullName}</span>
                </li>
              ))}
              {todayStops.length > 6 ? (
                <li className="text-sm text-brand-700">
                  <Link href="/volunteers">ועוד {todayStops.length - 6}…</Link>
                </li>
              ) : null}
            </ul>
          )}
        </div>
        <div className="card p-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-semibold text-brand-900">נרשמו לאחרונה</h2>
            <Link href="/yoldot?show=all" className="text-sm text-brand-700 hover:underline">לכל היולדות</Link>
          </div>
          {recent.length === 0 ? (
            <p className="text-sm text-slate-400">עדיין לא נרשמו יולדות</p>
          ) : (
            <ul className="space-y-2">
              {recent.map((y) => (
                <li key={y.id} className="flex items-center justify-between gap-2 text-sm">
                  <span>
                    <span className="font-medium text-slate-800">{y.fullName}</span>
                    <span className="text-slate-500"> · {y.institution.name}</span>
                  </span>
                  <span className="text-slate-500">
                    {genderLabel[y.babyGender]} · {fmtShort(toISO(y.birthDate))}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </div>
  );
}

function StatCard({ href, value, label }: { href: string; value: number; label: string }) {
  return (
    <Link href={href} className="card px-4 py-4 text-center hover:border-brand-300">
      <div className="text-3xl font-bold text-brand-800">{value}</div>
      <div className="text-xs text-slate-500 sm:text-sm">{label}</div>
    </Link>
  );
}
