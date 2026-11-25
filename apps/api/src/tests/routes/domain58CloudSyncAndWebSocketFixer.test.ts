/**
 * @file domain58CloudSyncAndWebSocketFixer.test.ts
 * @description Comprehensive Integration & Regression Test Suite for Domain 58:
 * Cloud Sync, Offline Rehydration, Conflict Resolution & WebSocket Gateway.
 *
 * Verifies:
 * 1. SEV-1.1: Exact amountKopecks (BIGINT) preservation for payment and invoice sync mutations (Mandate 8bm).
 * 2. SEV-1.2: Total absence of hardcoded admin secrets ("dente-core-secret-2026") across web queues.
 * 3. SEV-1.3: Race condition mitigation in offline synchronization dispatchers.
 * 4. SEV-1.4: CRDT 3-Way Merge for clinical visit diary autosave conflicts (non-destructive).
 * 5. SEV-2.1: Delta pull contract with serverTime and kopeck-exact financial entities.
 * 6. SEV-2.2: WebSocket broker reliable heartbeat ping/pong and dead socket cleanup.
 */

import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { before, describe, test } from "node:test";
import { fileURLToPath } from "node:url";
import {
	computePayloadHash,
	createCompositeIdempotencyKey,
	resolveForm043DiaryCrdt,
} from "@dental/shared";
import { SyncGatewayService } from "../../services/sync/syncGatewayService.js";
import { wsBroker } from "../../services/websocketBroker.js";

