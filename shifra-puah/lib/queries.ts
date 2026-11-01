import { db } from "./db";
import type { InstitutionOption } from "@/components/YoledetForm";
import { addDays, toDate, todayIL } from "./dates";

/** מוסדות ומדווחים פעילים לטופס. keep = מזהים שחייבים להופיע גם אם הושבתו (בעריכה) */
export async function institutionOptions(keep?: { institutionIds: number[]; reporterId: number | null }): Promise<InstitutionOption[]> {
  const list = await db.institution.findMany({
    where: { OR: [{ isActive: true }, { id: { in: keep?.institutionIds ?? [] } }] },
    orderBy: { name: "asc" },
    include: {
      reporters: {
        where: { OR: [{ isActive: true }, { id: keep?.reporterId ?? -1 }] },
        orderBy: { name: "asc" },
        select: { id: true, name: true, role: true },
      },
    },
  });
  return list.map(({ id, name, reporters }) => ({ id, name, reporters }));
}

/** יולדות לבחירה בשיבוץ: נרשמו או ילדו ב-4 החודשים האחרונים */
export async function recentYoldot() {
  const since = toDate(addDays(todayIL(), -120));
  return db.yoledet.findMany({
    where: { OR: [{ createdAt: { gte: since } }, { birthDate: { gte: since } }] },
    orderBy: { fullName: "asc" },
    select: { id: true, fullName: true, street: true, houseNumber: true },
  });
}
