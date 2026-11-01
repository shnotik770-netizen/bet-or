"use client";

import { useActionState, useEffect, useState } from "react";
import { updateAddress } from "@/app/actions";
import type { FormState } from "@/lib/yoledet-schema";

type Address = { street: string | null; houseNumber: string | null; apartment: string | null; city: string | null; addressNotes: string | null };

/** עדכון כתובת במקום – זמין גם למתנדבות */
export default function AddressEditor({ id, address, label = "עדכון כתובת" }: { id: number; address: Address; label?: string }) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState<FormState, FormData>(updateAddress, { ok: false });
  useEffect(() => {
    if (state.ok) setOpen(false);
  }, [state]);

  if (!open) {
    return (
      <span className="no-print inline-flex items-center gap-2">
        <button type="button" onClick={() => setOpen(true)} className="text-sm text-brand-700 underline-offset-2 hover:underline">
          ✏️ {label}
        </button>
        {state.ok && state.message ? <span className="text-sm text-brand-700">✓ {state.message}</span> : null}
      </span>
    );
  }
  return (
    <form action={action} className="no-print mt-2 grid gap-2 rounded-xl border border-brand-100 bg-brand-50/50 p-3 sm:grid-cols-6">
      <input type="hidden" name="id" value={id} />
      <input name="street" defaultValue={address.street ?? ""} placeholder="רחוב" aria-label="רחוב" className="input py-2 text-sm sm:col-span-3" autoFocus />
      <input name="houseNumber" defaultValue={address.houseNumber ?? ""} placeholder="מספר" aria-label="מספר בית" className="input py-2 text-sm sm:col-span-1" />
      <input name="apartment" defaultValue={address.apartment ?? ""} placeholder="דירה / קומה" aria-label="דירה" className="input py-2 text-sm sm:col-span-2" />
      <input name="city" defaultValue={address.city ?? ""} placeholder="עיר" aria-label="עיר" className="input py-2 text-sm sm:col-span-2" />
      <input name="addressNotes" defaultValue={address.addressNotes ?? ""} placeholder="הכוונה: כניסה, קוד לבניין…" aria-label="הכוונה לכתובת" className="input py-2 text-sm sm:col-span-4" />
      <div className="flex gap-2 sm:col-span-6">
        <button className="btn-primary py-1.5 text-sm" disabled={pending}>{pending ? "שומר…" : "שמירה"}</button>
        <button type="button" className="btn-ghost" onClick={() => setOpen(false)}>ביטול</button>
        {state.message && !state.ok ? <span className="text-sm text-blush-700">{state.message}</span> : null}
      </div>
    </form>
  );
}
