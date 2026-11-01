import "server-only";
import { cookies } from "next/headers";
import { AUTH_COOKIE, roleFromToken, type Role } from "./auth";

export async function currentRole(): Promise<Role | null> {
  return roleFromToken((await cookies()).get(AUTH_COOKIE)?.value);
}

export async function requireAdmin() {
  if ((await currentRole()) !== "admin") throw new Error("אין הרשאה");
}

export async function requireSignedIn(): Promise<Role> {
  const role = await currentRole();
  if (!role) throw new Error("אין הרשאה");
  return role;
}
