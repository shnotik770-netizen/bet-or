import Link from "next/link";
import PageTitle from "@/components/PageTitle";
import ConfirmButton from "@/components/ConfirmButton";
import QuickAddForm from "@/components/QuickAddForm";
import { db } from "@/lib/db";
import { deleteYoledet } from "@/app/actions";
import { fmtShort, toDate, todayIL, toISO } from "@/lib/dates";
import { genderLabel } from "@/lib/labels";
import { fmtPhone, fullAddress } from "@/lib/format";
import type { Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";
export const metadata = { title: "יולדות · שפרה ופועה" };

export default async function YoldotPage({ searchParams }: { searchParams: Promise<{ q?: string; inst?: string; saved?: string }> }) {
  const sp = await searchParams;
  const q = sp.q?.trim() ?? "";
  const inst = Number(sp.inst) || undefined;
  const today = todayIL();

  const where: Prisma.YoledetWhereInput = {
    ...(inst ? { institutions: { some: { id: inst } } } : {}),
    ...(q
      ? {
          OR: [
            { fullName: { contains: q, mode: "insensitive" } },
            { phone: { contains: q.replace(/[\s-]/g, "") } },
            { street: { contains: q, mode: "insensitive" } },
          ],
        }
      : {}),
  };

  const [yoldot, institutions, saved] = await Promise.all([
    db.yoledet.findMany({
      where,
      orderBy: [{ createdAt: "desc" }],
      include: {
        institutions: { select: { name: true }, orderBy: { name: "asc" } },
        reporter: { select: { name: true } },
        visits: { where: { date: { gte: toDate(today) } }, orderBy: { date: "asc" }, select: { date: true } },
      },
      take: 300,
    }),
    db.institution.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    Number(sp.saved) ? db.yoledet.findUnique({ where: { id: Number(sp.saved) }, select: { id: true, fullName: true } }) : null,
  ]);

  return (
    <div>
      <PageTitle title="יולדות">
        <Link href="/yoldot/new" className="btn-secondary">טופס מלא</Link>
      </PageTitle>

      {saved ? (
        <div role="status" className="mb-4 rounded-xl border border-brand-200 bg-brand-50 px-4 py-3 text-brand-800">
          ✓ הפרטים של {saved.fullName} נשמרו
        </div>
      ) : null}

      <section className="card mb-4 border-blush-200 bg-blush-50/50 p-4">
        <h2 className="mb-2 font-semibold text-brand-900">הוספה מהירה</h2>
        <QuickAddForm />
      </section>

      <form className="mb-4 flex flex-wrap items-end gap-2" role="search">
        <input name="q" defaultValue={q} className="input min-w-48 flex-1" placeholder="חיפוש לפי שם, טלפון או רחוב" aria-label="חיפוש" />
        <select name="inst" defaultValue={inst ?? ""} className="input w-auto" aria-label="מוסד">
          <option value="">כל המוסדות</option>
          {institutions.map((i) => (
            <option key={i.id} value={i.id}>{i.name}</option>
          ))}
        </select>
        <button className="btn-secondary">חיפוש</button>
      </form>

      {yoldot.length === 0 ? (
        <div className="card px-5 py-10 text-center text-slate-500">לא נמצאו יולדות</div>
      ) : (
        <ul className="grid gap-3 md:grid-cols-2">
          {yoldot.map((y) => {
            const address = fullAddress(y);
            return (
              <li key={y.id} className="card flex flex-col p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <Link href={`/yoldot/${y.id}/edit`} className="text-lg font-semibold text-slate-900 hover:underline">{y.fullName}</Link>
                    <div>
                      <a href={`tel:${y.phone}`} dir="ltr" className="text-sm text-brand-700 hover:underline">{fmtPhone(y.phone)}</a>
                    </div>
                  </div>
                  {y.babyGender || y.birthDate ? (
                    <span className={"rounded-full px-2.5 py-0.5 text-sm font-medium " + (y.babyGender ? { BOY: "bg-brand-50 text-brand-800", GIRL: "bg-blush-50 text-blush-700", TWINS: "bg-gold-50 text-gold-700" }[y.babyGender] : "bg-slate-100 text-slate-600")}>
                      {[y.babyGender && genderLabel[y.babyGender], y.birthDate && fmtShort(toISO(y.birthDate))].filter(Boolean).join(" · ")}
                    </span>
                  ) : null}
                </div>
                <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">
                  <dt className="text-slate-500">כתובת</dt>
                  <dd className={address ? "" : "text-slate-400"}>{address || "לא הוזנה"}</dd>
                  {y.institutions.length ? (
                    <>
                      <dt className="text-slate-500">מוסדות</dt>
                      <dd>
                        {y.institutions.map((i) => i.name).join(", ")}
                        {y.reporter ? <span className="text-slate-400"> · דיווח: {y.reporter.name}</span> : null}
                      </dd>
                    </>
                  ) : null}
                  {y.preferences ? (
                    <>
                      <dt className="text-slate-500">העדפות</dt>
                      <dd className="text-blush-700">{y.preferences}</dd>
                    </>
                  ) : null}
                  <dt className="text-slate-500">שיבוצים</dt>
                  <dd className={y.visits.length ? "" : "text-slate-400"}>
                    {y.visits.length ? y.visits.slice(0, 6).map((v) => fmtShort(toISO(v.date))).join(", ") + (y.visits.length > 6 ? "…" : "") : "אין שיבוצים קרובים"}
                  </dd>
                </dl>
                <div className="mt-auto flex justify-end gap-1 pt-3">
                  <Link href={`/yoldot/${y.id}/edit`} className="btn-ghost">עריכה ושיבוץ</Link>
                  <form action={deleteYoledet}>
                    <input type="hidden" name="id" value={y.id} />
                    <ConfirmButton message={`למחוק את ${y.fullName}?`} className="btn-danger">מחיקה</ConfirmButton>
                  </form>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
