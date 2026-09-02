import assert from "node:assert/strict";
import { after, before, describe, test } from "node:test";
import { sql } from "drizzle-orm";
import { db, pool } from "./client.js";

const PHASE26_SANPIN_TABLES = [
	"anesthesia_logs",
	"autoclave_daily_tests",
	"bactericidal_equipments",
	"bactericidal_irradiator_logs",
	"bonus_transactions",
	"cash_shifts",
	"drug_catalog",
	"drug_interactions",
	"egisz_audit_logs",
	"egisz_outbox",
	"electronic_prescription_items",
	"electronic_prescriptions",
	"emergency_biohazard_logs",
	"general_cleaning_logs",
	"implant_catalog_items",
	"implant_isq_measurements",
	"inventory_transfers",
	"inventory_transfer_items",
	"lab_items",
	"lab_order_events",
	"loyalty_programs",
	"mdlp_items",
	"medical_waste_logs",
	"patient_bonus_balances",
	"patient_drug_allergies",
	"patient_implant_installations",
	"patient_referral_codes",
	"patient_referrals",
	"perio_charts",
	"pre_sterilization_cleaning_logs",
	"referral_campaigns",
	"shift_discrepancy_reports",
	"temperature_humidity_equipments",
	"temperature_humidity_logs",
	"appointment_action_codes",
	"communication_campaigns",
	"patient_duplicate_decisions",
] as const;

