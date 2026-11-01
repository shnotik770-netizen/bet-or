import { NextResponse, type NextRequest } from "next/server";
import { AUTH_COOKIE, passwordToken } from "@/lib/auth";

// אם הוגדרה APP_PASSWORD, כל האתר דורש כניסה
export async function proxy(req: NextRequest) {
  const password = process.env.APP_PASSWORD;
  if (!password) return NextResponse.next();
  const token = req.cookies.get(AUTH_COOKIE)?.value;
  if (token && token === (await passwordToken(password))) return NextResponse.next();
  const url = req.nextUrl.clone();
  url.pathname = "/login";
  url.search = `?next=${encodeURIComponent(req.nextUrl.pathname + req.nextUrl.search)}`;
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/((?!login|_next/static|_next/image|favicon.ico|icon.svg).*)"],
};
