import Link from "next/link";
import PageTitle from "@/components/PageTitle";
import PrintButton from "@/components/PrintButton";
import AddVisitForm from "@/components/AddVisitForm";
import AddressEditor from "@/components/AddressEditor";
import { weekSchedule, type Stop } from "@/lib/schedule";
import { recentYoldot } from "@/lib/queries";
import { currentRole } from "@/lib/session";
import { deleteVisit } from "@/app/actions";
import { addDays, fmtHebrew, fmtLong, fmtShort, isISODate, todayIL, weekStart } from "@/lib/dates";
import { weekdayLabel } from "@/lib/labels";
import { fmtPhone, fullAddress, wazeLink } from "@/lib/format";

export const dynamic = "force-dynamic";
export const metadata = { title: "סדר יום מתנדבות · שפרה ופועה" };

export default async function VolunteersPage({ searchParams }: { searchParams: Promise<{ week?: string }> }) {
  const { week } = await searchParams;
  const today = todayIL();
  const sunday = weekStart(isISODate(week) ? week : today);
  const isAdmin = (await currentRole()) === "admin";
  const [days, candidates] = await Promise.all([weekSchedule(sunday), isAdmin ? recentYoldot() : Promise.resolve([])]);
  const friday = days[days.length - 1].iso;
  const isThisWeek = sunday === weekStart(today);

  const totalStops = days.reduce((n, d) => n + d.stops.length, 0);
  const families = new Set(days.flatMap((d) => d.stops.map((s) => s.id))).size;

  return (
    <div>
      <PageTitle
        title="סדר יום מתנדבות"
        subtitle={
          <>
            שבוע {fmtShort(sunday)}–{fmtShort(friday)} · {fmtHebrew(sunday)} – {fmtHebrew(friday)}
          </>
        }
      >
        <Link href={`/volunteers?week=${addDays(sunday, -7)}`} className="btn-secondary">→ שבוע קודם</Link>
        {!isThisWeek ? <Link href="/volunteers" className="btn-secondary">השבוע</Link> : null}
        <Link href={`/volunteers?week=${addDays(sunday, 7)}`} className="btn-secondary">שבוע הבא ←</Link>
        <PrintButton label="הדפסת השבוע" />
      </PageTitle>

      {/* סיכום + קפיצה ליום */}
      <div className="no-print mb-6 grid gap-3 sm:grid-cols-[auto_1fr]">
        <div className="card flex items-center justify-center gap-6 px-5 py-4">
          <Stat value={totalStops} label="הגעות השבוע" />
          <span className="h-10 w-px bg-slate-200" />
          <Stat value={families} label="משפחות" />
        </div>
        <nav className="grid grid-cols-3 gap-2 sm:grid-cols-6" aria-label="ימי השבוע">
          {days.map((d) => (
            <a
              key={d.iso}
              href={`#day-${d.weekday}`}
              className={
                "card flex flex-col items-center justify-center px-2 py-2.5 text-center transition hover:border-brand-300 " +
                (d.iso === today ? "border-brand-500 bg-brand-50 ring-2 ring-brand-200" : "")
              }
            >
              <span className="text-sm font-semibold text-brand-900">{weekdayLabel[d.weekday]}</span>
              <span className="text-xs text-slate-500">{fmtShort(d.iso)}</span>
              <span className={"mt-1 rounded-full px-2 text-xs font-bold " + (d.stops.length ? "bg-brand-700 text-white" : "bg-slate-100 text-slate-400")}>
                {d.stops.length}
              </span>
            </a>
          ))}
        </nav>
      </div>

      <div className="space-y-5">
        {days.map((d) => {
          const isToday = d.iso === today;
          const isPast = d.iso < today;
          const scheduled = new Set(d.stops.map((s) => s.id));
          const options = candidates
            .filter((c) => !scheduled.has(c.id))
            .map((c) => ({ id: c.id, label: c.fullName + (c.street ? ` · ${c.street} ${c.houseNumber ?? ""}` : "") }));
          return (
            <section key={d.iso} id={`day-${d.weekday}`} className={"card scroll-mt-4 overflow-hidden " + (isToday ? "ring-2 ring-brand-300" : "")}>
              <header
                className={
                  "flex flex-wrap items-center justify-between gap-2 border-b px-5 py-3 " +
                  (isToday ? "border-brand-200 bg-brand-700 text-white" : d.weekday === "FRIDAY" ? "border-gold-200 bg-gold-50" : "border-slate-100 bg-brand-50/60")
                }
              >
                <div className="flex flex-wrap items-baseline gap-x-3">
                  <h2 className={"text-xl font-bold " + (isToday ? "" : "text-brand-900")}>
                    יום {weekdayLabel[d.weekday]}
                    {isToday ? <span className="ms-2 rounded-full bg-white/20 px-2 py-0.5 text-sm">היום</span> : null}
                  </h2>
                  <span className={"text-sm " + (isToday ? "text-brand-100" : "text-slate-500")}>
                    {fmtLong(d.iso)} · {fmtHebrew(d.iso)}
                  </span>
                </div>
                <span className={"text-sm font-medium " + (isToday ? "text-white" : "text-brand-800")}>
                  {d.stops.length ? `${d.stops.length} כתובות` : ""}
                </span>
              </header>

              {d.stops.length === 0 ? (
                <p className="px-5 py-5 text-center text-slate-400">אין הגעות ביום הזה</p>
              ) : (
                <ol className={"divide-y divide-slate-100 " + (isPast ? "opacity-75" : "")}>
                  {d.stops.map((s, i) => (
                    <StopRow key={s.visitId} stop={s} index={i + 1} isAdmin={isAdmin} />
                  ))}
                </ol>
              )}
              {isAdmin && !isPast ? <AddVisitForm date={d.iso} options={options} /> : null}
            </section>
          );
        })}
      </div>
    </div>
  );
}

