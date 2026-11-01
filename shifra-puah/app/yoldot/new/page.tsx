import YoledetForm from "@/components/YoledetForm";
import PageTitle from "@/components/PageTitle";
import { institutionOptions } from "@/lib/queries";

export const dynamic = "force-dynamic";
export const metadata = { title: "יולדת חדשה · שפרה ופועה" };

export default async function NewYoledetPage({
  searchParams,
}: {
  searchParams: Promise<{ fullName?: string; phone?: string; reporterId?: string }>;
}) {
  // מגיעים מההוספה המהירה עם מה שכבר הוקלד
  const sp = await searchParams;
  const institutions = await institutionOptions();
  const reporterId = sp.reporterId && /^\d+$/.test(sp.reporterId) ? sp.reporterId : "";
  const reporterInst = institutions.find((i) => i.reporters.some((r) => String(r.id) === reporterId));
  return (
    <div className="mx-auto max-w-3xl">
      <PageTitle title="יולדת חדשה" subtitle="מזל טוב! מספיק שם וטלפון." />
      <YoledetForm
        institutions={institutions}
        initial={{
          fullName: sp.fullName ?? "",
          phone: sp.phone ?? "",
          street: "",
          houseNumber: "",
          apartment: "",
          city: "עפולה",
          addressNotes: "",
          institutionIds: reporterInst ? [String(reporterInst.id)] : [],
          reporterId,
          birthDate: "",
          babyGender: "",
          preferences: "",
          notes: "",
        }}
      />
    </div>
  );
}
