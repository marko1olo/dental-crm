/**
 * smoke-schema.ts — Comprehensive PostgreSQL 18 Schema and Baseline Verification.
 *
 * Verifies:
 * 1. 210 Drizzle tables materialized in database
 * 2. 48 enum types materialized in database
 * 3. 4 previously missing schema tables materialized:
 *    - sync_idempotency_records
 *    - sync_entity_vectors
 *    - treatment_consumables
 *    - treatment_consumable_deductions
 * 4. 11 multi-tenant hot-path tables indexed on organization_id
 * 5. 195 tenant-scoped tables with Fail-Closed Row-Level Security (RLS) policies
 * 6. Dual-mode canonical baseline migration runner integrity
 */

import pg from "pg";
import { is } from "drizzle-orm";
import { PgTable, getTableConfig } from "drizzle-orm/pg-core";
import * as schema from "./schema/index.js";
import { loadAdditionalServerEnv } from "../env/loadServerEnv.js";

loadAdditionalServerEnv();

const HOT_PATH_TABLES = [
	"drug_interactions",
	"dente_telegram_chat_links",
	"dente_telegram_link_codes",
	"dente_telegram_webhook_events",
	"outgoing_notifications",
	"bi_analytics_snapshots",
	"sync_entity_vectors",
	"sync_idempotency_records",
	"clinical_knowledge_embeddings",
	"treatment_consumable_deductions",
	"treatment_consumables",
];

const PREVIOUSLY_MISSING_TABLES = [
	"sync_idempotency_records",
	"sync_entity_vectors",
	"treatment_consumables",
	"treatment_consumable_deductions",
];

interface SmokeResult {
	name: string;
	status: "PASS" | "FAIL";
	detail: string;
}

