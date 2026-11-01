export default function PageTitle({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: React.ReactNode;
  /** כפתורי פעולה בצד */
  children?: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-2xl font-bold text-brand-900 sm:text-3xl">{title}</h1>
        {subtitle ? <p className="mt-1 text-slate-600">{subtitle}</p> : null}
      </div>
      {children ? <div className="no-print flex flex-wrap gap-2">{children}</div> : null}
    </div>
  );
}
