"use client";

import { useActionState, useEffect, useRef } from "react";
import { addVisit, deleteVisit } from "@/app/actions";
import type { FormState } from "@/lib/yoledet-schema";
import { fmtShort, weekdayOf } from "@/lib/dates";
import { weekdayLabel } from "@/lib/labels";

/** שיבוצים של יולדת אחת בסדר היום של המתנדבות */
export default function VisitsEditor({
  yoledetId,
  today,
  visits,
}: {
  yoledetId: number;
  today: string;
  visits: { id: number; date: string; note: string | null }[];
}) {
  const [state, action, pending] = useActionState<FormState, FormData>(addVisit, { ok: false });
  const noteRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (state.ok && noteRef.current) noteRef.current.value = "";
  }, [state]);

  const upcoming = visits.filter((v) => v.date >= today);
  const pastCount = visits.length - upcoming.length;

  return (
    <section className="card border-gold-200 bg-gold-50/40 p-5 sm:p-6">
      <h2 className="mb-1 flex items-center gap-2 text-lg font-semibold text-brand-900">
        <span aria-hidden>🍲</span> שיבוץ בסדר היום
      </h2>
      <p className="mb-4 text-sm text-slate-500">
        {upcoming.length ? `${upcoming.length} שיבוצים קרובים` : "אין שיבוצים קרובים"}
        {pastCount ? ` · ${pastCount} כבר היו` : ""}
      </p>

      {upcoming.length ? (
        <ul className="mb-4 flex flex-wrap gap-2">
          {upcoming.map((v) => {
            const wd = weekdayOf(v.date);
            return (
              <li key={v.id} className="flex items-center gap-1 rounded-xl border border-brand-200 bg-white py-1 ps-3 pe-1 text-sm">
                <span className="font-medium text-brand-900">
                  {wd ? weekdayLabel[wd] : "שבת"} {fmtShort(v.date)}
                </span>
                {v.note ? <span className="text-slate-500">· {v.note}</span> : null}
                <form action={deleteVisit}>
                  <input type="hidden" name="id" value={v.id} />
                  <button className="grid size-6 place-items-center rounded-lg text-slate-400 hover:bg-blush-50 hover:text-blush-700" aria-label="ביטול השיבוץ" title="ביטול השיבוץ">
                    ×
                  </button>
                </form>
              </li>
            );
          })}
        </ul>
      ) : null}

      <form action={action} className="flex flex-wrap items-end gap-2">
        <input type="hidden" name="yoledetId" value={yoledetId} />
        <div>
          <label htmlFor="visit-date" className="label">תאריך</label>
          <input id="visit-date" name="date" type="date" min={today} defaultValue={today} className="input py-2" />
        </div>
        <div className="min-w-40 flex-1">
          <label htmlFor="visit-note" className="label">מה מביאים (לא חובה)</label>
          <input id="visit-note" ref={noteRef} name="note" className="input py-2" placeholder="ארוחת צהריים, ארוחת שבת…" />
        </div>
        <button className="btn-primary py-2" disabled={pending}>
          {pending ? "…" : "+ שיבוץ"}
        </button>
      </form>
      {state.errors ? <p className="mt-2 text-sm text-blush-700">{Object.values(state.errors)[0]}</p> : null}
    </section>
  );
}
