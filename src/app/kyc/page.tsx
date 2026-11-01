import { DataTable, type Column } from "@/components/DataTable";
import { FilterBar } from "@/components/FilterBar";
import { StatusBadge } from "@/components/StatusBadge";
import { getDb } from "@/lib/db";
import { formatDate } from "@/lib/http";
import { listKycCases, type KycCase } from "@/lib/kyc";
import { hasPermission } from "@/lib/permissions";
import { getActor } from "@/lib/session";

// Second queue built on the same DataTable / FilterBar / permission modules.
// Read-only: no decision path exists for KYC in this prototype.
export default async function KycPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const sp = await searchParams;
  const actor = await getActor();
  if (!hasPermission(actor, "kyc:read")) {
    return <p className="error">Select a demo identity to view KYC cases.</p>;
  }
  const rows = listKycCases(getDb(), actor, sp.status ?? "pending");
  const columns: Column<KycCase>[] = [
    { key: "id", header: "Case", render: (k) => k.id },
    { key: "name", header: "Applicant", render: (k) => k.applicant_name },
    { key: "country", header: "Country", render: (k) => k.country },
    { key: "doc", header: "Document", render: (k) => k.document_type },
    { key: "risk", header: "Risk", render: (k) => <StatusBadge status={k.risk_level} /> },
    { key: "submitted", header: "Submitted", render: (k) => formatDate(k.submitted_at) },
    { key: "status", header: "Status", render: (k) => <StatusBadge status={k.status} /> },
  ];
  return (
    <>
      <h1>KYC review queue (read-only)</h1>
      <FilterBar action="/kyc" statuses={["pending", "verified", "escalated"]} current={sp} showSearch={false} />
      <DataTable columns={columns} rows={rows} rowKey={(k) => k.id} />
    </>
  );
}
