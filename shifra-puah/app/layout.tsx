import type { Metadata } from "next";
import { Heebo } from "next/font/google";
import Link from "next/link";
import { logout } from "./actions";
import { currentRole } from "@/lib/session";
import { authEnabled } from "@/lib/auth";
import "./globals.css";

const heebo = Heebo({ subsets: ["hebrew", "latin"], variable: "--font-heebo", display: "swap" });

export const metadata: Metadata = {
  title: "שפרה ופועה · מוסדות חב״ד עפולה",
  description: "ניהול ורישום יולדות וסידור מתנדבות",
};

const nav = [
  { href: "/", label: "ראשי" },
  { href: "/yoldot", label: "יולדות" },
  { href: "/volunteers", label: "סדר יום מתנדבות" },
  { href: "/institutions", label: "מוסדות ומדווחים" },
];

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const role = await currentRole();
  const links = role === "admin" ? nav : role === "volunteer" ? nav.filter((n) => n.href === "/volunteers") : [];
  return (
    <html lang="he" dir="rtl" className={heebo.variable}>
      <body className="min-h-dvh">
        <header className="no-print border-b border-brand-800 bg-brand-700 text-white">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3">
            <Link href={role === "volunteer" ? "/volunteers" : "/"} className="flex items-center gap-3">
              <span className="grid size-10 place-items-center rounded-xl bg-white/10 ring-1 ring-white/20">
                <svg viewBox="0 0 24 24" className="size-6" aria-hidden>
                  <path
                    d="M12 20s-7-4.3-7-9.5A4 4 0 0 1 12 7.8a4 4 0 0 1 7 2.7C19 15.7 12 20 12 20z"
                    fill="#f6d2d8"
                  />
                </svg>
              </span>
              <span className="leading-tight">
                <span className="block text-lg font-bold">שפרה ופועה</span>
                <span className="block text-xs text-brand-100">מוסדות חב״ד עפולה</span>
              </span>
            </Link>
            <nav className="flex flex-1 flex-wrap items-center gap-1 text-sm">
              {links.map((n) => (
                <Link key={n.href} href={n.href} className="rounded-lg px-3 py-1.5 text-brand-50 hover:bg-white/10">
                  {n.label}
                </Link>
              ))}
            </nav>
            {authEnabled() && role ? (
              <form action={logout}>
                <button className="rounded-lg px-3 py-1.5 text-sm text-brand-100 hover:bg-white/10">יציאה</button>
              </form>
            ) : null}
          </div>
          <div className="h-1 bg-gradient-to-l from-gold-400 via-blush-200 to-gold-400" />
        </header>
        <main className="mx-auto max-w-6xl px-4 py-6 sm:py-8">{children}</main>
      </body>
    </html>
  );
}
