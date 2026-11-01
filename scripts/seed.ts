import { openDb } from "../src/lib/db";
import { seed } from "../src/lib/seed";

const db = openDb();
seed(db);
const refunds = db.prepare("SELECT COUNT(*) AS n FROM refund_requests").get() as { n: number };
const kyc = db.prepare("SELECT COUNT(*) AS n FROM kyc_cases").get() as { n: number };
console.log(`Seeded ${refunds.n} refund requests, ${kyc.n} KYC cases, 3 demo users.`);
db.close();
