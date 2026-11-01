"use client";

import { useActionState, useEffect, useRef } from "react";
import { addVisit } from "@/app/actions";
import type { FormState } from "@/lib/yoledet-schema";

/** הוספת יולדת ליום מסוים בסדר היום (למנהל) */
export default function AddVisitForm({
  date,
  options,
}: {
  date: string;
  options: { id: number; label: string }[];
}) {
  const [state, action, pending] = useActionState<FormState, FormData>(addVisit, { ok: false });
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state.ok) ref.current?.reset();
  }, [state]);

  if (options.length === 0) return null;
  return (
    <form ref={ref} action={action} className="no-print flex flex-wrap gap-2 border-t border-dashed border-slate-200 bg-slate-50/60 px-5 py-3">
      <input type="hidden" name="date" value={date} />
      <select name="yoledetId" className="input min-w-44 flex-1 py-2 text-sm" defaultValue="" aria-label="יולדת לשיבוץ" required>
        <option value="" disabled>+ הוספת יולדת ליום הזה…</option>
        {options.map((o) => (
          <option key={o.id} value={o.id}>{o.label}</option>
        ))}
      </select>
      <input name="note" className="input w-auto min-w-32 flex-1 py-2 text-sm" placeholder="מה מביאים (לא חובה)" aria-label="מה מביאים" />
      <button className="btn-secondary py-2 text-sm" disabled={pending}>{pending ? "…" : "שיבוץ"}</button>
    </form>
  );
}
