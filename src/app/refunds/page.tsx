import Link from "next/link";
import { DataTable, type Column } from "@/components/DataTable";
import { FilterBar } from "@/components/FilterBar";
import { StatusBadge } from "@/components/StatusBadge";
import { getDb } from "@/lib/db";
import { formatDate, formatMoney } from "@/lib/http";
import { hasPermission } from "@/lib/permissions";
import { listRefunds, type RefundRequest, type RefundStatus } from "@/lib/refunds";
import { getActor } from "@/lib/session";

type Search = { status?: string; q?: string; min?: string };

export default async function RefundsPage({ searchParams }: { searchParams: Promise<Search> }) {
  const sp = await searchParams;
  const actor = await getActor();
  if (!hasPermission(actor, "refund:read")) {
    return <p className="error">Select a demo identity to view refund requests.</p>;
  }
  const status = (sp.status ?? "pending") as RefundStatus | "all";
  const min = sp.min ? Math.round(Number(sp.min) * 100) : undefined;
  const rows = listRefunds(getDb(), actor, { status, q: sp.q, minAmountCents: min });

  const columns: Column<RefundRequest>[] = [
    { key: "id", header: "Request", render: (r) => <Link href={`/refunds/${r.id}`}>{r.id}</Link> },
    { key: "customer", header: "Customer", render: (r) => r.customer_name },
    { key: "order", header: "Order", render: (r) => <code>{r.order_id}</code> },
    { key: "amount", header: "Amount", align: "right", render: (r) => formatMoney(r.amount_cents, r.currency) },
    { key: "reason", header: "Customer reason", render: (r) => r.customer_reason },
    { key: "requested", header: "Requested", render: (r) => formatDate(r.requested_at) },
    { key: "status", header: "Status", render: (r) => <StatusBadge status={r.status} /> },
  ];

  return (
    <>
      <h1>Refund requests</h1>
      <FilterBar action="/refunds" statuses={["pending", "approved", "rejected"]} current={sp} />
      <p className="muted small">{rows.length} request(s)</p>
      <DataTable columns={columns} rows={rows} rowKey={(r) => r.id} />
    </>
  );
}
