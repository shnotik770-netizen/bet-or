"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { isISODate, toDate, weekdayOf } from "@/lib/dates";
import { addressSchema, optionalText, yoledetSchema, type FormState } from "@/lib/yoledet-schema";
import { AUTH_COOKIE, roleToken } from "@/lib/auth";
import { requireAdmin, requireSignedIn } from "@/lib/session";

function fieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "form");
    out[key] ??= issue.message;
  }
  return out;
}

function formValues(formData: FormData): Record<string, string | string[]> {
  const out: Record<string, string | string[]> = {};
  for (const key of new Set(formData.keys())) {
    if (key.startsWith("$")) continue;
    const all = formData.getAll(key).map(String);
    out[key] = key === "institutionIds" ? all : all[0];
  }
  return out;
}

function revalidateAll() {
  revalidatePath("/", "layout");
}

/* ---------- יולדות ---------- */

/** אם הוזן רחוב בלי עיר – עפולה */
function withDefaultCity(a: { street: string | null; city: string | null }) {
  return a.city ?? (a.street ? "עפולה" : null);
}

function yoledetData(formData: FormData) {
  return yoledetSchema.safeParse({
    ...Object.fromEntries(formData),
    institutionIds: formData.getAll("institutionIds"),
  });
}

async function writeYoledet(id: number | null, formData: FormData) {
  const parsed = yoledetData(formData);
  if (!parsed.success) return { error: fieldErrors(parsed.error) };
  const { institutionIds, birthDate, ...v } = parsed.data;
  const data = {
    ...v,
    city: withDefaultCity(v),
    birthDate: birthDate ? toDate(birthDate) : null,
    institutions: { set: institutionIds.map((iid) => ({ id: iid })) },
  };
  const y = id
    ? await db.yoledet.update({ where: { id }, data })
    : await db.yoledet.create({ data: { ...data, institutions: { connect: data.institutions.set } } });
  return { yoledet: y };
}

/** טופס יולדת מלא (הוספה או עריכה) */
export async function saveYoledet(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin();
  const id = Number(formData.get("id")) || null;
  const r = await writeYoledet(id, formData);
  if (r.error) return { ok: false, message: "יש שדות שצריך לתקן", errors: r.error, values: formValues(formData) };
  revalidateAll();
  redirect(`/yoldot?saved=${r.yoledet!.id}`);
}

/** הוספה מהירה: שם וטלפון בלבד, נשארים באותו דף */
export async function quickAddYoledet(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin();
  const r = await writeYoledet(null, formData);
  if (r.error) return { ok: false, errors: r.error, values: formValues(formData) };
  revalidateAll();
  return { ok: true, message: `${r.yoledet!.fullName} נוספה`, values: { id: String(r.yoledet!.id) } };
}

export async function deleteYoledet(formData: FormData) {
  await requireAdmin();
  const id = Number(formData.get("id"));
  if (id) await db.yoledet.delete({ where: { id } }).catch(() => null);
  revalidateAll();
}

/** עדכון כתובת – פתוח גם למתנדבות */
export async function updateAddress(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireSignedIn();
  const id = Number(formData.get("id"));
  const parsed = addressSchema.safeParse(Object.fromEntries(formData));
  if (!id || !parsed.success) return { ok: false, message: "לא הצלחנו לשמור" };
  await db.yoledet.update({ where: { id }, data: { ...parsed.data, city: withDefaultCity(parsed.data) } });
  revalidateAll();
  return { ok: true, message: "הכתובת עודכנה" };
}

/* ---------- שיבוץ בסדר היום ---------- */

const visitSchema = z.object({
  yoledetId: z.coerce.number().int().positive({ message: "נא לבחור יולדת" }),
  date: z
    .string()
    .refine(isISODate, "נא לבחור תאריך")
    .refine((d) => weekdayOf(d) !== null, "זה יום שבת – ארוחות שבת משבצים ביום שישי"),
  note: optionalText(200),
});

export async function addVisit(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin();
  const parsed = visitSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, errors: fieldErrors(parsed.error) };
  const { yoledetId, date, note } = parsed.data;
  await db.visit.upsert({
    where: { yoledetId_date: { yoledetId, date: toDate(date) } },
    update: { note },
    create: { yoledetId, date: toDate(date), note },
  });
  revalidateAll();
  return { ok: true, message: "שובץ" };
}

