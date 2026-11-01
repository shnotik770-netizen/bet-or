// הגנה פשוטה בסיסמה אחת (APP_PASSWORD). העוגייה שומרת גיבוב של הסיסמה, לא את הסיסמה.
export const AUTH_COOKIE = "sp_auth";

export async function passwordToken(password: string): Promise<string> {
  const data = new TextEncoder().encode("shifra-puah:" + password);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash), (b) => b.toString(16).padStart(2, "0")).join("");
}
