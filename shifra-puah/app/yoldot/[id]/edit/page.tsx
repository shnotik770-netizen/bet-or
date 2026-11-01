import { notFound } from "next/navigation";
import YoledetForm from "@/components/YoledetForm";
import PageTitle from "@/components/PageTitle";
import { institutionOptions } from "@/lib/queries";
import { db } from "@/lib/db";
import { toISO } from "@/lib/dates";

export const dynamic = "force-dynamic";
export const metadata = { title: "עריכת יולדת · שפרה ופועה" };

export default async function EditYoledetPage({ params }: { params: Promise<{ id: string }> }) {
  const id = Number((await params).id);
  const y = Number.isInteger(id) ? await db.yoledet.findUnique({ where: { id } }) : null;
  if (!y) notFound();
  const institutions = await institutionOptions({ institutionId: y.institutionId, reporterId: y.reporterId });
  return (
    <div className="mx-auto max-w-3xl">
      <PageTitle title={`עריכת פרטים · ${y.fullName}`} />
      <YoledetForm
        institutions={institutions}
        initial={{
          id: y.id,
          fullName: y.fullName,
          phone: y.phone,
          street: y.street,
          houseNumber: y.houseNumber,
          apartment: y.apartment ?? "",
          city: y.city,
          addressNotes: y.addressNotes ?? "",
          institutionId: String(y.institutionId),
          reporterId: String(y.reporterId),
          birthDate: toISO(y.birthDate),
          babyGender: y.babyGender,
          notes: y.notes ?? "",
          serviceStartDate: toISO(y.serviceStartDate),
          serviceEndDate: toISO(y.serviceEndDate),
          serviceDays: y.serviceDays,
          helpType: y.helpType,
        }}
      />
    </div>
  );
}
