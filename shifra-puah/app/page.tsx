import Link from "next/link";
import { db } from "@/lib/db";
import { weekSchedule } from "@/lib/schedule";
import QuickAddForm from "@/components/QuickAddForm";
import { fmtHebrew, fmtLong, fmtShort, toDate, todayIL, toISO, weekStart } from "@/lib/dates";
import { genderLabel, weekdayLabel } from "@/lib/labels";
import { fullAddress } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const today = todayIL();
  const monthStart = today.slice(0, 8) + "01";
  const [week, monthBirths, recent, unscheduled] = await Promise.all([
    weekSchedule(weekStart(today)),
    db.yoledet.count({ where: { birthDate: { gte: toDate(monthStart) } } }),
    db.yoledet.findMany({ orderBy: { createdAt: "desc" }, take: 6, include: { institutions: { select: { name: true } } } }),
    db.yoledet.count({ where: { createdAt: { gte: toDate(monthStart) }, visits: { none: {} } } }),
  ]);
  const todayDay = week.find((d) => d.iso === today);
  const todayStops = todayDay?.stops ?? [];
  const weekStops = week.reduce((n, d) => n + d.stops.length, 0);

  return (
    <div className="space-y-6">
      <section>
        <p className="text-sm font-medium text-gold-700">{fmtHebrew(today)} · {fmtLong(today)}</p>
        <h1 className="text-3xl font-bold text-brand-900">שפרה ופועה</h1>
      </section>

      <section className="card border-blush-200 bg-blush-50/60 p-5">
        <h2 className="mb-1 text-lg font-bold text-brand-900">👶 יולדת חדשה</h2>
        <p className="mb-3 text-sm text-slate-600">שם וטלפון, ולשמור. את השאר אפשר להשלים אחר כך.</p>
        <QuickAddForm />
      </section>

      <Link href="/volunteers" className="group card relative block overflow-hidden border-brand-700 bg-brand-700 p-6 text-white hover:bg-brand-800">
        <div className="absolute -start-10 -top-10 size-40 rounded-full bg-white/5" />
        <div className="absolute -bottom-16 start-24 size-48 rounded-full bg-gold-400/10" />
        <div className="relative flex flex-wrap items-end justify-between gap-4">
          <div>
            <span className="text-3xl" aria-hidden>🍲</span>
            <h2 className="mt-1 text-2xl font-bold">סדר יום מתנדבות</h2>
            <p className="mt-1 text-lg">
              {todayDay ? (
                <>
                  היום, יום {weekdayLabel[todayDay.weekday]}: <strong className="text-gold-200">{todayStops.length} כתובות</strong>
                </>
              ) : (
                "שבת שלום!"
              )}
              <span className="text-brand-100"> · {weekStops} השבוע</span>
            </p>
          </div>
          <span className="text-brand-100 transition group-hover:-translate-x-1">לסידור ולשיבוץ ←</span>
        </div>
      </Link>

      <section className="grid grid-cols-2 gap-3">
        <StatCard href="/yoldot" value={monthBirths} label="לידות החודש" />
        <StatCard href="/yoldot" value={unscheduled} label="נרשמו החודש ועוד לא שובצו" highlight={unscheduled > 0} />
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <div className="card p-5">
          <h2 className="mb-3 font-semibold text-brand-900">היום אצל המתנדבות</h2>
          {todayStops.length === 0 ? (
            <p className="text-sm text-slate-400">אין הגעות היום</p>
          ) : (
            <ul className="space-y-2">
              {todayStops.slice(0, 6).map((s) => (
                <li key={s.visitId} className="flex items-center justify-between gap-2 text-sm">
                  <span className="font-medium text-slate-800">{fullAddress(s) || "חסרה כתובת"}</span>
                  <span className="text-slate-500">{s.fullName}</span>
                </li>
              ))}
              {todayStops.length > 6 ? (
                <li className="text-sm text-brand-700"><Link href="/volunteers">ועוד {todayStops.length - 6}…</Link></li>
              ) : null}
            </ul>
          )}
        </div>
        <div className="card p-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-semibold text-brand-900">נרשמו לאחרונה</h2>
            <Link href="/yoldot" className="text-sm text-brand-700 hover:underline">לכל היולדות</Link>
          </div>
          {recent.length === 0 ? (
            <p className="text-sm text-slate-400">עדיין לא נרשמו יולדות</p>
          ) : (
            <ul className="space-y-2">
              {recent.map((y) => (
                <li key={y.id} className="flex items-center justify-between gap-2 text-sm">
                  <Link href={`/yoldot/${y.id}/edit`} className="hover:underline">
                    <span className="font-medium text-slate-800">{y.fullName}</span>
                    {y.institutions.length ? <span className="text-slate-500"> · {y.institutions.map((i) => i.name).join(", ")}</span> : null}
                  </Link>
                  <span className="text-slate-500">
                    {[y.babyGender && genderLabel[y.babyGender], y.birthDate && fmtShort(toISO(y.birthDate))].filter(Boolean).join(" · ")}
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

function StatCard({ href, value, label, highlight }: { href: string; value: number; label: string; highlight?: boolean }) {
  return (
    <Link href={href} className={"card px-4 py-4 text-center hover:border-brand-300 " + (highlight ? "border-gold-200 bg-gold-50" : "")}>
      <div className={"text-3xl font-bold " + (highlight ? "text-gold-700" : "text-brand-800")}>{value}</div>
      <div className="text-xs text-slate-500 sm:text-sm">{label}</div>
    </Link>
  );
}
