import LoginForm from "./LoginForm";

export const metadata = { title: "כניסה · שפרה ופועה" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  return (
    <div className="mx-auto mt-10 max-w-sm">
      <div className="card p-6">
        <h1 className="text-xl font-bold text-brand-900">כניסה למערכת</h1>
        <p className="mb-4 mt-1 text-sm text-slate-600">שפרה ופועה · מוסדות חב״ד עפולה</p>
        <LoginForm next={next ?? "/"} />
      </div>
    </div>
  );
}
