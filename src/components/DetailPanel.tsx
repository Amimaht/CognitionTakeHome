import type { ReactNode } from "react";

export interface Field {
  label: string;
  value: ReactNode;
}

export function DetailPanel({ title, fields }: { title: string; fields: Field[] }) {
  return (
    <section className="panel">
      <h2>{title}</h2>
      <dl className="detail-grid">
        {fields.map((f) => (
          <div key={f.label}>
            <dt>{f.label}</dt>
            <dd>{f.value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
