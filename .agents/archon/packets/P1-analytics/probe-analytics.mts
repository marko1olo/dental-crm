/**
 * Read-only API probe for packet P1-analytics.
 *
 * Answers one question with real data: does GET /api/analytics/dashboard on the
 * live server actually return margin === null and completionRate === null for
 * the doctor rows? The UI defect ("+null RUB" rendered green as profit) only
 * matters if the server really sends null.
 *
 * Signs a clinic token the same way apps/api/src/routes/auth.ts does. Reads the
 * organization id from the live database. Writes nothing anywhere.
 */
import { pool } from "../../../../apps/api/src/db/client.js";
import { authTokenSecret } from "../../../../apps/api/src/security/authSecret.js";
import { signToken } from "../../../../apps/api/src/utils/cryptoHelper.js";
import {
  formatCompletionRate,
  formatMarginCell,
  metricToneClass,
  parseDashboardPayload,
} from "../../../../apps/web/src/pages/analyticsDoctorMetrics.js";

const API_BASE = process.env.DENTE_PROBE_API_BASE ?? "http://127.0.0.1:4100";

async function main() {
  const orgs = await pool.query<{ id: string; name: string }>(
    "select id, name from organizations order by created_at asc limit 3",
  );
  if (orgs.rowCount === 0) {
    console.log("NO ORGANIZATIONS IN DB - cannot probe");
    return;
  }
  for (const org of orgs.rows) {
    console.log(`ORG ${org.id}  ${org.name}`);
  }

  const paid = await pool.query<{ organization_id: string; n: string; total: string }>(
    "select organization_id, count(*)::text as n, coalesce(sum(amount_rub),0)::text as total" +
      " from payments where status = 'paid' group by organization_id",
  );
  console.log(`\nPAID PAYMENT ROWS BY ORG (source of doctorProfitabilityJson): ${paid.rowCount}`);
  for (const row of paid.rows) {
    console.log(`  org=${row.organization_id} paid_payments=${row.n} sum_rub=${row.total}`);
  }
  const anyStatus = await pool.query<{ status: string; n: string }>(
    "select coalesce(status::text,'(null)') as status, count(*)::text as n from payments group by status",
  );
  console.log(`ALL PAYMENTS BY STATUS: ${anyStatus.rows.map((r) => `${r.status}=${r.n}`).join(", ") || "(table empty)"}`);

  const colType = await pool.query<{ column_name: string; data_type: string }>(
    "select column_name, data_type from information_schema.columns" +
      " where table_name = 'payments' and column_name = 'amount_rub'",
  );
  console.log(`payments.amount_rub column type: ${colType.rows.map((r) => r.data_type).join(", ")}`);

  for (const org of orgs.rows) {
    const token = signToken({ organizationId: org.id, clinicName: org.name }, authTokenSecret(), 300);
    const url = `${API_BASE}/api/analytics/dashboard?range=all`;
    const res = await fetch(url, { headers: { "x-dente-clinic-token": token } });
    const raw = await res.text();
    console.log(`\n=== GET ${url}`);
    console.log(`STATUS ${res.status} ${res.statusText}`);
    console.log(`CONTENT-LENGTH header: ${res.headers.get("content-length")}`);
    console.log(`BODY BYTES: ${Buffer.byteLength(raw, "utf8")}`);
    console.log(`BODY: ${raw.length > 1400 ? `${raw.slice(0, 1400)}\n...[truncated]` : raw}`);

    try {
      const parsed = JSON.parse(raw) as {
        data?: { doctorProfitabilityJson?: unknown[]; isEmpty?: boolean };
      };
      const rows = parsed.data?.doctorProfitabilityJson ?? [];
      console.log(`isEmpty: ${String(parsed.data?.isEmpty)}`);
      console.log(`doctor rows: ${rows.length}`);
      for (const row of rows as Array<Record<string, unknown>>) {
        console.log(
          `  name=${JSON.stringify(row.name)} revenue=${JSON.stringify(row.revenue)} ` +
            `margin=${JSON.stringify(row.margin)} (typeof ${typeof row.margin}) ` +
            `completionRate=${JSON.stringify(row.completionRate)} (typeof ${typeof row.completionRate})`,
        );
      }
    } catch (parseError) {
      console.log(`BODY IS NOT JSON: ${String(parseError)}`);
    }

    // The real bytes, through the shipped client code, to the rendered cell.
    const viaClient = parseDashboardPayload(res.status, raw);
    if (viaClient.ok) {
      console.log(`  -> client parse ok, isEmpty=${viaClient.data.isEmpty}`);
      for (const row of viaClient.data.doctorProfitabilityJson) {
        const margin = formatMarginCell(row.margin);
        const completion = formatCompletionRate(row.completionRate);
        console.log(
          `  -> RENDERED "${row.name}": margin cell "${margin.text}" tone=${margin.tone} ` +
            `class=${metricToneClass(margin.tone)} | completion cell "${completion.text}" ` +
            `tone=${completion.tone} class=${metricToneClass(completion.tone)}`,
        );
      }
    } else {
      console.log(`  -> client parse FAILED with russian message: ${viaClient.message}`);
    }
  }

  // Second half of the defect: an empty body. Old code called res.json() on this
  // and printed the browser exception text as the entire screen.
  const emptyBody = parseDashboardPayload(200, "");
  console.log(
    `\nEMPTY BODY -> ok=${emptyBody.ok} message=${emptyBody.ok ? "-" : emptyBody.message}`,
  );
}

main()
  .catch((error) => {
    console.error("PROBE FAILED:", error);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
