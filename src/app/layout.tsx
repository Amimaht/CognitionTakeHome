import type { Metadata } from "next";
import Link from "next/link";
import { headers } from "next/headers";
import "./globals.css";
import { DemoIdentityBanner } from "@/components/DemoIdentityBanner";
import { getActor } from "@/lib/session";
import { hasPermission } from "@/lib/permissions";

export const metadata: Metadata = {
  title: "Internal Tools — Refunds Review",
  description: "Prototype internal review tool with server-side permissions and audit history",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const actor = await getActor();
  const h = await headers();
  const returnTo = h.get("x-pathname") ?? "/refunds";
  return (
    <html lang="en">
      <body>
        <header className="topbar">
          <nav>
            <Link href="/refunds">Refunds</Link>
            <Link href="/kyc">KYC (read-only)</Link>
            {hasPermission(actor, "audit:read") && <Link href="/audit">Audit log</Link>}
          </nav>
        </header>
        <DemoIdentityBanner actor={actor} returnTo={returnTo} />
        <main>{children}</main>
      </body>
    </html>
  );
}
