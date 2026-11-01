"use client";

import { useActionState, useEffect, useRef } from "react";
import Link from "next/link";
import { quickAddYoledet } from "@/app/actions";
import type { FormState } from "@/lib/yoledet-schema";

/** הוספה מהירה של יולדת: שם וטלפון, ולשמור */
export default function QuickAddForm() {
  const [state, action, pending] = useActionState<FormState, FormData>(quickAddYoledet, { ok: false });
  const ref = useRef<HTMLFormElement>(null);
  const nameRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (state.ok) {
      ref.current?.reset();
      nameRef.current?.focus();
    }
  }, [state]);
  const v = (k: string) => (!state.ok && typeof state.values?.[k] === "string" ? (state.values[k] as string) : "");

  return (
    <div>
      <form ref={ref} action={action} className="grid gap-2 sm:grid-cols-[1.3fr_1fr_auto]" key={state.ok ? "ok" : JSON.stringify(state.values ?? {})}>
        <div>
          <input ref={nameRef} name="fullName" className="input" placeholder="שם מלא" aria-label="שם מלא" defaultValue={v("fullName")} aria-invalid={!!state.errors?.fullName} />
          {state.errors?.fullName ? <p className="mt-1 text-sm text-blush-700">{state.errors.fullName}</p> : null}
        </div>
        <div>
          <input name="phone" type="tel" inputMode="tel" dir="ltr" className="input text-right" placeholder="טלפון" aria-label="טלפון" defaultValue={v("phone")} aria-invalid={!!state.errors?.phone} />
          {state.errors?.phone ? <p className="mt-1 text-sm text-blush-700">{state.errors.phone}</p> : null}
        </div>
        <button className="btn-primary h-fit" disabled={pending}>{pending ? "שומר…" : "+ הוספה"}</button>
      </form>
      {state.ok ? (
        <p role="status" className="mt-2 text-sm text-brand-800">
          ✓ {state.message}.{" "}
          <Link href={`/yoldot/${state.values?.id}/edit`} className="font-medium underline">השלמת פרטים ושיבוץ</Link>
        </p>
      ) : null}
    </div>
  );
}
