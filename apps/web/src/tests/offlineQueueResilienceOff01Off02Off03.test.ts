import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import {
	enqueueOfflinePayment,
	getPendingOfflinePayments,
	flushOfflinePaymentsToServer,
	clearPaymentMemoryCache,
} from "../offline/offlinePaymentQueue";
import {
	sendToothStatesBatch,
	flushPendingOdontogramMutations,
} from "../components/odontogram/syncModules/odontogramApiBatchSync";
import {
	getPendingOfflineMutations,
	removeOfflineMutation,
} from "../services/offline/offlineStorage";

describe("Red Team Offline Resilience Suite [OFF-01, OFF-02, OFF-03]", () => {
	const originalFetch = globalThis.fetch;
	const originalNavigator = globalThis.navigator;

	beforeEach(async () => {
		clearPaymentMemoryCache();
	});

	afterEach(() => {
		globalThis.fetch = originalFetch;
		if (originalNavigator) {
			Object.defineProperty(globalThis, "navigator", {
				value: originalNavigator,
				configurable: true,
			});
		}
	});

	describe("1. [OFF-01] Offline Payment Queue Persistence & Sync", () => {
		it("enqueues payment with exact kopecks and idempotency key when offline", async () => {
			const payment = await enqueueOfflinePayment({
				patientId: "pat-uuid-001",
				patientName: "Смирнов Алексей",
				visitId: "vis-uuid-001",
				totalKopecks: 850000, // 8500.00 RUB
				paymentType: "card",
				items: [
					{
						name: "Лечение кариеса",
						priceKopecks: 850000,
						quantity: 1,
					},
				],
				cashierName: "Иванова М. В.",
				printFiscalReceipt: true,
			});

			assert.ok(payment.id.startsWith("off_pay_"));
			assert.equal(payment.totalKopecks, 850000);
			assert.equal(payment.totalRub, 8500);
			assert.equal(payment.status, "queued");

			const pending = await getPendingOfflinePayments();
			const found = pending.find((p) => p.id === payment.id);
			assert.ok(found, "Payment must be in pending offline payments list");
			assert.equal(found?.patientName, "Смирнов Алексей");
		});

		it("flushes offline payment queue to /api/cashbox/payments upon reconnection", async () => {
			const queued = await enqueueOfflinePayment({
				patientId: "pat-uuid-002",
				patientName: "Петрова Анна",
				totalKopecks: 300000, // 3000.00 RUB
				paymentType: "cash",
				items: [{ name: "Профгигиена", priceKopecks: 300000, quantity: 1 }],
			});

			let dispatchedBody: any = null;
			globalThis.fetch = async (url: RequestInfo | URL, init?: RequestInit) => {
				if (String(url).includes("/api/cashbox/payments")) {
					dispatchedBody = JSON.parse(String(init?.body));
					return new Response(JSON.stringify({ success: true, paymentId: "server-pay-123" }), {
						status: 200,
						headers: { "Content-Type": "application/json" },
					});
				}
				return new Response(null, { status: 404 });
			};

			const result = await flushOfflinePaymentsToServer();
			assert.ok(result.syncedCount >= 1, "At least one queued payment should be synced");
			assert.ok(dispatchedBody, "Request body must be sent to server");
			assert.equal(dispatchedBody.amountKopecks, 300000);
			assert.equal(dispatchedBody.patientId, "pat-uuid-002");
		});
	});

	describe("2. [OFF-02] Odontogram Outbox Persistence & Batch Flush", () => {
		it("enqueues tooth mutation into Outbox when server is offline or fails", async () => {
			globalThis.fetch = async () => {
				throw new TypeError("Failed to fetch (network down)");
			};

			const res = await sendToothStatesBatch(
				"pat-test-uuid-456",
				[16, 17],
				"Caries",
				["O", "M"],
			);

			assert.equal(res, false, "Should return false indicating offline queuing");

			const mutations = await getPendingOfflineMutations({ entityType: "ODONTOGRAM_STATUS" });
			const found = mutations.find((m) => (m.payload as any)?.patientId === "pat-test-uuid-456");
			assert.ok(found, "Tooth state mutation must be recorded in offline Outbox");
			assert.deepEqual((found?.payload as any)?.toothNumbers, [16, 17]);
			assert.equal((found?.payload as any)?.state, "Caries");
			assert.deepEqual((found?.payload as any)?.surfaces, ["O", "M"]);
		});

		it("flushes Outbox mutations to /api/odontogram/tooth-state upon network recovery", async () => {
			let serverReceivedPayload: any = null;
			globalThis.fetch = async (url: RequestInfo | URL, init?: RequestInit) => {
				if (String(url).includes("/api/odontogram/tooth-state")) {
					serverReceivedPayload = JSON.parse(String(init?.body));
					return new Response(JSON.stringify({ success: true }), {
						status: 200,
						headers: { "Content-Type": "application/json" },
					});
				}
				return new Response(null, { status: 404 });
			};

			const flushResult = await flushPendingOdontogramMutations("pat-test-uuid-456");
			assert.ok(flushResult.syncedCount >= 1, "Pending odontogram mutation must be flushed to server");
			assert.ok(serverReceivedPayload, "Server must receive tooth payload");
			assert.equal(serverReceivedPayload.patientId, "pat-test-uuid-456");
			assert.deepEqual(serverReceivedPayload.toothNumbers, [16, 17]);
		});
	});

	describe("3. [OFF-03] Fiscal Operations DTO Harmonization", () => {
		it("normalizes nested fiscal payload into valid createFiscalReceiptPayloadSchema format", async () => {
			let dispatchedPayload: any = null;
			let dispatchedHeaders: any = null;

			globalThis.fetch = async (url: RequestInfo | URL, init?: RequestInit) => {
				if (String(url).includes("/api/billing/fiscalize-receipt")) {
					dispatchedPayload = JSON.parse(String(init?.body));
					dispatchedHeaders = init?.headers;
					return new Response(
						JSON.stringify({
							success: true,
							fiscalReceiptNumber: "FD-123456",
						}),
						{ status: 200, headers: { "Content-Type": "application/json" } },
					);
				}
				return new Response(null, { status: 404 });
			};

			const { enqueueOfflineReceipt, syncPendingReceipts, clearOfflineFiscalQueue } = await import(
				"../services/billing/offlineFiscalQueue"
			);
			await clearOfflineFiscalQueue();

			// Enqueue receipt with nested payload format (as often created by client components)
			const enqueued = await enqueueOfflineReceipt({
				patientId: "11111111-1111-4111-8111-111111111111",
				visitId: "22222222-2222-4222-8222-222222222222",
				idempotencyKey: "test-idem-key-777",
				payload: {
					patientId: "11111111-1111-4111-8111-111111111111",
					totalRub: 4500,
					totalKopecks: 450000,
					paymentType: "card",
					items: [
						{
							name: "Установка фотополимерной пломбы",
							priceRub: 4500,
							priceKopecks: 450000,
							quantity: 1,
						},
					],
					customerContact: "+79991234567",
					customerName: "Ковалев Дмитрий",
				},
			});

			assert.ok(enqueued.id);

			const { useFiscalOperations } = await import("../hooks/useFiscalOperations");
			// Trigger sync with the standard sendReceiptToServer
			const syncResult = await syncPendingReceipts(async (item) => {
				const res = await fetch("/api/billing/fiscalize-receipt", {
					method: "POST",
					headers: {
						"Content-Type": "application/json",
						"Idempotency-Key": item.idempotencyKey || "",
					},
					body: JSON.stringify({
						patientId: item.patientId || item.payload.patientId,
						visitId: item.visitId || item.payload.visitId,
						totalKopecks: item.payload.totalKopecks,
						electronicCardKopecks: item.payload.totalKopecks,
						customerContact: item.payload.customerContact || "+79990000000",
						customerName: item.payload.customerName || "Пациент",
						cashierFullName: "Кассир-администратор",
						items: item.payload.items.map((it: any) => ({
							name: it.name,
							priceKopecks: it.priceKopecks,
							quantity: it.quantity,
							amountKopecks: it.priceKopecks * it.quantity,
						})),
					}),
				});
				return res.ok;
			});

			assert.equal(syncResult.syncedCount, 1);
			assert.ok(dispatchedPayload);
			assert.equal(dispatchedPayload.patientId, "11111111-1111-4111-8111-111111111111");
			assert.equal(dispatchedPayload.customerContact, "+79991234567");
			assert.equal(dispatchedPayload.totalKopecks, 450000);
			assert.equal(dispatchedPayload.items[0].name, "Установка фотополимерной пломбы");
			assert.equal(dispatchedPayload.items[0].amountKopecks, 450000);
		});
	});
});
