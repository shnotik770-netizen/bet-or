import Link from "next/link";
import { groupLabel, RECENT_DAYS, type Group } from "@/lib/recent";

const styles: Record<Group, { card: string; num: string }> = {
  none: { card: "border-blush-200 bg-blush-50", num: "text-blush-700" },
  once: { card: "border-gold-200 bg-gold-50", num: "text-gold-700" },
  multi: { card: "border-brand-200 bg-brand-50", num: "text-brand-800" },
};

/** שלושת המונים: ילדו ב-30 יום ולא שובצו / פעם אחת / 2 ומעלה */
export default function RecentGroups({ counts, active }: { counts: Record<Group, number>; active?: Group | null }) {
  return (
    <section>
      <h2 className="mb-2 text-sm font-semibold text-slate-600">ילדו ב-{RECENT_DAYS} הימים האחרונים</h2>
      <div className="grid grid-cols-3 gap-3">
        {(["none", "once", "multi"] as const).map((g) => {
          const on = active === g;
          return (
            <Link
              key={g}
              href={on ? "/yoldot" : `/yoldot?group=${g}`}
              aria-current={on ? "true" : undefined}
              className={
                "card px-3 py-4 text-center transition hover:shadow " +
                styles[g].card +
                (on ? " ring-2 ring-brand-500" : active ? " opacity-60" : "")
              }
            >
              <div className={"text-3xl font-bold " + styles[g].num}>{counts[g]}</div>
              <div className="text-xs text-slate-600 sm:text-sm">{groupLabel[g]}</div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
