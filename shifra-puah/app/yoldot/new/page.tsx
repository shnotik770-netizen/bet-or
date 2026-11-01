import YoledetForm from "@/components/YoledetForm";
import PageTitle from "@/components/PageTitle";
import { institutionOptions } from "@/lib/queries";

export const dynamic = "force-dynamic";
export const metadata = { title: "יולדת חדשה · שפרה ופועה" };

export default async function NewYoledetPage() {
  const institutions = await institutionOptions();
  return (
    <div className="mx-auto max-w-3xl">
      <PageTitle title="יולדת חדשה" subtitle="מזל טוב! מספיק שם וטלפון." />
      <YoledetForm
        institutions={institutions}
        initial={{
          fullName: "",
          phone: "",
          street: "",
          houseNumber: "",
          apartment: "",
          city: "עפולה",
          addressNotes: "",
          institutionIds: [],
          reporterId: "",
          birthDate: "",
          babyGender: "",
          preferences: "",
          notes: "",
        }}
      />
    </div>
  );
}
