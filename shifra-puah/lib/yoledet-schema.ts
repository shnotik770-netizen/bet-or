import { z } from "zod";
import { isISODate } from "./dates";

/** טקסט לא חובה: ריק → null */
export const optionalText = (max = 1000) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((s) => (s ? s : null));

export const phoneSchema = z
  .string()
  .trim()
  .transform((s) => s.replace(/[\s\-()]/g, ""))
  .refine((s) => /^(\+972|0)\d{8,9}$/.test(s), "מספר טלפון לא תקין");

export const addressSchema = z.object({
  street: optionalText(120),
  houseNumber: optionalText(20),
  apartment: optionalText(60),
  city: optionalText(60),
  addressNotes: optionalText(300),
});

// רק שם וטלפון חובה
export const yoledetSchema = addressSchema.extend({
  fullName: z.string().trim().min(2, "נא למלא שם").max(120),
  phone: phoneSchema,
  institutionIds: z.array(z.coerce.number().int().positive()).default([]),
  reporterId: z
    .string()
    .optional()
    .transform((s) => (s ? Number(s) : null))
    .refine((n) => n === null || (Number.isInteger(n) && n > 0)),
  birthDate: z
    .string()
    .trim()
    .optional()
    .refine((s) => !s || isISODate(s), "תאריך לא תקין")
    .transform((s) => (s ? s : null)),
  babyGender: z
    .enum(["BOY", "GIRL", "TWINS", ""])
    .optional()
    .transform((s) => (s ? s : null)),
  preferences: optionalText(),
  notes: optionalText(),
});

export type FormState = {
  ok: boolean;
  message?: string;
  errors?: Partial<Record<string, string>>;
  /** הערכים שנשלחו, כדי למלא את הטופס מחדש אחרי שגיאה */
  values?: Record<string, string | string[]>;
};
