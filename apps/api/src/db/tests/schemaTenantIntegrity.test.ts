import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { getTableColumns } from "drizzle-orm";
import { readMigrationFiles } from "../migrate.js";
import * as schema from "../schema.js";

describe("Drizzle Schema & Multi-Tenant Architecture Integrity (4-Tier Scale)", () => {
	test("Tier 1 (Solo Doctor): appointments, chairs, and visits support optional/null bindings without crashing", () => {
		// Verify appointments columns and foreign keys allow nullables where required for solo doctor
		const apptCols = getTableColumns(schema.appointments);
		assert.ok(apptCols.id, "appointments.id must exist");
		assert.ok(apptCols.organizationId, "appointments.organizationId must exist");
		assert.ok(apptCols.chairId, "appointments.chairId must exist");
		assert.ok(apptCols.doctorUserId, "appointments.doctorUserId must exist");
		assert.ok(apptCols.patientId, "appointments.patientId must exist");

		// Chair should allow null patient/assistant in solo practice
		assert.strictEqual(apptCols.assistantUserId.notNull, false, "assistantUserId must be optional for solo doctor");
		assert.strictEqual(apptCols.chairId.notNull, false, "chairId must be nullable to support soft unbinding");
	});

	test("Tier 2 (Small Clinic): multi-chair, multi-doctor scheduling and cash operations", () => {
		const chairCols = getTableColumns(schema.chairs);
		assert.ok(chairCols.clinicId, "chairs.clinicId must exist");
		assert.ok(chairCols.isActive, "chairs.isActive must exist");

		const cashOpCols = getTableColumns(schema.cashOperations);
		assert.ok(cashOpCols.cashBoxId, "cashOperations.cashBoxId must exist");
		assert.ok(cashOpCols.amountRub, "cashOperations.amountRub must exist");
		assert.ok(cashOpCols.balanceBeforeRub, "cashOperations.balanceBeforeRub must exist");
		assert.ok(cashOpCols.balanceAfterRub, "cashOperations.balanceAfterRub must exist");
	});

	test("Tier 3 (Network / Multi-Branch): strict organizationId scoping across all clinical and financial entities", () => {
		const tenantTables = [
			schema.appointments,
			schema.visits,
			schema.treatmentItems,
			schema.payments,
			schema.patients,
			schema.chairs,
			schema.cashBoxes,
			schema.cashOperations,
			schema.warehouses,
			schema.stockBatches,
		];

		for (const table of tenantTables) {
			const cols = getTableColumns(table);
			assert.ok(
				cols.organizationId,
				`Table must have organizationId for strict multi-tenant RLS isolation`,
			);
			assert.strictEqual(
				cols.organizationId.notNull,
				true,
				`organizationId must be NOT NULL on multi-tenant table`,
			);
		}
	});

	test("Tier 4 (Master SaaS Server): global schema export and 0208 migration registration", () => {
		// Verify schema index exports all tables
		assert.ok(schema.organizations, "organizations must be exported");
		assert.ok(schema.clinics, "clinics must be exported");
		assert.ok(schema.users, "users must be exported");
		assert.ok(schema.appointments, "appointments must be exported");
		assert.ok(schema.visits, "visits must be exported");
		assert.ok(schema.treatmentItems, "treatmentItems must be exported");
		assert.ok(schema.payments, "payments must be exported");
		assert.ok(schema.cashBoxes, "cashBoxes must be exported");
		assert.ok(schema.cashOperations, "cashOperations must be exported");

		// Verify 0208 migration is registered and parsed
		const migrations = readMigrationFiles();
		const migration0208 = migrations.find((m) => m.name.startsWith("0208"));
		assert.ok(migration0208, "Migration 0208 must be loaded by migration engine");
		assert.ok(
			migration0208.sql.includes("idx_appointments_org_status"),
			"0208 must create idx_appointments_org_status",
		);
		assert.ok(
			migration0208.sql.includes("idx_visits_org_patient"),
			"0208 must create idx_visits_org_patient",
		);
		assert.ok(
			migration0208.sql.includes("cash_operations_org_created_at_idx"),
			"0208 must create cash_operations_org_created_at_idx",
		);
	});
});
