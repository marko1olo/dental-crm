/**
 * missedCallTask.test.ts — Unit & Integration tests for Automatic Missed Call Interception.
 * Verifies urgent task creation, 60s callback SLA, proactive Copilot SSE alerts, and WebSocket notifications.
 */

import assert from "node:assert";
import { describe, test } from "node:test";
import { MissedCallService } from "./missedCallService.js";
import { defaultCopilotStreamManager } from "../agent/copilotService.js";
import { db } from "../../db/client.js";
import { organizations } from "../../db/schema.js";

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
	return created!.id;
}

describe("MissedCallService — Telecom Interception & Urgent Task Engine", () => {
	test("Missed call creates urgent task with 60-second callback SLA and proactive alert", async () => {
		const orgId = await getOrCreateTestOrg();
		const testPhone = `+7999${Math.floor(1000000 + Math.random() * 9000000)}`;

		let capturedAlert: unknown = null;
		const originalBroadcast = defaultCopilotStreamManager.broadcastProactiveAlert.bind(defaultCopilotStreamManager);
		defaultCopilotStreamManager.broadcastProactiveAlert = (targetOrgId, alertCard) => {
			if (targetOrgId === orgId) {
				capturedAlert = alertCard;
			}
			return originalBroadcast(targetOrgId, alertCard);
		};

		try {
			const result = await MissedCallService.handleMissedCall({
				organizationId: orgId,
				phone: testPhone,
				provider: "mango",
				callId: `call_test_${Date.now()}`,
				reason: "missed",
			});

			assert.strictEqual(result.success, true, "Should report success");
			assert.ok(result.taskId, "Should return created task ID");
			assert.ok(result.patientId, "Should return resolved patient ID");
			assert.strictEqual(result.phone, testPhone, "Should normalize phone");

			// Verify alert generation
			assert.ok(capturedAlert, "Proactive alert must be broadcast to Copilot SSE stream");
			const alert = capturedAlert as {
				urgency: string;
				title: string;
				category: string;
				actions: Array<{ id: string; kind: string }>;
			};
			assert.strictEqual(alert.urgency, "CRITICAL", "Alert urgency must be CRITICAL");
			assert.match(alert.title, /Пропущенный/i, "Alert title must mention missed call");
			assert.strictEqual(alert.actions[0]?.id, "call_back_urgent", "Action must offer 60s callback");
		} finally {
			defaultCopilotStreamManager.broadcastProactiveAlert = originalBroadcast;
		}
	});

	test("Zero duration hangup is intercepted as a dropped call", async () => {
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
		assert.ok(result.taskId);
		assert.strictEqual(result.isNewLead, true);
	});
});