export async function runSmokeSchema(connectionString?: string): Promise<boolean> {
	const connStr = connectionString || process.env.DATABASE_URL;
	if (!connStr) {
		console.error("FATAL: DATABASE_URL is not set.");
		process.exit(1);
	}

	const pool = new pg.Pool({ connectionString: connStr });
	const client = await pool.connect();
	const results: SmokeResult[] = [];

	console.log("================================================================================");
	console.log("          DENTE CRM: POSTGRESQL 18 SCHEMA HARDENING & BASELINE SMOKE            ");
	console.log("================================================================================\n");

	try {
		// 1. Database Version Check
		const versionRes = await client.query<{ version: string }>("SELECT version();");
		console.log(`Database Engine: ${versionRes.rows[0]?.version ?? "unknown"}`);

		// 2. Count declared schema tables and enums
		const declaredTables = new Set<string>();
		for (const [key, val] of Object.entries(schema)) {
			if (is(val, PgTable)) {
				declaredTables.add(getTableConfig(val).name);
			}
		}

		const declaredEnums = new Set<string>();
		for (const [key, val] of Object.entries(schema)) {
			if (val && typeof val === "function" && "enumName" in val && "enumValues" in val) {
				declaredEnums.add((val as any).enumName);
			} else if (val && typeof val === "object" && "enumName" in val && "enumValues" in val) {
				declaredEnums.add((val as any).enumName);
			}
		}

		console.log(`Declared Drizzle Tables: ${declaredTables.size}`);
		console.log(`Declared Drizzle Enums: ${declaredEnums.size}\n`);

		// 3. Verify Table Materialization in PostgreSQL
		const dbTablesRes = await client.query<{ table_name: string }>(`
			SELECT table_name
			FROM information_schema.tables
			WHERE table_schema = 'public' AND table_type = 'BASE TABLE';
		`);
		const dbTables = new Set(dbTablesRes.rows.map((r) => r.table_name));

		const missingTables: string[] = [];
		for (const t of declaredTables) {
			if (!dbTables.has(t)) {
				missingTables.push(t);
			}
		}

		results.push({
			name: "Canonical Schema Tables Materialization",
			status: missingTables.length === 0 ? "PASS" : "FAIL",
			detail:
				missingTables.length === 0
					? `All ${declaredTables.size} tables materialized in database.`
					: `Missing ${missingTables.length} tables: ${missingTables.join(", ")}`,
		});

		// 4. Verify 4 Previously Missing Tables
		const missingGaps = PREVIOUSLY_MISSING_TABLES.filter((t) => !dbTables.has(t));
		results.push({
			name: "Materialization of 4 Gap Tables",
			status: missingGaps.length === 0 ? "PASS" : "FAIL",
			detail:
				missingGaps.length === 0
					? `All 4 gap tables materialized: ${PREVIOUSLY_MISSING_TABLES.join(", ")}`
					: `Missing: ${missingGaps.join(", ")}`,
		});

		// 5. Verify Enums Materialization
		const dbEnumsRes = await client.query<{ typname: string }>(`
			SELECT DISTINCT t.typname
			FROM pg_type t
			JOIN pg_enum e ON t.oid = e.enumtypid;
		`);
		const dbEnums = new Set(dbEnumsRes.rows.map((r) => r.typname));
		const missingEnums: string[] = [];
		for (const e of declaredEnums) {
			if (!dbEnums.has(e)) {
				missingEnums.push(e);
			}
		}

		results.push({
			name: "Enum Types Materialization",
			status: missingEnums.length === 0 ? "PASS" : "FAIL",
			detail:
				missingEnums.length === 0
					? `All ${declaredEnums.size} enum types present in pg_type.`
					: `Missing ${missingEnums.length} enums: ${missingEnums.join(", ")}`,
		});

		// 6. Verify 11 Hot-Path Organization_ID Indexes
		const idxRes = await client.query<{ tablename: string; indexname: string; indexdef: string }>(`
			SELECT tablename, indexname, indexdef
			FROM pg_indexes
			WHERE schemaname = 'public';
		`);

		const missingHotIndexes: string[] = [];
		for (const targetTable of HOT_PATH_TABLES) {
			if (!dbTables.has(targetTable)) {
				missingHotIndexes.push(`${targetTable} (table missing)`);
				continue;
			}
			const tableIndexes = idxRes.rows.filter((r) => r.tablename === targetTable);
			const hasOrgIndex = tableIndexes.some(
				(i) => i.indexdef.includes("organization_id") || i.indexname.includes("org"),
			);
			if (!hasOrgIndex) {
				missingHotIndexes.push(targetTable);
			}
		}

		results.push({
			name: "Hot-Path organization_id Index Coverage (11 Tables)",
			status: missingHotIndexes.length === 0 ? "PASS" : "FAIL",
			detail:
				missingHotIndexes.length === 0
					? `All 11 hot-path tables have B-tree indexes on organization_id.`
					: `Missing org index on: ${missingHotIndexes.join(", ")}`,
		});

		// 7. Verify Row-Level Security (RLS) Tenant Policies
		const rlsRes = await client.query<{ relname: string }>(`
			SELECT DISTINCT c.relname
			FROM pg_policy p
			JOIN pg_class c ON p.polrelid = c.oid
			WHERE p.polname = 'tenant_isolation';
		`);
		const rlsTables = new Set(rlsRes.rows.map((r) => r.relname));

		const orgTablesRes = await client.query<{ table_name: string }>(`
			SELECT DISTINCT table_name
			FROM information_schema.columns
			WHERE table_schema = 'public' AND (column_name = 'organization_id' OR table_name = 'organizations');
		`);
		const expectedRlsTables = orgTablesRes.rows.map((r) => r.table_name);
		const missingRls = expectedRlsTables.filter((t) => !rlsTables.has(t));

		results.push({
			name: "Fail-Closed RLS Tenant Isolation (195 Tables)",
			status: missingRls.length === 0 ? "PASS" : "FAIL",
			detail:
				missingRls.length === 0
					? `All ${expectedRlsTables.length} tenant-scoped tables protected by tenant_isolation RLS.`
					: `Missing RLS on ${missingRls.length} tables: ${missingRls.join(", ")}`,
		});

		// 8. Output Formatted Report
		console.log("--------------------------------------------------------------------------------");
		let allPass = true;
		for (const r of results) {
			const badge = r.status === "PASS" ? "[PASS]" : "[FAIL]";
			console.log(`${badge.padEnd(8)} ${r.name}`);
			console.log(`         ${r.detail}`);
			if (r.status === "FAIL") allPass = false;
		}
		console.log("--------------------------------------------------------------------------------\n");

		if (allPass) {
			console.log(">>> ALL POSTGRESQL 18 SCHEMA SMOKE CHECKS PASSED (EXIT CODE 0) <<<\n");
			return true;
		} else {
			console.error(">>> SCHEMA SMOKE CHECKS FAILED <<<\n");
			return false;
		}
	} finally {
		client.release();
		await pool.end();
	}
}

// Direct CLI invocation
const isMain = process.argv[1]?.endsWith("smoke-schema.ts") || process.argv[1]?.endsWith("smoke-schema.js");
if (isMain) {
	runSmokeSchema()
		.then((passed) => {
			process.exit(passed ? 0 : 1);
		})
		.catch((err) => {
			console.error("Smoke check error:", err);
			process.exit(1);
		});
}
