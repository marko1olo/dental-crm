import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { SQL } from "drizzle-orm";
import { PgDialect } from "drizzle-orm/pg-core";
import { cleanDemoShowcaseTables, type DemoCleanupTx } from "../coreModules/demoStaffAndChairsSeeder.js";

describe("demoStaffAndChairsSeeder SQL Parameterization & Allowlist Safety", () => {
	it("executes parameterized table lookup and deletes only allowlisted tables with bound UUID parameter", async () => {
		const dialect = new PgDialect();
		const executedQueries: Array<{ sql: string; params: unknown[] }> = [];

		const fakeTx: DemoCleanupTx = {
			async execute(query: SQL) {
				const compiled = dialect.sqlToQuery(query);
				executedQueries.push(compiled);
				if (compiled.sql.includes("information_schema.columns")) {
					return {
						rows: [
							{ table_name: "patients" }, // not in tablesToClean allowlist (handled later via drizzle delete)
							{ table_name: "patients; DROP TABLE users; --" }, // hostile row
							{ table_name: "payment_fake_sql" },
							{ table_name: "payments" },
							{ table_name: "invoices" },
						],
					};
				}
				return { rows: [] };
			},
			delete() {
				return {
					where: async () => [],
				};
			},
		};

		await cleanDemoShowcaseTables(fakeTx);

		assert.ok(executedQueries.length >= 3);
		const discoveryQuery = executedQueries[0];
		assert.ok(discoveryQuery, "Expected discovery query to run");
		assert.ok(discoveryQuery.sql.includes("information_schema.columns"));
		assert.ok(discoveryQuery.params.length > 20, "tablesToClean must be bound as SQL parameters");
		assert.ok(discoveryQuery.params.includes("payments"));

		const deleteQueries = executedQueries.slice(1);
		assert.equal(deleteQueries.length, 2, "Only allowlisted tables from validTableNames may be deleted");
		assert.equal(
			deleteQueries.some((q) => q.sql.includes("DROP TABLE") || q.sql.includes("payment_fake_sql")),
			false,
		);
		for (const q of deleteQueries) {
			assert.match(q.sql, /^DELETE FROM "(payments|invoices)" WHERE organization_id = \$1::uuid$/);
			assert.equal(q.params.length, 1);
		}
	});
});
