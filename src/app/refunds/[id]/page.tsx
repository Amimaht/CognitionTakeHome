import Link from "next/link";
import { notFound } from "next/navigation";
import { DecisionForm } from "@/components/DecisionForm";
import { DetailPanel } from "@/components/DetailPanel";
import { StatusBadge } from "@/components/StatusBadge";
import { getDb } from "@/lib/db";
import { formatDate, formatMoney } from "@/lib/http";
import { hasPermission } from "@/lib/permissions";
import { getRefund, NotFoundError } from "@/lib/refunds";
import { getActor } from "@/lib/session";

export default async function RefundDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const actor = await getActor();
  if (!hasPermission(actor, "refund:read")) {
    return <p className="error">Select a demo identity to view refund requests.</p>;
  }
  let refund;
  try {
    refund = getRefund(getDb(), actor, id);
  } catch (e) {
    if (e instanceof NotFoundError) notFound();
    throw e;
  }
  const canDecide = hasPermission(actor, "refund:decide");

  return (
    <>
      <p>
        <Link href="/refunds">← Back to queue</Link>
      </p>
      <h1>
        {refund.id} <StatusBadge status={refund.status} />
      </h1>
      <DetailPanel
        title="Request"
        fields={[
          { label: "Customer", value: `${refund.customer_name} (${refund.customer_email})` },
          { label: "Order", value: <code>{refund.order_id}</code> },
          { label: "Amount", value: formatMoney(refund.amount_cents, refund.currency) },
          { label: "Customer reason", value: refund.customer_reason },
          { label: "Requested", value: formatDate(refund.requested_at) },
        ]}
      />
      {refund.status === "pending" ? (
        canDecide ? (
          <DecisionForm refundId={refund.id} />
        ) : (
          <p className="muted">Your role ({actor!.role}) can view but not decide refund requests.</p>
        )
      ) : (
        <DetailPanel
          title="Decision"
          fields={[
            { label: "Outcome", value: <StatusBadge status={refund.status} /> },
            { label: "Decided by", value: refund.decided_by_name ?? refund.decided_by ?? "—" },
            { label: "Decided at", value: formatDate(refund.decided_at) },
            { label: "Reason", value: refund.decision_reason ?? "—" },
          ]}
        />
      )}
    </>
  );
}
