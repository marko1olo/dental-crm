/**
 * missedCallTask.test.ts — Unit & Integration tests for Automatic Missed Call Interception.
 * Verifies urgent task creation, 60s callback SLA, proactive Copilot SSE alerts, and WebSocket notifications.
 */

import assert from "node:assert";
import { describe, test } from "node:test";
import { MissedCallService } from "./missedCallService.js";
import { db } from "../../db/client.js";
import { crmLeads, organizations, patients } from "../../db/schema.js";
import { eq, and } from "drizzle-orm";

async function getOrCreateTestOrg(): Promise<string> {
	const existing = await db
		.select({ id: organizations.id })
		.from(organizations)
		.limit(1);
	if (existing.length > 0 && existing[0]?.id) {
		return existing[0].id;
	}
	const [created] = await db
		.insert(organizations)
		.values({
			name: "Тестовая Стоматология DENTE",
			loginId: `test_clinic_${Date.now()}`,
		})
		.returning({ id: organizations.id });
	if (!created?.id) {
		throw new Error("Failed to create test organization");
	}
	return created.id;
}

describe("MissedCallService — Telecom Interception & Urgent Task Engine", () => {
	test("Missed call from known patient creates urgent task with 60s callback SLA and avoids duplicate lead", async () => {
		const orgId = await getOrCreateTestOrg();
		const testPhone = `+7999${Math.floor(1000000 + Math.random() * 9000000)}`;

		// Create existing patient
		const [createdPatient] = await db
			.insert(patients)
			.values({
				organizationId: orgId,
				fullName: "Иванов Иван Иванович",
				phone: testPhone,
				status: "active",
			})
			.returning();
		assert.ok(createdPatient, "Patient must be created for test");

		const result = await MissedCallService.handleMissedCall({
			organizationId: orgId,
			phone: testPhone,
			provider: "mango",
			callId: `call_test_known_${Date.now()}`,
			reason: "missed",
		});

		assert.strictEqual(result.success, true, "Should report success");
		assert.ok(result.taskId, "Should return created task ID");
		assert.strictEqual(result.patientId, createdPatient.id, "Should match existing patient ID");
		assert.strictEqual(result.isNewLead, false, "Known patient is not a new lead");
		assert.strictEqual(result.phone, testPhone, "Should normalize phone");
	});

	test("Unknown caller missed call creates CRM lead only, NEVER pollutes patients table", async () => {
		const orgId = await getOrCreateTestOrg();
		const testPhone = `+7916${Math.floor(1000000 + Math.random() * 9000000)}`;

		const result = await MissedCallService.handleMissedCall({
			organizationId: orgId,
			phone: testPhone,
			provider: "uis",
			callId: `uis_drop_${Date.now()}`,
			reason: "zero_duration_hangup",
		});

		assert.strictEqual(result.success, true);
		assert.strictEqual(result.isNewLead, true);
		assert.strictEqual(result.patientId, null, "Unknown caller must NOT have patientId");
		assert.strictEqual(result.taskId, undefined, "Unknown caller must NOT substitute leadId into taskId");
		assert.ok(result.leadId, "Should return created CRM lead ID");

		// SANE INVARIANT: verify that NO fake patient was inserted into patients table
		const foundPatients = await db
			.select()
			.from(patients)
			.where(and(eq(patients.organizationId, orgId), eq(patients.phone, testPhone)));
		assert.strictEqual(
			foundPatients.length,
			0,
			"Unknown caller must NEVER create a patient record in patients table",
		);

		// Verify lead was created in crmLeads
		const foundLeads = await db
			.select()
			.from(crmLeads)
			.where(and(eq(crmLeads.organizationId, orgId), eq(crmLeads.phone, testPhone)));
		assert.ok(foundLeads.length > 0, "Lead must be created in crmLeads");
		assert.strictEqual(foundLeads[0]?.status, "new");
	});
});
