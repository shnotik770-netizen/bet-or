"use client";

import { useActionState, useMemo, useState } from "react";
import Link from "next/link";
import type { Weekday } from "@prisma/client";
import { saveYoledet } from "@/app/actions";
import type { FormState } from "@/lib/yoledet-schema";
import { WEEKDAYS, weekdayLabel, genderLabel, helpTypeLabel } from "@/lib/labels";
import { addDays } from "@/lib/dates";

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
  institutionId: string;
  reporterId: string;
  birthDate: string;
  babyGender: string;
  notes: string;
  serviceStartDate: string;
  serviceEndDate: string;
  serviceDays: Weekday[];
  helpType: string;
};

/** כמה ימים מגיעות המתנדבות כברירת מחדל (כולל יום ההתחלה) */
const DEFAULT_SERVICE_DAYS = 14;

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
  const sent = state.values;
  const v = (k: keyof YoledetFormValues) => {
    const s = sent?.[k];
    return typeof s === "string" ? s : String(initial[k] ?? "");
  };
  const err = state.errors ?? {};

  // שדות שתלויים זה בזה מנוהלים ב-state
  const [institutionId, setInstitutionId] = useState(initial.institutionId);
  const [reporterId, setReporterId] = useState(initial.reporterId);
  const [birthDate, setBirthDate] = useState(initial.birthDate);
  const [startDate, setStartDate] = useState(initial.serviceStartDate);
  const [endDate, setEndDate] = useState(initial.serviceEndDate);
  const [datesTouched, setDatesTouched] = useState(isEdit);
  const [days, setDays] = useState<Weekday[]>(initial.serviceDays);

  const reporters = useMemo(
    () => institutions.find((i) => String(i.id) === institutionId)?.reporters ?? [],
    [institutions, institutionId],
  );

  function onInstitutionChange(id: string) {
    setInstitutionId(id);
    const list = institutions.find((i) => String(i.id) === id)?.reporters ?? [];
    setReporterId(list.length === 1 ? String(list[0].id) : "");
  }

  function onBirthDateChange(d: string) {
    setBirthDate(d);
    if (!datesTouched && d) {
      setStartDate(d);
      setEndDate(addDays(d, DEFAULT_SERVICE_DAYS - 1));
    }
  }

  function onStartChange(d: string) {
    setDatesTouched(true);
    // שומרים על אורך התקופה
    if (d && startDate && endDate) {
      const len = (Date.parse(endDate) - Date.parse(startDate)) / 86400000;
      setEndDate(addDays(d, Math.max(0, len)));
    }
    setStartDate(d);
  }

  function toggleDay(d: Weekday) {
    setDays((cur) => (cur.includes(d) ? cur.filter((x) => x !== d) : WEEKDAYS.filter((w) => w === d || cur.includes(w))));
  }

  return (
    <form action={formAction} className="space-y-6" noValidate>
      {initial.id ? <input type="hidden" name="id" value={initial.id} /> : null}

      {state.message && !state.ok ? (
        <div role="alert" className="rounded-xl border border-blush-200 bg-blush-50 px-4 py-3 text-blush-700">
          {state.message}
        </div>
      ) : null}

      {/* פרטי היולדת */}
      <Section title="פרטי היולדת" icon="👤">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="שם מלא" name="fullName" error={err.fullName} required>
            <input id="fullName" name="fullName" className="input" defaultValue={v("fullName")} autoComplete="off" aria-invalid={!!err.fullName} />
          </Field>
          <Field label="טלפון" name="phone" error={err.phone} required>
            <input id="phone" name="phone" type="tel" inputMode="tel" dir="ltr" className="input text-right" placeholder="050-0000000" defaultValue={v("phone")} aria-invalid={!!err.phone} />
          </Field>
        </div>
      </Section>

      {/* כתובת */}
      <Section title="כתובת מלאה" icon="📍" hint="לכאן יגיעו המתנדבות">
        <div className="grid gap-4 sm:grid-cols-6">
          <Field label="רחוב" name="street" error={err.street} required className="sm:col-span-3">
            <input id="street" name="street" className="input" defaultValue={v("street")} aria-invalid={!!err.street} />
          </Field>
          <Field label="מספר בית" name="houseNumber" error={err.houseNumber} required className="sm:col-span-1">
            <input id="houseNumber" name="houseNumber" className="input" defaultValue={v("houseNumber")} aria-invalid={!!err.houseNumber} />
          </Field>
          <Field label="דירה / קומה" name="apartment" className="sm:col-span-2">
            <input id="apartment" name="apartment" className="input" placeholder="לדוגמה: קומה 2, דירה 5" defaultValue={v("apartment")} />
          </Field>
          <Field label="עיר" name="city" error={err.city} required className="sm:col-span-2">
            <input id="city" name="city" className="input" defaultValue={v("city")} aria-invalid={!!err.city} />
          </Field>
          <Field label="הכוונה לכתובת" name="addressNotes" className="sm:col-span-4">
            <input id="addressNotes" name="addressNotes" className="input" placeholder="כניסה מאחור, קוד לבניין…" defaultValue={v("addressNotes")} />
          </Field>
        </div>
      </Section>

      {/* מוסד ומדווח */}
      <Section title="מוסד ומדווח/ת" icon="🏫">
        {institutions.length === 0 ? (
          <p className="rounded-xl bg-gold-50 px-4 py-3 text-gold-700">
            עדיין אין מוסדות במערכת.{" "}
            <Link href="/institutions" className="font-medium underline">
              להוספת מוסדות ומדווחים
            </Link>
          </p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="המוסד שבו לומדים הילדים" name="institutionId" error={err.institutionId} required>
              <select id="institutionId" name="institutionId" className="input" value={institutionId} onChange={(e) => onInstitutionChange(e.target.value)} aria-invalid={!!err.institutionId}>
                <option value="">בחירת מוסד…</option>
                {institutions.map((i) => (
                  <option key={i.id} value={i.id}>
                    {i.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="מדווח/ת" name="reporterId" error={err.reporterId} required>
              <select id="reporterId" name="reporterId" className="input" value={reporterId} onChange={(e) => setReporterId(e.target.value)} disabled={!institutionId} aria-invalid={!!err.reporterId}>
                <option value="">{institutionId ? (reporters.length ? "בחירת מדווח/ת…" : "אין מדווחים למוסד הזה") : "קודם בוחרים מוסד"}</option>
                {reporters.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                    {r.role ? ` · ${r.role}` : ""}
                  </option>
                ))}
              </select>
            </Field>
          </div>
        )}
      </Section>

      {/* הלידה */}
      <Section title="הלידה" icon="👶">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="תאריך לידה" name="birthDate" error={err.birthDate} required>
            <input id="birthDate" name="birthDate" type="date" className="input" value={birthDate} onChange={(e) => onBirthDateChange(e.target.value)} aria-invalid={!!err.birthDate} />
          </Field>
          <fieldset>
            <legend className="label">
              מין הנולד/ת <span className="text-blush-600">*</span>
            </legend>
            <div className="grid grid-cols-3 gap-2">
              {(["BOY", "GIRL", "TWINS"] as const).map((g) => (
                <label key={g} className="cursor-pointer">
                  <input type="radio" name="babyGender" value={g} defaultChecked={v("babyGender") === g} className="peer sr-only" />
                  <span
                    className={
                      "block rounded-xl border px-3 py-2.5 text-center font-medium transition peer-focus-visible:ring-4 peer-focus-visible:ring-brand-100 " +
                      {
                        BOY: "border-slate-300 text-slate-600 peer-checked:border-brand-500 peer-checked:bg-brand-50 peer-checked:text-brand-800",
                        GIRL: "border-slate-300 text-slate-600 peer-checked:border-blush-400 peer-checked:bg-blush-50 peer-checked:text-blush-700",
                        TWINS: "border-slate-300 text-slate-600 peer-checked:border-gold-400 peer-checked:bg-gold-50 peer-checked:text-gold-700",
                      }[g]
                    }
                  >
                    {genderLabel[g]}
                  </span>
                </label>
              ))}
            </div>
            {err.babyGender ? <p className="mt-1.5 text-sm text-blush-700">{err.babyGender}</p> : null}
          </fieldset>
        </div>
      </Section>

      {/* סידור מתנדבות */}
      <Section title="סידור מתנדבות" icon="🍲" hint="מופיע ב״סדר יום מתנדבות״ בימים שנבחרו, בתקופה שנבחרה">
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="מתאריך" name="serviceStartDate" error={err.serviceStartDate} required>
            <input id="serviceStartDate" name="serviceStartDate" type="date" className="input" value={startDate} onChange={(e) => onStartChange(e.target.value)} aria-invalid={!!err.serviceStartDate} />
          </Field>
          <Field label="עד תאריך" name="serviceEndDate" error={err.serviceEndDate} required>
            <input id="serviceEndDate" name="serviceEndDate" type="date" className="input" value={endDate} min={startDate || undefined} onChange={(e) => { setDatesTouched(true); setEndDate(e.target.value); }} aria-invalid={!!err.serviceEndDate} />
          </Field>
          <Field label="סוג הסיוע" name="helpType">
            <select id="helpType" name="helpType" className="input" defaultValue={v("helpType")}>
              {(["MEAL", "HELP", "BOTH"] as const).map((h) => (
                <option key={h} value={h}>
                  {helpTypeLabel[h]}
                </option>
              ))}
            </select>
          </Field>
        </div>
        <fieldset className="mt-4">
          <legend className="label">
            באילו ימים מגיעות <span className="text-blush-600">*</span>
          </legend>
          <div className="flex flex-wrap gap-2">
            {WEEKDAYS.map((d) => {
              const on = days.includes(d);
              return (
                <label key={d} className="cursor-pointer">
                  <input type="checkbox" name="serviceDays" value={d} checked={on} onChange={() => toggleDay(d)} className="peer sr-only" />
                  <span className={"block min-w-16 rounded-xl border px-3 py-2 text-center font-medium transition peer-focus-visible:ring-4 peer-focus-visible:ring-brand-100 " + (on ? "border-brand-600 bg-brand-700 text-white" : "border-slate-300 bg-white text-slate-600 hover:bg-slate-50")}>
                    {weekdayLabel[d]}
                  </span>
                </label>
              );
            })}
          </div>
          {err.serviceDays ? <p className="mt-1.5 text-sm text-blush-700">{err.serviceDays}</p> : null}
        </fieldset>
      </Section>

      {/* הערות */}
      <Section title="הערות" icon="📝">
        <textarea id="notes" name="notes" rows={3} className="input" placeholder="רגישויות במזון, מספר ילדים, בקשות מיוחדות…" defaultValue={v("notes")} />
      </Section>

      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" className="btn-primary min-w-40" disabled={pending}>
          {pending ? "שומר…" : isEdit ? "שמירת שינויים" : "רישום היולדת"}
        </button>
        <Link href="/yoldot" className="btn-secondary">
          ביטול
        </Link>
      </div>
    </form>
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

function Field({
  label,
  name,
  error,
  required,
  className,
  children,
}: {
  label: string;
  name: string;
  error?: string;
  required?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
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
