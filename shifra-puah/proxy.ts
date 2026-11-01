import { NextResponse, type NextRequest } from "next/server";
import { AUTH_COOKIE, roleFromToken, volunteerMayOpen } from "@/lib/auth";

export async function proxy(req: NextRequest) {
  const role = await roleFromToken(req.cookies.get(AUTH_COOKIE)?.value);
  const { pathname, search } = req.nextUrl;
  if (role === "admin") return NextResponse.next();
  if (role === "volunteer") {
    if (volunteerMayOpen(pathname)) return NextResponse.next();
    return NextResponse.redirect(new URL("/volunteers", req.url));
  }
  const url = new URL("/login", req.url);
  url.searchParams.set("next", pathname + search);
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/((?!login|_next/static|_next/image|favicon.ico|icon.svg).*)"],
};
