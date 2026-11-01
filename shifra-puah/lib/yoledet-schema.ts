import { z } from "zod";
import { isISODate } from "./dates";

const isoDate = (msg: string) => z.string().trim().refine(isISODate, msg);
const optionalText = z
  .string()
  .trim()
  .max(1000)
  .transform((s) => (s === "" ? null : s));

export const yoledetSchema = z
  .object({
    fullName: z.string().trim().min(2, "נא למלא שם מלא").max(120),
    phone: z
      .string()
      .trim()
      .transform((s) => s.replace(/[\s-]/g, ""))
      .refine((s) => /^(\+972|0)\d{8,9}$/.test(s), "מספר טלפון לא תקין"),
    street: z.string().trim().min(2, "נא למלא רחוב").max(120),
    houseNumber: z.string().trim().min(1, "נא למלא מספר בית").max(20),
    apartment: optionalText,
    city: z.string().trim().min(2, "נא למלא עיר").max(60),
    addressNotes: optionalText,
    institutionId: z.coerce.number({ message: "נא לבחור מוסד" }).int().positive("נא לבחור מוסד"),
    reporterId: z.coerce.number({ message: "נא לבחור מדווח/ת" }).int().positive("נא לבחור מדווח/ת"),
    birthDate: isoDate("נא לבחור תאריך לידה"),
    babyGender: z.enum(["BOY", "GIRL", "TWINS"], { message: "נא לבחור מין הנולד/ת" }),
    notes: optionalText,
    serviceStartDate: isoDate("נא לבחור תאריך התחלה"),
    serviceEndDate: isoDate("נא לבחור תאריך סיום"),
    serviceDays: z
      .array(z.enum(["SUNDAY", "MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY"]))
      .min(1, "נא לבחור לפחות יום אחד"),
    helpType: z.enum(["MEAL", "HELP", "BOTH"]),
  })
  .refine((v) => v.serviceEndDate >= v.serviceStartDate, {
    path: ["serviceEndDate"],
    message: "תאריך הסיום לפני תאריך ההתחלה",
  });

export type YoledetInput = z.infer<typeof yoledetSchema>;

export type FormState = {
  ok: boolean;
  message?: string;
  errors?: Partial<Record<string, string>>;
  /** הערכים שנשלחו, כדי למלא את הטופס מחדש אחרי שגיאה */
  values?: Record<string, string | string[]>;
};
