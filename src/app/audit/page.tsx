import { DataTable, type Column } from "@/components/DataTable";
import { listAuditEvents, type AuditEvent } from "@/lib/audit";
import { getDb } from "@/lib/db";
import { formatDate } from "@/lib/http";
import { hasPermission } from "@/lib/permissions";
import { getActor } from "@/lib/session";

export default async function AuditPage() {
  const actor = await getActor();
  if (!hasPermission(actor, "audit:read")) {
    return <p className="error">403 — your role cannot read the audit log. Switch to the auditor identity.</p>;
  }
  const rows = listAuditEvents(getDb());
  const columns: Column<AuditEvent>[] = [
    { key: "id", header: "#", render: (e) => e.id },
    { key: "at", header: "When", render: (e) => formatDate(e.created_at) },
    { key: "actor", header: "Actor", render: (e) => `${e.actor_name} (${e.actor_id})` },
    { key: "action", header: "Action", render: (e) => <code>{e.action}</code> },
    { key: "entity", header: "Record", render: (e) => `${e.entity_type} ${e.entity_id}` },
    { key: "reason", header: "Reason", render: (e) => e.reason },
    { key: "before", header: "Before", render: (e) => <code className="small">{e.before_state}</code> },
    { key: "after", header: "After", render: (e) => <code className="small">{e.after_state}</code> },
  ];
  return (
    <>
      <h1>Audit log</h1>
      <p className="muted small">
        Append-only at the database layer (UPDATE/DELETE blocked by triggers). Not protected against direct file access.
      </p>
      <DataTable columns={columns} rows={rows} rowKey={(e) => String(e.id)} emptyMessage="No decisions recorded yet." />
    </>
  );
}
