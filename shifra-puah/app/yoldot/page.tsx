import Link from "next/link";
import PageTitle from "@/components/PageTitle";
import ConfirmButton from "@/components/ConfirmButton";
import { db } from "@/lib/db";
import { deleteYoledet } from "@/app/actions";
import { fmtShort, toDate, todayIL, toISO } from "@/lib/dates";
import { genderLabel, weekdayShort } from "@/lib/labels";
import { fmtPhone, fullAddress } from "@/lib/format";
import type { Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";
export const metadata = { title: "יולדות · שפרה ופועה" };

type Filter = "active" | "all";

export default async function YoldotPage({
  searchParams,
}: {
  searchParams: Promise<{ show?: string; q?: string; inst?: string; saved?: string }>;
}) {
  const sp = await searchParams;
  const show: Filter = sp.show === "all" ? "all" : "active";
  const q = sp.q?.trim() ?? "";
  const inst = Number(sp.inst) || undefined;
  const today = todayIL();

  const where: Prisma.YoledetWhereInput = {
    ...(show === "active" ? { serviceEndDate: { gte: toDate(today) } } : {}),
    ...(inst ? { institutionId: inst } : {}),
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

  const [yoldot, institutions] = await Promise.all([
    db.yoledet.findMany({
      where,
      orderBy: [{ birthDate: "desc" }, { id: "desc" }],
      include: { institution: { select: { name: true } }, reporter: { select: { name: true } } },
      take: 500,
    }),
    db.institution.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);

  return (
    <div>
      <PageTitle title="יולדות" subtitle={show === "active" ? "יולדות שהמתנדבות עדיין מגיעות אליהן" : "כל היולדות שנרשמו"}>
        <Link href="/yoldot/new" className="btn-primary">
          + רישום יולדת
        </Link>
      </PageTitle>

      {sp.saved ? (
        <div role="status" className="mb-4 rounded-xl border border-brand-200 bg-brand-50 px-4 py-3 text-brand-800">
          ✓ הפרטים של {sp.saved} נשמרו
        </div>
      ) : null}

      <form className="card mb-4 flex flex-wrap items-end gap-3 p-4" role="search">
        <div className="min-w-48 flex-1">
          <label htmlFor="q" className="label">חיפוש</label>
          <input id="q" name="q" defaultValue={q} className="input" placeholder="שם, טלפון או רחוב" />
        </div>
        <div className="min-w-44">
          <label htmlFor="inst" className="label">מוסד</label>
          <select id="inst" name="inst" defaultValue={inst ?? ""} className="input">
            <option value="">כל המוסדות</option>
            {institutions.map((i) => (
              <option key={i.id} value={i.id}>{i.name}</option>
            ))}
          </select>
        </div>
        <div className="min-w-36">
          <label htmlFor="show" className="label">הצגה</label>
          <select id="show" name="show" defaultValue={show} className="input">
            <option value="active">בסידור כעת</option>
            <option value="all">כולן</option>
          </select>
        </div>
        <button className="btn-secondary">סינון</button>
      </form>

      {yoldot.length === 0 ? (
        <div className="card px-5 py-10 text-center text-slate-500">לא נמצאו יולדות</div>
      ) : (
        <ul className="grid gap-3 md:grid-cols-2">
          {yoldot.map((y) => {
            const ended = toISO(y.serviceEndDate) < today;
            return (
              <li key={y.id} className="card flex flex-col p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-semibold text-slate-900">{y.fullName}</h2>
                    <a href={`tel:${y.phone}`} dir="ltr" className="text-sm text-brand-700 hover:underline">
                      {fmtPhone(y.phone)}
                    </a>
                  </div>
                  <span
                    className={
                      "rounded-full px-2.5 py-0.5 text-sm font-medium " +
                      { BOY: "bg-brand-50 text-brand-800", GIRL: "bg-blush-50 text-blush-700", TWINS: "bg-gold-50 text-gold-700" }[y.babyGender]
                    }
                  >
                    {genderLabel[y.babyGender]} · {fmtShort(toISO(y.birthDate))}
                  </span>
                </div>
                <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">
                  <dt className="text-slate-500">כתובת</dt>
                  <dd>{fullAddress(y)}</dd>
                  <dt className="text-slate-500">מוסד</dt>
                  <dd>
                    {y.institution.name} <span className="text-slate-400">· דיווח: {y.reporter.name}</span>
                  </dd>
                  <dt className="text-slate-500">מתנדבות</dt>
                  <dd className={ended ? "text-slate-400" : ""}>
                    {fmtShort(toISO(y.serviceStartDate))}–{fmtShort(toISO(y.serviceEndDate))} · ימים{" "}
                    {y.serviceDays.map((d) => weekdayShort[d]).join(" ")}
                    {ended ? " (הסתיים)" : ""}
                  </dd>
                  {y.notes ? (
                    <>
                      <dt className="text-slate-500">הערות</dt>
                      <dd className="text-slate-700">{y.notes}</dd>
                    </>
                  ) : null}
                </dl>
                <div className="mt-auto flex justify-end gap-1 pt-3">
                  <Link href={`/yoldot/${y.id}/edit`} className="btn-ghost">עריכה</Link>
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