describe("RLS Phase 26 & SanPiN 37 Secondary Tables Tenant Isolation", () => {
	let isDbReady = false;

	before(async () => {
		try {
			await db.execute(sql`SELECT 1`);
			isDbReady = true;
			await db.execute(sql`
				DO $$ BEGIN
					IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'dente_rls_tester') THEN
						CREATE ROLE dente_rls_tester NOSUPERUSER NOBYPASSRLS;
					END IF;
				END $$;
				GRANT ALL ON ALL TABLES IN SCHEMA public TO dente_rls_tester;
				GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO dente_rls_tester;
				GRANT USAGE ON SCHEMA public TO dente_rls_tester;
			`);
		} catch {
			isDbReady = false;
		}
	});

	after(async () => {
		if (isDbReady) {
			await db.execute(sql`
				DO $$ BEGIN
					IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'dente_rls_tester') THEN
						REVOKE ALL ON ALL TABLES IN SCHEMA public FROM dente_rls_tester;
						REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM dente_rls_tester;
						REVOKE USAGE ON SCHEMA public FROM dente_rls_tester;
						DROP ROLE dente_rls_tester;
					END IF;
				END $$;
			`).catch(() => {});
		}
	});

	test("all 37 secondary tables have ROW LEVEL SECURITY and FORCE ROW LEVEL SECURITY enabled", async (ctx) => {
		if (!isDbReady) return ctx.skip("database unavailable");

		const result = await db.execute<{
			relname: string;
			relrowsecurity: boolean;
			relforcerowsecurity: boolean;
		}>(sql`
			SELECT c.relname, c.relrowsecurity, c.relforcerowsecurity
			FROM pg_class c
			JOIN pg_namespace n ON n.oid = c.relnamespace
			WHERE n.nspname = 'public'
			  AND c.relname IN (${sql.raw(PHASE26_SANPIN_TABLES.map((t) => `'${t}'`).join(", "))})
		`);

		const rows = (result.rows ?? []) as Array<{
			relname: string;
			relrowsecurity: boolean;
			relforcerowsecurity: boolean;
		}>;
		const coveredMap = new Map(rows.map((r) => [r.relname, r]));

		assert.equal(
			rows.length,
			37,
			`Expected all 37 tables in public schema, found ${rows.length}`,
		);

		for (const tableName of PHASE26_SANPIN_TABLES) {
			const info = coveredMap.get(tableName);
			assert.ok(info, `Table "${tableName}" must exist in pg_class`);
			assert.equal(
				info.relrowsecurity,
				true,
				`Table "${tableName}" must have relrowsecurity = true`,
			);
			assert.equal(
				info.relforcerowsecurity,
				true,
				`Table "${tableName}" must have relforcerowsecurity = true (FORCE RLS)`,
			);
		}
	});

	test("all 37 secondary tables have a valid tenant_isolation policy", async (ctx) => {
		if (!isDbReady) return ctx.skip("database unavailable");

		const result = await db.execute<{
			tablename: string;
			policyname: string;
			permissive: string;
			roles: string[];
			cmd: string;
			qual: string | null;
			with_check: string | null;
		}>(sql`
			SELECT tablename, policyname, permissive, roles, cmd, qual, with_check
			FROM pg_policies
			WHERE schemaname = 'public'
			  AND tablename IN (${sql.raw(PHASE26_SANPIN_TABLES.map((t) => `'${t}'`).join(", "))})
			  AND policyname = 'tenant_isolation'
		`);

		const rows = (result.rows ?? []) as Array<{
			tablename: string;
			policyname: string;
			permissive: string;
			roles: string[];
			cmd: string;
			qual: string | null;
			with_check: string | null;
		}>;
		assert.equal(
			rows.length,
			37,
			`Expected 37 tenant_isolation policies, found ${rows.length}`,
		);

		const policyMap = new Map(rows.map((r) => [r.tablename, r]));
		for (const tableName of PHASE26_SANPIN_TABLES) {
			const policy = policyMap.get(tableName);
			assert.ok(
				policy,
				`Table "${tableName}" must have tenant_isolation policy`,
			);
			assert.equal(policy.permissive, "PERMISSIVE");
			assert.equal(policy.cmd, "ALL");
			assert.ok(
				policy.with_check,
				`Policy on "${tableName}" must define WITH CHECK expression`,
			);
		}
	});

	test("fail-closed logic: empty or absent organization context returns 0 rows and avoids 22P02 syntax errors", async (ctx) => {
		if (!isDbReady) return ctx.skip("database unavailable");

		// Test on a fresh client checkout outside withTenantCtx / withSuperuserBypass
		const client = await pool.connect();
		try {
			// 1. Completely unset setting
			await client.query("DISCARD TEMP");
			const res1 = await client.query('SELECT * FROM "anesthesia_logs" LIMIT 1');
			assert.equal(res1.rows.length, 0);

			// 2. Empty string setting (post-reset GUC)
			await client.query(
				"SELECT set_config('app.current_organization_id', '', false), set_config('app.current_tenant', '', false)",
			);
			const res2 = await client.query('SELECT * FROM "anesthesia_logs" LIMIT 1');
			assert.equal(res2.rows.length, 0);

			const res3 = await client.query('SELECT * FROM "drug_catalog" LIMIT 1');
			assert.equal(res3.rows.length, 0);

			const res4 = await client.query('SELECT * FROM "bonus_transactions" LIMIT 1');
			assert.equal(res4.rows.length, 0);
		} finally {
			client.release();
		}
	});

	test("tenant isolation: app.current_organization_id and app.current_tenant isolate data strictly between tenants", async (ctx) => {
		if (!isDbReady) return ctx.skip("database unavailable");

		const orgA = "11111111-1111-4111-8111-111111111111";
		const orgB = "22222222-2222-4222-8222-222222222222";

		const client = await pool.connect();
		try {
			await client.query("BEGIN");

			// Ensure test orgs exist in organizations table for FK
			await client.query("SELECT set_config('app.superuser_bypass', 'on', true)");
			await client.query(
				`INSERT INTO "organizations" ("id", "name", "created_at", "updated_at")
				 VALUES ($1, 'Org A', now(), now()), ($2, 'Org B', now(), now())
				 ON CONFLICT ("id") DO NOTHING`,
				[orgA, orgB],
			);

			// 1. Insert row under orgA using app.current_organization_id as non-superuser
			await client.query("SET LOCAL ROLE dente_rls_tester");
			await client.query("SELECT set_config('app.superuser_bypass', 'off', true)");
			await client.query("SELECT set_config('app.current_organization_id', $1, true)", [orgA]);
			await client.query("SELECT set_config('app.current_tenant', $1, true)", [orgA]);

			await client.query(
				`INSERT INTO "drug_catalog" ("id", "organization_id", "trade_name_ru", "inn_latin", "inn_ru", "category", "dosage_form", "strength_concentration", "latin_signature_template", "default_sig_russian", "is_active")
				 VALUES (gen_random_uuid(), $1, 'ТестЛекарство А', 'TestDrugA', 'ТестПрепаратА', 'antibiotic', 'tab', '500mg', 'D.t.d.', 'По 1 таб', true)`,
				[orgA],
			);

			// 2. Query under orgA: sees the row
			const checkOrgA = await client.query(
				'SELECT * FROM "drug_catalog" WHERE "inn_latin" = \'TestDrugA\'',
			);
			assert.equal(checkOrgA.rows.length, 1);
			assert.equal(checkOrgA.rows[0].organization_id, orgA);

			// 3. Switch to orgB: row for orgA is invisible
			await client.query("SELECT set_config('app.current_organization_id', $1, true)", [orgB]);
			await client.query("SELECT set_config('app.current_tenant', $1, true)", [orgB]);

			const checkOrgB = await client.query(
				'SELECT * FROM "drug_catalog" WHERE "inn_latin" = \'TestDrugA\'',
			);
			assert.equal(checkOrgB.rows.length, 0, "Tenant B must not see Tenant A drug catalog item");

			// 4. Verify backward-compatible app.current_tenant also sees orgA data
			await client.query("SELECT set_config('app.current_organization_id', '', true)");
			await client.query("SELECT set_config('app.current_tenant', $1, true)", [orgA]);
			const checkTenantA = await client.query(
				'SELECT * FROM "drug_catalog" WHERE "inn_latin" = \'TestDrugA\'',
			);
			assert.equal(checkTenantA.rows.length, 1);

			// 6. Test inventory_transfers dual-tenant isolation (sender and receiver both have access)
			const transferId = "33333333-3333-4333-8333-333333333333";
			const itemId = "66666666-6666-4666-8666-666666666666";
			const orgC = "44444444-4444-4444-8444-444444444444";
			await client.query("RESET ROLE");
			await client.query("SELECT set_config('app.superuser_bypass', 'on', true)");
			await client.query(
				`INSERT INTO "organizations" ("id", "name", "created_at", "updated_at")
				 VALUES ($1, 'Org C', now(), now())
				 ON CONFLICT ("id") DO NOTHING`,
				[orgC],
			);
			await client.query(
				`INSERT INTO "inventory_items" ("id", "organization_id", "name", "category", "unit", "current_qty", "min_qty")
				 VALUES ($1, $2, 'Бор алмазный', 'material', 'шт', 50, 5)
				 ON CONFLICT ("id") DO NOTHING`,
				[itemId, orgA],
			);
			await client.query("SET LOCAL ROLE dente_rls_tester");
			await client.query("SELECT set_config('app.superuser_bypass', 'off', true)");
			await client.query("SELECT set_config('app.current_organization_id', $1, true)", [orgA]);
			await client.query("SELECT set_config('app.current_tenant', $1, true)", [orgA]);

			await client.query(
				`INSERT INTO "inventory_transfers" ("id", "sender_organization_id", "receiver_organization_id", "status", "created_at")
				 VALUES ($1, $2, $3, 'pending', now())`,
				[transferId, orgA, orgB],
			);
			await client.query(
				`INSERT INTO "inventory_transfer_items" ("id", "transfer_id", "inventory_item_id", "quantity_sent")
				 VALUES (gen_random_uuid(), $1, $2, 10)`,
				[transferId, itemId],
			);

			// Sender (orgA) sees transfer and transfer items
			const senderTransfers = await client.query('SELECT * FROM "inventory_transfers" WHERE "id" = $1', [transferId]);
			assert.equal(senderTransfers.rows.length, 1);
			const senderItems = await client.query('SELECT * FROM "inventory_transfer_items" WHERE "transfer_id" = $1', [transferId]);
			assert.equal(senderItems.rows.length, 1);

			// Receiver (orgB) also sees transfer and transfer items
			await client.query("SELECT set_config('app.current_organization_id', $1, true)", [orgB]);
			await client.query("SELECT set_config('app.current_tenant', $1, true)", [orgB]);
			const receiverTransfers = await client.query('SELECT * FROM "inventory_transfers" WHERE "id" = $1', [transferId]);
			assert.equal(receiverTransfers.rows.length, 1);
			const receiverItems = await client.query('SELECT * FROM "inventory_transfer_items" WHERE "transfer_id" = $1', [transferId]);
			assert.equal(receiverItems.rows.length, 1);

			// Third party (orgC) CANNOT see transfer or transfer items
			await client.query("SELECT set_config('app.current_organization_id', $1, true)", [orgC]);
			await client.query("SELECT set_config('app.current_tenant', $1, true)", [orgC]);
			const thirdPartyTransfers = await client.query('SELECT * FROM "inventory_transfers" WHERE "id" = $1', [transferId]);
			assert.equal(thirdPartyTransfers.rows.length, 0);
			const thirdPartyItems = await client.query('SELECT * FROM "inventory_transfer_items" WHERE "transfer_id" = $1', [transferId]);
			assert.equal(thirdPartyItems.rows.length, 0);

			// 7. Test shift_discrepancy_reports (foreign key subquery isolation via cash_shifts)
			const shiftId = "55555555-5555-4555-8555-555555555555";
			const userId = "88888888-8888-4888-8888-888888888888";
			await client.query("RESET ROLE");
			await client.query("SELECT set_config('app.superuser_bypass', 'on', true)");
			await client.query(
				`INSERT INTO "users" ("id", "organization_id", "email", "password_hash", "full_name", "role", "created_at")
				 VALUES ($1, $2, 'testcashier@example.com', 'hash', 'Тест Кассир', 'admin', now())
				 ON CONFLICT ("id") DO NOTHING`,
				[userId, orgA],
			);
			await client.query("SET LOCAL ROLE dente_rls_tester");
			await client.query("SELECT set_config('app.superuser_bypass', 'off', true)");
			await client.query("SELECT set_config('app.current_organization_id', $1, true)", [orgA]);
			await client.query("SELECT set_config('app.current_tenant', $1, true)", [orgA]);
			await client.query(
				`INSERT INTO "cash_shifts" ("id", "organization_id", "opened_by_user_id", "status", "starting_balance", "opened_at")
				 VALUES ($1, $2, $3, 'open', 0, now())`,
				[shiftId, orgA, userId],
			);
			await client.query(
				`INSERT INTO "shift_discrepancy_reports" ("id", "shift_id", "discrepancy_amount", "reason", "created_at")
				 VALUES (gen_random_uuid(), $1, -500, 'Недостача', now())`,
				[shiftId],
			);

			// OrgA sees its shift discrepancy report
			const orgAShiftReports = await client.query('SELECT * FROM "shift_discrepancy_reports" WHERE "shift_id" = $1', [shiftId]);
			assert.equal(orgAShiftReports.rows.length, 1);

			// OrgB cannot see OrgA's shift discrepancy report
			await client.query("SELECT set_config('app.current_organization_id', $1, true)", [orgB]);
			await client.query("SELECT set_config('app.current_tenant', $1, true)", [orgB]);
			const orgBShiftReports = await client.query('SELECT * FROM "shift_discrepancy_reports" WHERE "shift_id" = $1', [shiftId]);
			assert.equal(orgBShiftReports.rows.length, 0);

			await client.query("ROLLBACK");
		} catch (e) {
			await client.query("ROLLBACK").catch(() => {});
			throw e;
		} finally {
			client.release();
		}
	});

	test("WITH CHECK policy strictly rejects unauthorized cross-tenant writes with error 42501", async (ctx) => {
		if (!isDbReady) return ctx.skip("database unavailable");

		const orgA = "11111111-1111-4111-8111-111111111111";
		const orgB = "22222222-2222-4222-8222-222222222222";

		const client = await pool.connect();
		try {
			await client.query("BEGIN");
			await client.query("SET LOCAL ROLE dente_rls_tester");
			await client.query("SELECT set_config('app.superuser_bypass', 'off', true)");
			await client.query("SELECT set_config('app.current_organization_id', $1, true)", [orgA]);
			await client.query("SELECT set_config('app.current_tenant', $1, true)", [orgA]);

			// 1. Direct organization_id table: Attempt to insert row for orgB while in orgA context
			await client.query("SAVEPOINT sp1");
			await assert.rejects(
				client.query(
					`INSERT INTO "anesthesia_logs" ("id", "organization_id", "patient_id", "technique", "drug", "total_dose_mg", "max_allowed_dose_mg")
					 VALUES (gen_random_uuid(), $1, gen_random_uuid(), 'infiltration', 'articaine', 68.0, 500.0)`,
					[orgB],
				),
				(err: any) => {
					assert.equal(err.code, "42501");
					return true;
				},
			);
			await client.query("ROLLBACK TO sp1");

			// 2. Dual organization table: Attempt to insert inventory_transfers where neither sender nor receiver is orgA
			const orgC = "44444444-4444-4444-8444-444444444444";
			await client.query("SAVEPOINT sp2");
			await assert.rejects(
				client.query(
					`INSERT INTO "inventory_transfers" ("id", "sender_organization_id", "receiver_organization_id", "status", "created_at")
					 VALUES (gen_random_uuid(), $1, $2, 'pending', now())`,
					[orgB, orgC],
				),
				(err: any) => {
					assert.equal(err.code, "42501");
					return true;
				},
			);
			await client.query("ROLLBACK TO sp2");

			// 3. Subquery table: Attempt to insert shift_discrepancy_reports referencing a non-existent or foreign shift
			await client.query("SAVEPOINT sp3");
			await assert.rejects(
				client.query(
					`INSERT INTO "shift_discrepancy_reports" ("id", "shift_id", "discrepancy_amount", "reason", "created_at")
					 VALUES (gen_random_uuid(), gen_random_uuid(), -100, 'Взлом', now())`,
				),
				(err: any) => {
					assert.equal(err.code, "42501");
					return true;
				},
			);
			await client.query("ROLLBACK TO sp3");

			await client.query("ROLLBACK");
		} catch (e) {
			await client.query("ROLLBACK").catch(() => {});
			throw e;
		} finally {
			client.release();
		}
	});
});