function Stat({ value, label }: { value: number; label: string }) {
  return (
    <div className="text-center">
      <div className="text-3xl font-bold text-brand-800">{value}</div>
      <div className="text-xs text-slate-500">{label}</div>
    </div>
  );
}

function StopRow({ stop: s, index, isAdmin }: { stop: Stop; index: number; isAdmin: boolean }) {
  const address = fullAddress(s);
  return (
    <li className="flex gap-4 px-5 py-4">
      <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-full bg-brand-50 text-sm font-bold text-brand-700 ring-1 ring-brand-100">
        {index}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <p className={"text-lg font-semibold " + (address ? "text-slate-900" : "text-blush-700")}>{address || "חסרה כתובת"}</p>
          {s.visitNote ? <span className="rounded-full bg-gold-100 px-2.5 py-0.5 text-xs font-medium text-gold-700">{s.visitNote}</span> : null}
          {s.totalVisits > 1 && s.visitNumber === s.totalVisits ? (
            <span className="rounded-full bg-blush-50 px-2.5 py-0.5 text-xs font-medium text-blush-700 ring-1 ring-blush-200">הגעה אחרונה</span>
          ) : null}
        </div>
        <p className="mt-0.5 text-slate-700">
          {isAdmin ? (
            <Link href={`/yoldot/${s.id}/edit`} className="hover:underline">{s.fullName}</Link>
          ) : (
            s.fullName
          )}
          <span className="text-slate-400"> · </span>
          <a href={`tel:${s.phone}`} dir="ltr" className="whitespace-nowrap text-brand-700 hover:underline">{fmtPhone(s.phone)}</a>
          {s.totalVisits > 1 ? (
            <>
              <span className="text-slate-400"> · </span>
              <span className="whitespace-nowrap text-sm text-slate-500">הגעה {s.visitNumber} מתוך {s.totalVisits}</span>
            </>
          ) : null}
        </p>
        {s.addressNotes ? <p className="mt-1 text-sm text-slate-600">📍 {s.addressNotes}</p> : null}
        {s.preferences ? <p className="mt-1.5 rounded-lg bg-blush-50 px-3 py-1.5 text-sm text-blush-700">💗 {s.preferences}</p> : null}
        {s.notes ? <p className="mt-1.5 rounded-lg bg-gold-50 px-3 py-1.5 text-sm text-gold-700">📝 {s.notes}</p> : null}
        <div className="mt-1.5">
          <AddressEditor id={s.id} address={s} label={address ? "עדכון כתובת" : "הוספת כתובת"} />
        </div>
      </div>
      <div className="no-print flex shrink-0 flex-col items-stretch gap-1">
        {address ? (
          <a href={wazeLink(s)} target="_blank" rel="noopener noreferrer" className="btn-secondary px-3 py-2 text-sm" title="ניווט בוויז">
            ניווט
          </a>
        ) : null}
        {isAdmin ? (
          <form action={deleteVisit}>
            <input type="hidden" name="id" value={s.visitId} />
            <button className="btn-danger w-full px-3 text-xs" title="הסרה מהיום הזה">הסרה</button>
          </form>
        ) : null}
      </div>
    </li>
  );
}
