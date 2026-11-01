"use client";

import { useState } from "react";
import type { InstitutionType } from "@prisma/client";
import { InstitutionForm, ReporterForm } from "./InstitutionForms";
import ConfirmButton from "./ConfirmButton";
import { deleteInstitution, deleteReporter, toggleInstitution, toggleReporter } from "@/app/actions";
import { institutionTypeLabel } from "@/lib/labels";
import { fmtPhone } from "@/lib/format";

export type InstitutionWithReporters = {
  id: number;
  name: string;
  type: InstitutionType;
  notes: string | null;
  isActive: boolean;
  yoldotCount: number;
  reporters: { id: number; name: string; role: string | null; phone: string | null; isActive: boolean; yoldotCount: number }[];
};

export default function InstitutionCard({ inst }: { inst: InstitutionWithReporters }) {
  const [editing, setEditing] = useState(false);
  return (
    <li className={"card p-5 " + (inst.isActive ? "" : "opacity-60")}>
      {editing ? (
        <InstitutionForm initial={inst} onDone={() => setEditing(false)} />
      ) : (
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-lg font-semibold text-brand-900">{inst.name}</h2>
              <span className="rounded-full bg-brand-50 px-2.5 py-0.5 text-xs font-medium text-brand-700">
                {institutionTypeLabel[inst.type]}
              </span>
              {!inst.isActive ? <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs text-slate-500">לא פעיל</span> : null}
            </div>
            <p className="mt-0.5 text-sm text-slate-500">
              {inst.yoldotCount} יולדות משויכות{inst.notes ? ` · ${inst.notes}` : ""}
            </p>
          </div>
          <div className="flex gap-1">
            <button type="button" className="btn-ghost" onClick={() => setEditing(true)}>עריכה</button>
            <form action={toggleInstitution}>
              <input type="hidden" name="id" value={inst.id} />
              <button className="btn-ghost">{inst.isActive ? "השבתה" : "הפעלה"}</button>
            </form>
            {inst.yoldotCount === 0 ? (
              <form action={deleteInstitution}>
                <input type="hidden" name="id" value={inst.id} />
                <ConfirmButton message={`למחוק את ${inst.name} ואת המדווחים שלו?`} className="btn-danger">מחיקה</ConfirmButton>
              </form>
            ) : null}
          </div>
        </div>
      )}

      <div className="mt-4 rounded-xl bg-slate-50 p-3">
        <h3 className="mb-2 text-sm font-semibold text-slate-700">מדווחים</h3>
        {inst.reporters.length === 0 ? (
          <p className="text-sm text-slate-400">עדיין אין מדווח/ת קבוע/ה.</p>
        ) : (
          <ul className="divide-y divide-slate-200/70">
            {inst.reporters.map((r) => (
              <li key={r.id} className={"flex flex-wrap items-center justify-between gap-2 py-2 " + (r.isActive ? "" : "opacity-50")}>
                <span className="text-sm">
                  <span className="font-medium text-slate-800">{r.name}</span>
                  {r.role ? <span className="text-slate-500"> · {r.role}</span> : null}
                  {r.phone ? (
                    <a href={`tel:${r.phone}`} dir="ltr" className="ms-2 text-brand-700 hover:underline">{fmtPhone(r.phone)}</a>
                  ) : null}
                  <span className="ms-2 text-xs text-slate-400">({r.yoldotCount} דיווחים)</span>
                </span>
                <span className="flex gap-1">
                  <form action={toggleReporter}>
                    <input type="hidden" name="id" value={r.id} />
                    <button className="btn-ghost py-1 text-xs">{r.isActive ? "השבתה" : "הפעלה"}</button>
                  </form>
                  {r.yoldotCount === 0 ? (
                    <form action={deleteReporter}>
                      <input type="hidden" name="id" value={r.id} />
                      <ConfirmButton message={`למחוק את ${r.name}?`} className="btn-danger py-1 text-xs">מחיקה</ConfirmButton>
                    </form>
                  ) : null}
                </span>
              </li>
            ))}
          </ul>
        )}
        <ReporterForm institutionId={inst.id} />
      </div>
    </li>
  );
}
