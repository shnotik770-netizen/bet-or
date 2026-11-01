// נתוני דוגמה לפיתוח: npm run db:seed
import { PrismaClient, type InstitutionType } from "@prisma/client";

const db = new PrismaClient();

const institutions: { name: string; type: InstitutionType; reporters: { name: string; role: string }[] }[] = [
  { name: "גן חב״ד ״אור מנחם״", type: "KINDERGARTEN", reporters: [{ name: "חיה לוי", role: "גננת" }] },
  { name: "תלמוד תורה חב״ד עפולה", type: "TALMUD_TORAH", reporters: [{ name: "הרב שניאור כהן", role: "מנהל" }, { name: "רבקה פרידמן", role: "מזכירה" }] },
  { name: "בית ספר בנות מנחם", type: "GIRLS_SCHOOL", reporters: [{ name: "מושקא גולדברג", role: "מנהלת" }] },
  { name: "בית חב״ד עפולה עילית", type: "CHABAD_HOUSE", reporters: [{ name: "דבורה שוורץ", role: "שלוחה" }] },
];

async function main() {
  for (const i of institutions) {
    await db.institution.upsert({
      where: { name: i.name },
      update: {},
      create: { name: i.name, type: i.type, reporters: { create: i.reporters } },
    });
  }
  console.log(`נוספו ${institutions.length} מוסדות לדוגמה`);
}

main().finally(() => db.$disconnect());
