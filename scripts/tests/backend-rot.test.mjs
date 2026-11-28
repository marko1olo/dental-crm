#!/usr/bin/env node
import assert from "node:assert/strict";
import test from "node:test";
import { BACKEND_ROT_RULE_KEYS, scanBackendRotAst } from "../lib/backend-rot-rules.mjs";

test("Backend AST rot inquisitor catches tx->global db, fetch inside tx, replica role, unsorted FOR UPDATE, UTC slice, test-env bypass, unbounded select", () => {
	const rottenApiRoute = `
		export function registerBadRoutes(app) {
			app.get("/api/patients/bad", async () => {
				const rows = await db.select().from(patients);
				return rows;
			});
		}
		export async function runBrokenTx(patientId: string) {
			return db.transaction(async (tx) => {
				const rows = await db.select().from(patients);
				await tx.execute("SELECT * FROM invoices WHERE patient_id = '1' FOR UPDATE");
				await tx.execute(sql.raw(\`SELECT * FROM invoices WHERE id = '\${patientId}'\`));
				await fetch("https://example.org/hook");
				if (process.env.NODE_ENV === "test") return { ok: true };
				return rows;
			});
		}
		export function brokenDateKey(d: Date) {
			return d.toISOString().slice(0, 10);
		}
		export function computeBrokenRub(priceKopecks: number) {
			return priceKopecks / 100;
		}
		export function computeBrokenKop(amountRub: number) {
			return amountRub * 100;
		}
		export function brokenPayrollQuery(tx: any) {
			return tx.select().from(payments).innerJoin(visits, eq(payments.visitId, visits.id));
		}
		export async function swallowTxFailure(reply: any) {
			try {
				await db.transaction(async (tx) => tx.execute("SELECT 1"));
			} catch {
				return reply.send({ ok: true });
			}
		}
		const leakCache = new Map<string, string>();
		const leakTimer = setInterval(() => {}, 5000);
		export const badSql = "SET LOCAL session_replication_role = 'replica';";
	`;

	const findings = scanBackendRotAst("apps/api/src/routes/payroll/badRoute.ts", rottenApiRoute);
	const rules = new Set(findings.map((f) => f.rule));
	for (const expected of BACKEND_ROT_RULE_KEYS) {
		assert.ok(rules.has(expected), `Backend AST inquisitor missed rot rule: ${expected}. Found: ${[...rules].join(", ")}`);
	}
});

test("Backend AST rot inquisitor produces ZERO false positives on clean tx, timed fetch outside tx, unref timer, ORDER BY FOR UPDATE and clinicTimezone formatting", () => {
	const cleanApiService = `
		export async function cleanService(patientId: string) {
			const meta = await fetch("https://api.example.org/ping", { signal: AbortSignal.timeout(5000) });
			const t = setInterval(() => {}, 60000);
			t.unref();
			return db.transaction(async (tx) => {
				await tx.execute("SELECT id FROM invoices WHERE patient_id = $1 ORDER BY id ASC FOR UPDATE");
				return tx.select().from(patients).where(eq(patients.id, patientId)).limit(20);
			});
		}
		export function computeLegitPercentages(grossMarginKop: number, revenueKop: number) {
			const pct1 = (grossMarginKop / revenueKop) * 100;
			const pct2 = Math.round((Number(grossMarginKop) * 100) / Number(revenueKop));
			const pct3 = Math.round((grossMarginKop / revenueKop) * 10000) / 100;
			return { pct1, pct2, pct3 };
		}
	`;

	const findings = scanBackendRotAst("apps/api/src/routes/billing/cleanRoute.ts", cleanApiService);
	assert.deepEqual(findings, [], `Unexpected false positives: ${JSON.stringify(findings)}`);
});
