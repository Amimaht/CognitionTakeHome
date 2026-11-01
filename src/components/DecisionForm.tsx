"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function DecisionForm({ refundId }: { refundId: string }) {
  const router = useRouter();
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(decision: "approved" | "rejected") {
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/refunds/${refundId}/decision`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ decision, reason }),
    });
    setBusy(false);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(`${res.status}: ${body.error ?? res.statusText}`);
      return;
    }
    router.refresh();
  }

  return (
    <section className="panel">
      <h2>Decision</h2>
      <label>
        Reason (required)
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={3}
          maxLength={500}
          placeholder="Why are you approving or rejecting this request?"
        />
      </label>
      <div className="actions">
        <button className="approve" disabled={busy} onClick={() => submit("approved")}>
          Approve
        </button>
        <button className="reject" disabled={busy} onClick={() => submit("rejected")}>
          Reject
        </button>
      </div>
      {error && <p className="error">{error}</p>}
      <p className="muted small">Approval updates the review record only. No money moves.</p>
    </section>
  );
}