export async function deleteVisit(formData: FormData) {
  await requireAdmin();
  const id = Number(formData.get("id"));
  if (id) await db.visit.delete({ where: { id } }).catch(() => null);
  revalidateAll();
}

/* ---------- מוסדות ---------- */

const institutionSchema = z.object({
  name: z.string().trim().min(2, "נא למלא שם מוסד").max(120),
  type: z.enum(["KINDERGARTEN", "TALMUD_TORAH", "GIRLS_SCHOOL", "CHABAD_HOUSE", "OTHER"]),
  notes: z
    .string()
    .trim()
    .max(500)
    .optional()
    .transform((s) => (s ? s : null)),
});

export async function saveInstitution(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin();
  const parsed = institutionSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, errors: fieldErrors(parsed.error) };
  const id = Number(formData.get("id")) || null;
  try {
    if (id) await db.institution.update({ where: { id }, data: parsed.data });
    else await db.institution.create({ data: parsed.data });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return { ok: false, errors: { name: "כבר קיים מוסד בשם הזה" } };
    }
    throw e;
  }
  revalidateAll();
  return { ok: true, message: id ? "המוסד עודכן" : "המוסד נוסף" };
}

export async function toggleInstitution(formData: FormData) {
  await requireAdmin();
  const id = Number(formData.get("id"));
  const inst = await db.institution.findUnique({ where: { id } });
  if (inst) await db.institution.update({ where: { id }, data: { isActive: !inst.isActive } });
  revalidateAll();
}

export async function deleteInstitution(formData: FormData) {
  await requireAdmin();
  const id = Number(formData.get("id"));
  // מחיקה רק כשאין יולדות משויכות למוסד; אחרת מסמנים "לא פעיל"
  const count = await db.yoledet.count({ where: { institutions: { some: { id } } } });
  if (count === 0) {
    await db.$transaction([
      db.reporter.deleteMany({ where: { institutionId: id } }),
      db.institution.delete({ where: { id } }),
    ]);
  }
  revalidateAll();
}

/* ---------- מדווחים ---------- */

const reporterSchema = z.object({
  institutionId: z.coerce.number().int().positive(),
  name: z.string().trim().min(2, "נא למלא שם").max(120),
  role: z
    .string()
    .trim()
    .max(60)
    .optional()
    .transform((s) => (s ? s : null)),
  phone: z
    .string()
    .trim()
    .max(20)
    .optional()
    .transform((s) => (s ? s.replace(/[\s-]/g, "") : null)),
});

export async function saveReporter(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin();
  const parsed = reporterSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, errors: fieldErrors(parsed.error) };
  try {
    await db.reporter.create({ data: parsed.data });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return { ok: false, errors: { name: "כבר קיים/ת מדווח/ת בשם הזה במוסד" } };
    }
    throw e;
  }
  revalidateAll();
  return { ok: true, message: "המדווח/ת נוסף/ה" };
}

export async function toggleReporter(formData: FormData) {
  await requireAdmin();
  const id = Number(formData.get("id"));
  const r = await db.reporter.findUnique({ where: { id } });
  if (r) await db.reporter.update({ where: { id }, data: { isActive: !r.isActive } });
  revalidateAll();
}

export async function deleteReporter(formData: FormData) {
  await requireAdmin();
  const id = Number(formData.get("id"));
  const count = await db.yoledet.count({ where: { reporterId: id } });
  if (count === 0) await db.reporter.delete({ where: { id } }).catch(() => null);
  revalidateAll();
}

/* ---------- כניסה ---------- */

export async function login(_prev: FormState, formData: FormData): Promise<FormState> {
  const given = String(formData.get("password") ?? "");
  const admin = process.env.APP_PASSWORD;
  const vol = process.env.VOLUNTEER_PASSWORD;
  const role = admin && given === admin ? "admin" : vol && given === vol ? "volunteer" : null;
  if (!role) return { ok: false, message: "סיסמה שגויה" };
  (await cookies()).set(AUTH_COOKIE, await roleToken(role, given), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 180,
  });
  if (role === "volunteer") redirect("/volunteers");
  const next = String(formData.get("next") ?? "/");
  redirect(next.startsWith("/") && !next.startsWith("//") ? next : "/");
}

export async function logout() {
  (await cookies()).delete(AUTH_COOKIE);
  redirect("/login");
}
