import YoledetForm from "@/components/YoledetForm";
import { institutionOptions } from "@/lib/queries";
import { addDays, todayIL } from "@/lib/dates";
import PageTitle from "@/components/PageTitle";

export const dynamic = "force-dynamic";
export const metadata = { title: "רישום יולדת · שפרה ופועה" };

export default async function NewYoledetPage() {
  const institutions = await institutionOptions();
  const today = todayIL();
  return (
    <div className="mx-auto max-w-3xl">
      <PageTitle title="רישום יולדת חדשה" subtitle="מזל טוב! ממלאים את הפרטים, והכתובת תופיע אוטומטית בסדר היום של המתנדבות." />
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
          institutionId: "",
          reporterId: "",
          birthDate: today,
          babyGender: "",
          notes: "",
          serviceStartDate: today,
          serviceEndDate: addDays(today, 13),
          serviceDays: ["SUNDAY", "MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY"],
          helpType: "MEAL",
        }}
      />
    </div>
  );
}
