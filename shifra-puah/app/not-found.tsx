import Link from "next/link";

export default function NotFound() {
  return (
    <div className="card mx-auto mt-10 max-w-md p-8 text-center">
      <h1 className="text-xl font-bold text-brand-900">הדף לא נמצא</h1>
      <Link href="/" className="btn-primary mt-4">לדף הראשי</Link>
    </div>
  );
}
