import type { BabyGender, HelpType, InstitutionType, Weekday } from "@prisma/client";

export const WEEKDAYS: Weekday[] = ["SUNDAY", "MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY"];

export const weekdayLabel: Record<Weekday, string> = {
  SUNDAY: "ראשון",
  MONDAY: "שני",
  TUESDAY: "שלישי",
  WEDNESDAY: "רביעי",
  THURSDAY: "חמישי",
  FRIDAY: "שישי",
};

export const weekdayShort: Record<Weekday, string> = {
  SUNDAY: "א׳",
  MONDAY: "ב׳",
  TUESDAY: "ג׳",
  WEDNESDAY: "ד׳",
  THURSDAY: "ה׳",
  FRIDAY: "ו׳",
};

export const genderLabel: Record<BabyGender, string> = {
  BOY: "בן",
  GIRL: "בת",
  TWINS: "תאומים",
};

export const helpTypeLabel: Record<HelpType, string> = {
  MEAL: "ארוחה",
  HELP: "סיוע בבית",
  BOTH: "ארוחה + סיוע",
};

export const institutionTypeLabel: Record<InstitutionType, string> = {
  KINDERGARTEN: "גן",
  TALMUD_TORAH: "תלמוד תורה",
  GIRLS_SCHOOL: "בית ספר לבנות",
  CHABAD_HOUSE: "בית חב״ד",
  OTHER: "אחר",
};
