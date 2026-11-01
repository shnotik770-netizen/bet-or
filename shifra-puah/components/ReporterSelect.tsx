import type { InstitutionOption } from "./YoledetForm";

/** בחירת מדווח/ת, מקובץ לפי מוסד. לא חובה */
export default function ReporterSelect({
  institutions,
  id,
  name = "reporterId",
  value,
  defaultValue,
  onChange,
  className = "input",
  emptyLabel = "— לא צוין —",
}: {
  institutions: InstitutionOption[];
  id?: string;
  name?: string;
  value?: string;
  defaultValue?: string;
  onChange?: (v: string) => void;
  className?: string;
  emptyLabel?: string;
}) {
  return (
    <select
      id={id}
      name={name}
      className={className}
      value={value}
      defaultValue={defaultValue}
      onChange={onChange ? (e) => onChange(e.target.value) : undefined}
      aria-label="מי דיווח/ה"
    >
      <option value="">{emptyLabel}</option>
      {institutions
        .filter((i) => i.reporters.length)
        .map((i) => (
          <optgroup key={i.id} label={i.name}>
            {i.reporters.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
                {r.role ? ` · ${r.role}` : ""}
              </option>
            ))}
          </optgroup>
        ))}
    </select>
  );
}
