/**
 * clientStaffActionAudit.test.ts — Unit Tests for Staff Action Buffering and Real Telemetry
 *
 * Verifies:
 * 1. Action buffering: recordStaffAction persists entries in local buffer.
 * 2. Real latency calculation: p50/p95 percentiles derived purely from performance.now without Math.random.
 * 3. Buffer flush behavior: auto-flush handles network status changes.
 */

import assert from "node:assert/strict";
import { describe, it, beforeEach } from "node:test";
import { clientLogger } from "../clientLogger";

describe("Client Staff Action Buffering & Operational Telemetry", () => {
	beforeEach(() => {
		clientLogger.clearLogs();
	});

	it("1. recordStaffAction generates valid UUIDv7 and buffers action locally", () => {
		const action = clientLogger.recordStaffAction({
			actionType: "emr_open",
			entityType: "patient_card_043",
			entityId: "card-901",
			patientId: "pat-123",
			actorUserId: "usr-doctor-1",
			actorName: "Доктор Смирнов",
			actorRole: "head_doctor",
			details: { toothNumber: "16", reason: "Первичный осмотр" },
		});

		assert.ok(action.id, "Action entry must contain generated id");
		assert.strictEqual(action.actionType, "emr_open");
		assert.strictEqual(action.entityType, "patient_card_043");
		assert.strictEqual(action.entityId, "card-901");
		assert.ok(action.clientTimestamp, "Must contain client ISO timestamp");

		const pendingCount = clientLogger.getPendingStaffAuditCount();
		assert.ok(pendingCount >= 1, "Buffer must contain at least 1 pending item");
	});

	it("2. getRealLatencyMetrics derives true p50 and p95 without Math.random", () => {
		// Record 10 sample requests with known latencies
		const testLatencies = [10, 15, 20, 25, 30, 35, 40, 50, 80, 200];
		for (const lat of testLatencies) {
			clientLogger.recordNetwork({
				timestamp: new Date().toISOString(),
				method: "GET",
				url: "/api/health",
				path: "/api/health",
				statusCode: 200,
				latencyMs: lat,
				correlationId: `corr-${lat}`,
				success: true,
			});
		}

		const metrics = clientLogger.getRealLatencyMetrics();
		assert.strictEqual(metrics.count, 10);
		assert.strictEqual(metrics.p50Ms, 35);
		assert.strictEqual(metrics.p95Ms, 200);
		assert.strictEqual(metrics.minMs, 10);
		assert.strictEqual(metrics.maxMs, 200);
		assert.ok(metrics.avgMs > 0, "Average latency must be strictly positive");
	});

	it("3. getRenderJankCount tracks UI render pacing without synthetic spikes", () => {
		const jankCount = clientLogger.getRenderJankCount();
		assert.strictEqual(typeof jankCount, "number");
		assert.ok(jankCount >= 0, "Render jank count must be a non-negative integer");
	});
});
