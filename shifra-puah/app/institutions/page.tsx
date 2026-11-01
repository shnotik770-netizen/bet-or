import PageTitle from "@/components/PageTitle";
import InstitutionCard from "@/components/InstitutionCard";
import { InstitutionForm } from "@/components/InstitutionForms";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";
export const metadata = { title: "מוסדות ומדווחים · שפרה ופועה" };

export default async function InstitutionsPage() {
  const list = await db.institution.findMany({
    orderBy: [{ isActive: "desc" }, { name: "asc" }],
    include: {
      _count: { select: { yoldot: true } },
      reporters: { orderBy: [{ isActive: "desc" }, { name: "asc" }], include: { _count: { select: { yoldot: true } } } },
    },
  });

  return (
    <div>
      <PageTitle title="מוסדות ומדווחים" subtitle="כל יולדת נרשמת תחת מוסד ותחת המדווח/ת מאותו מוסד. מוסד או מדווח/ת עם דיווחים אי אפשר למחוק, רק להשבית." />
      <section className="card mb-6 border-gold-200 bg-gold-50/40 p-5">
        <h2 className="mb-3 font-semibold text-brand-900">הוספת מוסד</h2>
        <InstitutionForm />
      </section>
      {list.length === 0 ? (
        <p className="card px-5 py-10 text-center text-slate-500">עדיין אין מוסדות</p>
      ) : (
        <ul className="grid gap-4 lg:grid-cols-2">
          {list.map((i) => (
            <InstitutionCard
              key={i.id}
              inst={{
                id: i.id,
                name: i.name,
                type: i.type,
                notes: i.notes,
                isActive: i.isActive,
                yoldotCount: i._count.yoldot,
                reporters: i.reporters.map((r) => ({
                  id: r.id,
                  name: r.name,
                  role: r.role,
                  phone: r.phone,
                  isActive: r.isActive,
                  yoldotCount: r._count.yoldot,
                })),
              }}
            />
          ))}
        </ul>
      )}
    </div>
  );
}