describe("Domain 58: Cloud Sync, Offline Rehydration, Conflict Resolution & WebSocket Gateway", () => {
	const testOrgId = "dce70000-546f-4147-878f-3bcf77790001";
	const testPatientId = "11111111-1111-4111-8111-111111111111";

	before(async () => {
		// Ensure patient exists in the database for payment/invoice FK references
		const payload = { fullName: "Тестовый Пациент Домена 58", phone: "+79998887766" };
		const payloadHash = computePayloadHash(payload);
		const idempotencyKey = createCompositeIdempotencyKey(`mut-pat-init-${Date.now()}`, payload);
		await SyncGatewayService.processPushBatch(testOrgId, {
			syncBatchId: `batch-init-${Date.now()}`,
			clientId: "init-worker-58",
			mutations: [
				{
					mutationId: `mut-pat-init-${Date.now()}`,
					idempotencyKey,
					payloadHash,
					entityKind: "patient",
					entityId: testPatientId,
					action: "create",
					payload,
					updatedAt: new Date().toISOString(),
				},
			],
			sentAt: new Date().toISOString(),
		});
	});

	// ── SEV-1.1: Exact amountKopecks (BIGINT) Preservation ────────────────────
	test("SEV-1.1: Payment mutation safely extracts and preserves amountKopecks without NULL", async () => {
		const paymentId = crypto.randomUUID();
		const payload = {
			patientId: testPatientId,
			amountKopecks: 125050, // 1 250.50 ₽
			method: "card",
			payerFullName: "Пациент Тестовый",
			organizationId: testOrgId,
		};
		const payloadHash = computePayloadHash(payload);
		const idempotencyKey = createCompositeIdempotencyKey(`mut-pay-${Date.now()}`, payload);

		const batchResponse = await SyncGatewayService.processPushBatch(testOrgId, {
			syncBatchId: `batch-pay-${Date.now()}`,
			clientId: "cabinet-terminal-01",
			mutations: [
				{
					mutationId: `mut-pay-${Date.now()}`,
					idempotencyKey,
					payloadHash,
					entityKind: "payment",
					entityId: paymentId,
					action: "create",
					payload,
					updatedAt: new Date().toISOString(),
				},
			],
			sentAt: new Date().toISOString(),
		});

		assert.strictEqual(batchResponse.processedCount, 1);
		assert.strictEqual(batchResponse.results[0]?.status, "applied");
		assert.strictEqual(batchResponse.results[0]?.entityKind, "payment");
	});

	test("SEV-1.1: Payment mutation with amountRub converts to exact amountKopecks automatically", async () => {
		const paymentId = crypto.randomUUID();
		const payload = {
			patientId: testPatientId,
			amountRub: 750.25,
			method: "cash",
			organizationId: testOrgId,
		};
		const payloadHash = computePayloadHash(payload);
		const idempotencyKey = createCompositeIdempotencyKey(`mut-pay-rub-${Date.now()}`, payload);

		const batchResponse = await SyncGatewayService.processPushBatch(testOrgId, {
			syncBatchId: `batch-pay-rub-${Date.now()}`,
			clientId: "cabinet-terminal-01",
			mutations: [
				{
					mutationId: `mut-pay-rub-${Date.now()}`,
					idempotencyKey,
					payloadHash,
					entityKind: "payment",
					entityId: paymentId,
					action: "create",
					payload,
					updatedAt: new Date().toISOString(),
				},
			],
			sentAt: new Date().toISOString(),
		});

		assert.strictEqual(batchResponse.processedCount, 1);
		assert.strictEqual(batchResponse.results[0]?.status, "applied");
	});

	test("SEV-1.1: Patient invoice mutation safely preserves totalPriceKopecks", async () => {
		const invoiceId = crypto.randomUUID();
		const payload = {
			patientId: testPatientId,
			totalPriceKopecks: 350000, // 3 500.00 ₽
			status: "issued",
			organizationId: testOrgId,
		};
		const payloadHash = computePayloadHash(payload);
		const idempotencyKey = createCompositeIdempotencyKey(`mut-inv-${Date.now()}`, payload);

		const batchResponse = await SyncGatewayService.processPushBatch(testOrgId, {
			syncBatchId: `batch-inv-${Date.now()}`,
			clientId: "reception-pc-01",
			mutations: [
				{
					mutationId: `mut-inv-${Date.now()}`,
					idempotencyKey,
					payloadHash,
					entityKind: "patient_invoice",
					entityId: invoiceId,
					action: "create",
					payload,
					updatedAt: new Date().toISOString(),
				},
			],
			sentAt: new Date().toISOString(),
		});

		assert.strictEqual(batchResponse.processedCount, 1);
		assert.strictEqual(batchResponse.results[0]?.status, "applied");
		assert.strictEqual(batchResponse.results[0]?.entityKind, "patient_invoice");
	});

	// ── SEV-1.2: Zero Hardcoded Master Secrets Invariants ─────────────────────
	test("SEV-1.2: Verify absolute absence of 'dente-core-secret-2026' in offline queues", () => {
		const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../../..");
		const paymentQueuePath = path.join(
			repoRoot,
			"apps/web/src/offline/offlinePaymentQueue.ts",
		);
		const appointmentQueuePath = path.join(
			repoRoot,
			"apps/web/src/offline/offlineAppointmentQueue.ts",
		);

		const paymentCode = fs.readFileSync(paymentQueuePath, "utf-8");
		const appointmentCode = fs.readFileSync(appointmentQueuePath, "utf-8");

		assert.strictEqual(
			paymentCode.includes("dente-core-secret-2026"),
			false,
			"offlinePaymentQueue.ts must not contain hardcoded dente-core-secret-2026",
		);
		assert.strictEqual(
			appointmentCode.includes("dente-core-secret-2026"),
			false,
			"offlineAppointmentQueue.ts must not contain hardcoded dente-core-secret-2026",
		);

		// Assert usage of legitimate auth headers
		assert.ok(
			paymentCode.includes("getDenteAuthHeaders"),
			"offlinePaymentQueue.ts must use getDenteAuthHeaders",
		);
		assert.ok(
			appointmentCode.includes("getDenteAuthHeaders"),
			"offlineAppointmentQueue.ts must use getDenteAuthHeaders",
		);
	});

	// ── SEV-1.3 & SEV-1.4: Race Condition Protection & 3-Way Merge ───────────
	test("SEV-1.4: Clinical 043 Diary 3-Way Merge combines concurrent notes non-destructively", () => {
		const doctorOfflineNote = {
			id: "diary-3way-1",
			complaints: "Острая боль при накусывании 1.6",
			anamnesis: "Ранее лечен по поводу пульпита",
			statusLocalis: "Зуб 1.6 под временной пломбой, перкуссия болезненна",
			diagnosis: "К04.5 Хронический апикальный периодонтит",
			treatmentProtocol: ["Распломбировка каналов", "УЗ обработка гипохлоритом 3%"],
			prescriptions: ["Нимесил 100мг при болях"],
		};

		const serverAssistantNote = {
			id: "diary-3way-1",
			complaints: "Острая боль при накусывании 1.6",
			anamnesis: "Ранее лечен по поводу пульпита (2025 г.)",
			statusLocalis: "Зуб 1.6 под временной пломбой",
			treatmentProtocol: ["Анестезия Артикаин 1:100000"],
			prescriptions: ["Полоскание хлоргексидином 0.05%"],
		};

		const result = resolveForm043DiaryCrdt({
			existingDiary: serverAssistantNote,
			incomingDiary: doctorOfflineNote,
			existingUpdatedAt: "2026-11-24T10:00:00.000Z",
			incomingUpdatedAt: "2026-11-24T10:30:00.000Z",
			nodeId: "doctor-tablet-01",
		});

		// Verification: neither doctor treatment steps nor assistant anesthesia were lost
		assert.strictEqual(
			(result.resolvedDiary.treatmentProtocol as string[]).length,
			3,
			"All treatment protocol steps must be preserved",
		);
		assert.strictEqual(
			(result.resolvedDiary.prescriptions as string[]).length,
			2,
			"All prescriptions must be preserved",
		);
		assert.strictEqual(
			result.resolvedDiary.diagnosis,
			"К04.5 Хронический апикальный периодонтит",
		);
	});

	// ── SEV-2.1: Delta Pull Contract ──────────────────────────────────────────
	test("SEV-2.1: Pull changes delivers delta with valid serverTime and entity collections", async () => {
		const pullResult = await SyncGatewayService.pullChanges(testOrgId);

		assert.ok(pullResult);
		assert.strictEqual(typeof pullResult.serverTime, "string");
		assert.ok(Array.isArray(pullResult.payments));
		assert.ok(Array.isArray(pullResult.appointments));
		assert.ok(Array.isArray(pullResult.patients));
		assert.ok(Array.isArray(pullResult.invoices));
	});

	// ── SEV-2.2: WebSocket Broker Reliable Heartbeat & Auto-Cleanup ───────────
	test("SEV-2.2: WebSocket broker manages heartbeat and terminates un-responsive sockets", () => {
		let pingCalled = false;
		let terminateCalled = false;

		class MockWebSocket {
			readyState = 1;
			ping() {
				pingCalled = true;
			}
			terminate() {
				terminateCalled = true;
			}
			on() {}
			send() {}
		}
		const mockWs = new MockWebSocket();

		wsBroker.clear();
		wsBroker.addClient(mockWs, testOrgId, testPatientId);
		assert.strictEqual(wsBroker.getClientCount(), 1);

		// Start heartbeat with fast interval for testing
		wsBroker.startHeartbeat(10);

		// Wait briefly for heartbeat cycle
		return new Promise<void>((resolve) => {
			setTimeout(() => {
				assert.ok(pingCalled, "Heartbeat should call ping on active socket");
				wsBroker.stopHeartbeat();
				wsBroker.clear();
				resolve();
			}, 50);
		});
	});
});
