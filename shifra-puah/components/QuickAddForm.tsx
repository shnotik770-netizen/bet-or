"use client";

import { useActionState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { quickAddYoledet } from "@/app/actions";
import type { FormState } from "@/lib/yoledet-schema";
import type { InstitutionOption } from "./YoledetForm";
import ReporterSelect from "./ReporterSelect";

/** הוספה מהירה של יולדת: שם וטלפון (חובה), מי דיווח/ה (לא חובה) */
export default function QuickAddForm({ institutions }: { institutions: InstitutionOption[] }) {
  const [state, action, pending] = useActionState<FormState, FormData>(quickAddYoledet, { ok: false });
  const ref = useRef<HTMLFormElement>(null);
  const nameRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  useEffect(() => {
    if (state.ok) {
      ref.current?.reset();
      nameRef.current?.focus();
    }
  }, [state]);
  const v = (k: string) => (!state.ok && typeof state.values?.[k] === "string" ? (state.values[k] as string) : "");

  /** מעבר לטופס המלא עם מה שכבר הוקלד */
  function openFullForm() {
    const params = new URLSearchParams();
    if (ref.current) {
      for (const [k, val] of new FormData(ref.current)) {
        if (!k.startsWith("$") && typeof val === "string" && val.trim()) params.set(k, val.trim());
      }
    }
    router.push(`/yoldot/new${params.size ? `?${params}` : ""}`);
  }

  return (
    <div>
      <form ref={ref} action={action} className="grid gap-2 sm:grid-cols-[1.3fr_1fr_1.2fr_auto]" key={state.ok ? "ok" : JSON.stringify(state.values ?? {})}>
        <div>
          <input ref={nameRef} name="fullName" className="input" placeholder="שם מלא *" aria-label="שם מלא" defaultValue={v("fullName")} aria-invalid={!!state.errors?.fullName} />
          {state.errors?.fullName ? <p className="mt-1 text-sm text-blush-700">{state.errors.fullName}</p> : null}
        </div>
        <div>
          <input name="phone" type="tel" inputMode="tel" dir="ltr" className="input text-right" placeholder="טלפון *" aria-label="טלפון" defaultValue={v("phone")} aria-invalid={!!state.errors?.phone} />
          {state.errors?.phone ? <p className="mt-1 text-sm text-blush-700">{state.errors.phone}</p> : null}
        </div>
        <ReporterSelect institutions={institutions} defaultValue={v("reporterId")} emptyLabel="מי דיווח/ה? (לא חובה)" />
        <button className="btn-primary h-fit" disabled={pending}>{pending ? "שומר…" : "+ הוספה"}</button>
      </form>
      <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
        {state.ok ? (
          <p role="status" className="text-sm text-brand-800">
            ✓ {state.message}.{" "}
            <Link href={`/yoldot/${state.values?.id}/edit`} className="font-medium underline">השלמת פרטים ושיבוץ</Link>
          </p>
        ) : (
          <span />
        )}
        <button type="button" onClick={openFullForm} className="text-sm font-medium text-brand-700 underline-offset-2 hover:underline">
          לטופס המלא ←
        </button>
      </div>
    </div>
  );
}
