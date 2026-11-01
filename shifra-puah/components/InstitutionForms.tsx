"use client";

import { useActionState, useEffect, useRef } from "react";
import { saveInstitution, saveReporter } from "@/app/actions";
import type { FormState } from "@/lib/yoledet-schema";
import { institutionTypeLabel } from "@/lib/labels";
import type { InstitutionType } from "@prisma/client";

const types = Object.keys(institutionTypeLabel) as InstitutionType[];

/** הוספת מוסד, או עריכה כשמועבר initial */
export function InstitutionForm({
  initial,
  onDone,
}: {
  initial?: { id: number; name: string; type: InstitutionType; notes: string | null };
  onDone?: () => void;
}) {
  const [state, action, pending] = useActionState<FormState, FormData>(saveInstitution, { ok: false });
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state.ok) {
      if (!initial) ref.current?.reset();
      onDone?.();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  return (
    <form ref={ref} action={action} className="grid gap-3 sm:grid-cols-[2fr_1fr_2fr_auto] sm:items-end">
      {initial ? <input type="hidden" name="id" value={initial.id} /> : null}
      <div>
        <label className="label" htmlFor={`name-${initial?.id ?? "new"}`}>שם המוסד</label>
        <input id={`name-${initial?.id ?? "new"}`} name="name" className="input" defaultValue={initial?.name} placeholder="לדוגמה: גן חב״ד ״אור מנחם״" aria-invalid={!!state.errors?.name} />
        {state.errors?.name ? <p className="mt-1 text-sm text-blush-700">{state.errors.name}</p> : null}
      </div>
      <div>
        <label className="label" htmlFor={`type-${initial?.id ?? "new"}`}>סוג</label>
        <select id={`type-${initial?.id ?? "new"}`} name="type" className="input" defaultValue={initial?.type ?? "KINDERGARTEN"}>
          {types.map((t) => (
            <option key={t} value={t}>{institutionTypeLabel[t]}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="label" htmlFor={`notes-${initial?.id ?? "new"}`}>הערות</label>
        <input id={`notes-${initial?.id ?? "new"}`} name="notes" className="input" defaultValue={initial?.notes ?? ""} placeholder="לא חובה" />
      </div>
      <button className="btn-primary" disabled={pending}>
        {pending ? "שומר…" : initial ? "שמירה" : "+ הוספת מוסד"}
      </button>
      {state.ok && state.message && !initial ? <p className="text-sm text-brand-700 sm:col-span-4">✓ {state.message}</p> : null}
    </form>
  );
}

export function ReporterForm({ institutionId }: { institutionId: number }) {
  const [state, action, pending] = useActionState<FormState, FormData>(saveReporter, { ok: false });
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state.ok) ref.current?.reset();
  }, [state]);
  return (
    <form ref={ref} action={action} className="mt-3 grid gap-2 sm:grid-cols-[2fr_1.3fr_1.5fr_auto]">
      <input type="hidden" name="institutionId" value={institutionId} />
      <div>
        <input name="name" className="input py-2 text-sm" placeholder="שם המדווח/ת" aria-label="שם המדווח/ת" aria-invalid={!!state.errors?.name} />
        {state.errors?.name ? <p className="mt-1 text-xs text-blush-700">{state.errors.name}</p> : null}
      </div>
      <input name="role" className="input py-2 text-sm" placeholder="תפקיד (מנהלת, גננת…)" aria-label="תפקיד" />
      <input name="phone" type="tel" dir="ltr" className="input py-2 text-right text-sm" placeholder="טלפון" aria-label="טלפון" />
      <button className="btn-secondary py-2 text-sm" disabled={pending}>
        {pending ? "…" : "+ הוספה"}
      </button>
    </form>
  );
}
