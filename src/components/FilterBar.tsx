interface Props {
  action: string;
  statuses: string[];
  current: { status?: string; q?: string; min?: string };
  showSearch?: boolean;
}

// Plain GET form: filters live in the URL so they survive refresh and are
// applied server-side.
export function FilterBar({ action, statuses, current, showSearch = true }: Props) {
  return (
    <form method="get" action={action} className="filter-bar">
      <label>
        Status
        <select name="status" defaultValue={current.status ?? "pending"}>
          <option value="all">all</option>
          {statuses.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </label>
      {showSearch && (
        <>
          <label>
            Search
            <input name="q" placeholder="name, order, id" defaultValue={current.q ?? ""} />
          </label>
          <label>
            Min amount ($)
            <input name="min" type="number" min="0" step="1" defaultValue={current.min ?? ""} />
          </label>
        </>
      )}
      <button type="submit">Apply</button>
    </form>
  );
}
