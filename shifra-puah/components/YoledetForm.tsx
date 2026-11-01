"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { saveYoledet } from "@/app/actions";
import type { FormState } from "@/lib/yoledet-schema";
import { genderLabel } from "@/lib/labels";

export type InstitutionOption = {
  id: number;
  name: string;
  reporters: { id: number; name: string; role: string | null }[];
};

export type YoledetFormValues = {
  id?: number;
  fullName: string;
  phone: string;
  street: string;
  houseNumber: string;
  apartment: string;
  city: string;
  addressNotes: string;
  institutionIds: string[];
  reporterId: string;
  birthDate: string;
  babyGender: string;
  preferences: string;
  notes: string;
};

const initialState: FormState = { ok: false };

export default function YoledetForm({
  institutions,
  initial,
}: {
  institutions: InstitutionOption[];
  initial: YoledetFormValues;
}) {
  const [state, formAction, pending] = useActionState(saveYoledet, initialState);
  const isEdit = !!initial.id;

  // אחרי שגיאה – ממלאים מחדש מהערכים שנשלחו
  const v = (k: keyof YoledetFormValues) => {
    const s = state.values?.[k];
    return typeof s === "string" ? s : String(initial[k] ?? "");
  };
  const err = state.errors ?? {};

  const [instIds, setInstIds] = useState<string[]>(initial.institutionIds);
  const [reporterId, setReporterId] = useState(initial.reporterId);
  const [gender, setGender] = useState(initial.babyGender);

  function toggleInstitution(id: string) {
    const on = instIds.includes(id);
    setInstIds(on ? instIds.filter((x) => x !== id) : [...instIds, id]);
    // לכל מוסד יש מדווח/ת קבוע/ה – ממלאים אוטומטית אם עוד לא נבחר/ה
    if (!on && !reporterId) {
      const first = institutions.find((i) => String(i.id) === id)?.reporters[0];
      if (first) setReporterId(String(first.id));
    }
  }

  const withReporters = institutions.filter((i) => i.reporters.length);

  return (
    <form action={formAction} className="space-y-5" noValidate>
      {initial.id ? <input type="hidden" name="id" value={initial.id} /> : null}

      {state.message && !state.ok ? (
        <div role="alert" className="rounded-xl border border-blush-200 bg-blush-50 px-4 py-3 text-blush-700">
          {state.message}
        </div>
      ) : null}

      {/* החובה: שם וטלפון */}
      <section className="card border-brand-200 p-5 sm:p-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="שם מלא" name="fullName" error={err.fullName} required>
            <input id="fullName" name="fullName" className="input text-lg" defaultValue={v("fullName")} autoComplete="off" autoFocus={!isEdit} aria-invalid={!!err.fullName} />
          </Field>
          <Field label="טלפון" name="phone" error={err.phone} required>
            <input id="phone" name="phone" type="tel" inputMode="tel" dir="ltr" className="input text-right text-lg" placeholder="050-0000000" defaultValue={v("phone")} aria-invalid={!!err.phone} />
          </Field>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <SaveButton pending={pending} isEdit={isEdit} />
          <p className="text-sm text-slate-500">רק שם וטלפון חובה. את השאר אפשר להשלים עכשיו או אחר כך.</p>
        </div>
      </section>

      <Section title="כתובת" icon="📍">
        <div className="grid gap-4 sm:grid-cols-6">
          <Field label="רחוב" name="street" className="sm:col-span-3">
            <input id="street" name="street" className="input" defaultValue={v("street")} />
          </Field>
          <Field label="מספר" name="houseNumber" className="sm:col-span-1">
            <input id="houseNumber" name="houseNumber" className="input" defaultValue={v("houseNumber")} />
          </Field>
          <Field label="דירה / קומה" name="apartment" className="sm:col-span-2">
            <input id="apartment" name="apartment" className="input" placeholder="קומה 2, דירה 5" defaultValue={v("apartment")} />
          </Field>
          <Field label="עיר" name="city" className="sm:col-span-2">
            <input id="city" name="city" className="input" defaultValue={v("city")} />
          </Field>
          <Field label="הכוונה לכתובת" name="addressNotes" className="sm:col-span-4">
            <input id="addressNotes" name="addressNotes" className="input" placeholder="כניסה מאחור, קוד לבניין…" defaultValue={v("addressNotes")} />
          </Field>
        </div>
      </Section>

      <Section title="העדפות" icon="💗" hint="מה חשוב לדעת כשמביאים ארוחה או עוזרים">
        <textarea id="preferences" name="preferences" rows={3} className="input" placeholder="צמחונית, בלי אגוזים, עדיף להגיע אחרי 16:00, להשאיר ליד הדלת…" defaultValue={v("preferences")} />
      </Section>

      <Section title="מוסדות ומדווח/ת" icon="🏫">
        {institutions.length === 0 ? (
          <p className="text-sm text-slate-500">
            עדיין אין מוסדות.{" "}
            <Link href="/institutions" className="font-medium text-brand-700 underline">להוספת מוסדות</Link>
          </p>
        ) : (
          <>
            <p className="label">המוסדות שבהם לומדים הילדים (אפשר לבחור כמה)</p>
            <div className="flex flex-wrap gap-2">
              {institutions.map((i) => {
                const id = String(i.id);
                const on = instIds.includes(id);
                return (
                  <label key={i.id} className="cursor-pointer">
                    <input type="checkbox" name="institutionIds" value={id} checked={on} onChange={() => toggleInstitution(id)} className="peer sr-only" />
                    <span className={"block rounded-xl border px-3 py-2 text-sm font-medium transition peer-focus-visible:ring-4 peer-focus-visible:ring-brand-100 " + (on ? "border-brand-600 bg-brand-700 text-white" : "border-slate-300 bg-white text-slate-600 hover:bg-slate-50")}>
                      {on ? "✓ " : ""}
                      {i.name}
                    </span>
                  </label>
                );
              })}
            </div>
            <div className="mt-4 max-w-sm">
              <label htmlFor="reporterId" className="label">מי דיווח/ה</label>
              <select id="reporterId" name="reporterId" className="input" value={reporterId} onChange={(e) => setReporterId(e.target.value)}>
                <option value="">— לא צוין —</option>
                {withReporters.map((i) => (
                  <optgroup key={i.id} label={i.name}>
                    {i.reporters.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.name}
                        {r.role ? ` · ${r.role}` : ""}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </div>
          </>
        )}
      </Section>

      <Section title="הלידה" icon="👶">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="תאריך לידה" name="birthDate" error={err.birthDate}>
            <input id="birthDate" name="birthDate" type="date" className="input" defaultValue={v("birthDate")} />
          </Field>
          <fieldset>
            <legend className="label">מין הנולד/ת</legend>
            <input type="hidden" name="babyGender" value={gender} />
            <div className="grid grid-cols-3 gap-2">
              {(["BOY", "GIRL", "TWINS"] as const).map((g) => {
                const on = gender === g;
                const color = { BOY: "border-brand-500 bg-brand-50 text-brand-800", GIRL: "border-blush-400 bg-blush-50 text-blush-700", TWINS: "border-gold-400 bg-gold-50 text-gold-700" }[g];
                return (
                  <button key={g} type="button" aria-pressed={on} onClick={() => setGender(on ? "" : g)} className={"rounded-xl border px-3 py-2.5 font-medium transition " + (on ? color : "border-slate-300 bg-white text-slate-600 hover:bg-slate-50")}>
                    {genderLabel[g]}
                  </button>
                );
              })}
            </div>
          </fieldset>
        </div>
      </Section>

      <Section title="הערות" icon="📝">
        <textarea id="notes" name="notes" rows={2} className="input" placeholder="מספר ילדים, מצב כללי, כל דבר אחר…" defaultValue={v("notes")} />
      </Section>

      <div className="flex flex-wrap items-center gap-3">
        <SaveButton pending={pending} isEdit={isEdit} />
        <Link href="/yoldot" className="btn-secondary">ביטול</Link>
      </div>
    </form>
  );
}

function SaveButton({ pending, isEdit }: { pending: boolean; isEdit: boolean }) {
  return (
    <button type="submit" className="btn-primary min-w-36" disabled={pending}>
      {pending ? "שומר…" : isEdit ? "שמירת שינויים" : "שמירה"}
    </button>
  );
}

function Section({ title, icon, hint, children }: { title: string; icon: string; hint?: string; children: React.ReactNode }) {
  return (
    <section className="card p-5 sm:p-6">
      <div className="mb-4 flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-brand-900">
          <span aria-hidden>{icon}</span>
          {title}
        </h2>
        {hint ? <p className="text-sm text-slate-500">{hint}</p> : null}
      </div>
      {children}
    </section>
  );
}

function Field({ label, name, error, required, className, children }: { label: string; name: string; error?: string; required?: boolean; className?: string; children: React.ReactNode }) {
  return (
    <div className={className}>
      <label htmlFor={name} className="label">
        {label} {required ? <span className="text-blush-600">*</span> : null}
      </label>
      {children}
      {error ? <p className="mt-1.5 text-sm text-blush-700">{error}</p> : null}
    </div>
  );
}
