"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { toDate } from "@/lib/dates";
import { yoledetSchema, type FormState } from "@/lib/yoledet-schema";
import { AUTH_COOKIE, passwordToken } from "@/lib/auth";

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
    out[key] = key === "serviceDays" ? all : all[0];
  }
  return out;
}

function revalidateAll() {
  revalidatePath("/", "layout");
}

/* ---------- יולדות ---------- */

export async function saveYoledet(_prev: FormState, formData: FormData): Promise<FormState> {
  const raw = Object.fromEntries(formData);
  const parsed = yoledetSchema.safeParse({ ...raw, serviceDays: formData.getAll("serviceDays") });
  if (!parsed.success) {
    return { ok: false, message: "יש שדות שצריך לתקן", errors: fieldErrors(parsed.error), values: formValues(formData) };
  }
  const v = parsed.data;

  // המדווח/ת חייב/ת להיות שייך/ת למוסד שנבחר
  const reporter = await db.reporter.findUnique({ where: { id: v.reporterId } });
  if (!reporter || reporter.institutionId !== v.institutionId) {
    return { ok: false, message: "יש שדות שצריך לתקן", errors: { reporterId: "המדווח/ת לא שייך/ת למוסד שנבחר" }, values: formValues(formData) };
  }

  const data = {
    ...v,
    birthDate: toDate(v.birthDate),
    serviceStartDate: toDate(v.serviceStartDate),
    serviceEndDate: toDate(v.serviceEndDate),
  };

  const id = Number(formData.get("id")) || null;
  if (id) {
    await db.yoledet.update({ where: { id }, data });
  } else {
    await db.yoledet.create({ data });
  }
  revalidateAll();
  redirect(`/yoldot?saved=${encodeURIComponent(v.fullName)}`);
}

export async function deleteYoledet(formData: FormData) {
  const id = Number(formData.get("id"));
  if (id) await db.yoledet.delete({ where: { id } }).catch(() => null);
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
  const id = Number(formData.get("id"));
  const inst = await db.institution.findUnique({ where: { id } });
  if (inst) await db.institution.update({ where: { id }, data: { isActive: !inst.isActive } });
  revalidateAll();
}

export async function deleteInstitution(formData: FormData) {
  const id = Number(formData.get("id"));
  // מחיקה רק כשאין יולדות רשומות תחת המוסד; אחרת מסמנים "לא פעיל"
  const count = await db.yoledet.count({ where: { institutionId: id } });
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
  const id = Number(formData.get("id"));
  const r = await db.reporter.findUnique({ where: { id } });
  if (r) await db.reporter.update({ where: { id }, data: { isActive: !r.isActive } });
  revalidateAll();
}

export async function deleteReporter(formData: FormData) {
  const id = Number(formData.get("id"));
  const count = await db.yoledet.count({ where: { reporterId: id } });
  if (count === 0) await db.reporter.delete({ where: { id } }).catch(() => null);
  revalidateAll();
}

/* ---------- כניסה ---------- */

export async function login(_prev: FormState, formData: FormData): Promise<FormState> {
  const expected = process.env.APP_PASSWORD;
  const given = String(formData.get("password") ?? "");
  if (!expected || given !== expected) return { ok: false, message: "סיסמה שגויה" };
  const jar = await cookies();
  jar.set(AUTH_COOKIE, await passwordToken(expected), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 90,
  });
  const next = String(formData.get("next") ?? "/");
  redirect(next.startsWith("/") && !next.startsWith("//") ? next : "/");
}

export async function logout() {
  (await cookies()).delete(AUTH_COOKIE);
  redirect("/login");
}
