import { notFound } from "next/navigation";
import YoledetForm from "@/components/YoledetForm";
import PageTitle from "@/components/PageTitle";
import VisitsEditor from "@/components/VisitsEditor";
import { institutionOptions } from "@/lib/queries";
import { db } from "@/lib/db";
import { toISO, todayIL } from "@/lib/dates";

export const dynamic = "force-dynamic";
export const metadata = { title: "עריכת יולדת · שפרה ופועה" };

export default async function EditYoledetPage({ params }: { params: Promise<{ id: string }> }) {
  const id = Number((await params).id);
  const y = Number.isInteger(id)
    ? await db.yoledet.findUnique({
        where: { id },
        include: { institutions: { select: { id: true } }, visits: { orderBy: { date: "asc" } } },
      })
    : null;
  if (!y) notFound();
  const institutionIds = y.institutions.map((i) => i.id);
  const institutions = await institutionOptions({ institutionIds, reporterId: y.reporterId });
  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <PageTitle title={y.fullName} subtitle="עריכת פרטים ושיבוץ בסדר היום" />
      <VisitsEditor
        yoledetId={y.id}
        today={todayIL()}
        visits={y.visits.map((v) => ({ id: v.id, date: toISO(v.date), note: v.note }))}
      />
      <YoledetForm
        institutions={institutions}
        initial={{
          id: y.id,
          fullName: y.fullName,
          phone: y.phone,
          street: y.street ?? "",
          houseNumber: y.houseNumber ?? "",
          apartment: y.apartment ?? "",
          city: y.city ?? "",
          addressNotes: y.addressNotes ?? "",
          institutionIds: institutionIds.map(String),
          reporterId: y.reporterId ? String(y.reporterId) : "",
          birthDate: y.birthDate ? toISO(y.birthDate) : "",
          babyGender: y.babyGender ?? "",
          preferences: y.preferences ?? "",
          notes: y.notes ?? "",
        }}
      />
    </div>
  );
}
