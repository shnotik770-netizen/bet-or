// שתי רמות כניסה:
//   APP_PASSWORD       – הנהלה: הכול
//   VOLUNTEER_PASSWORD – מתנדבות: רק סדר היום, ועדכון כתובות
// בלי APP_PASSWORD האתר פתוח וכולם מנהלים (נוח לפיתוח).
// העוגייה שומרת גיבוב של התפקיד והסיסמה, לא את הסיסמה.

export const AUTH_COOKIE = "sp_auth";

export type Role = "admin" | "volunteer";

export async function roleToken(role: Role, password: string): Promise<string> {
  const data = new TextEncoder().encode(`shifra-puah:${role}:${password}`);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash), (b) => b.toString(16).padStart(2, "0")).join("");
}

export function authEnabled() {
  return !!process.env.APP_PASSWORD;
}

/** התפקיד לפי ערך העוגייה, או null אם לא מחובר/ת */
export async function roleFromToken(token: string | undefined): Promise<Role | null> {
  const admin = process.env.APP_PASSWORD;
  if (!admin) return "admin";
  if (!token) return null;
  if (token === (await roleToken("admin", admin))) return "admin";
  const vol = process.env.VOLUNTEER_PASSWORD;
  if (vol && token === (await roleToken("volunteer", vol))) return "volunteer";
  return null;
}

/** נתיבים שמתנדבות רשאיות לפתוח */
export function volunteerMayOpen(pathname: string) {
  return pathname === "/volunteers" || pathname.startsWith("/volunteers/");
}
