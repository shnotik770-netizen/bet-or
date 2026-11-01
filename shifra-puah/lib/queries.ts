import { db } from "./db";
import type { InstitutionOption } from "@/components/YoledetForm";

/** מוסדות ומדווחים פעילים לטופס. keep = מזהים שחייבים להופיע גם אם לא פעילים (בעריכה) */
export async function institutionOptions(keep?: { institutionId: number; reporterId: number }): Promise<InstitutionOption[]> {
  const list = await db.institution.findMany({
    where: { OR: [{ isActive: true }, { id: keep?.institutionId ?? -1 }] },
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
