/**
 * offlineFiscalQueue.test.ts
 *
 * DENTE Dental CRM — Unit Test Suite for 54-FZ Offline Fiscal Queue & Network Resilience.
 * Mandates: 8e (Doctor/Cashier Autonomy), 8f (100% Factual Proof), 8n (Zero-Deadlock Scale).
 */

import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, it, mock } from "node:test";
import {
	clearOfflineFiscalQueue,
	deleteOfflineReceipt,
	enqueueOfflineReceipt,
	getAllOfflineReceipts,
	getOfflineReceiptById,
	getPendingOfflineReceipts,
	markReceiptFailed,
	markReceiptSynced,
	registerDefaultSyncHandler,
	subscribeOfflineFiscalQueue,
	syncPendingReceipts,
	triggerAutoSync,
	type OfflineFiscalReceipt,
} from "../services/billing/offlineFiscalQueue";

describe("Offline Fiscal Queue — 54-FZ Offline Resilience Engine", () => {
	beforeEach(async () => {
		await clearOfflineFiscalQueue();
		registerDefaultSyncHandler(null);
	});

	afterEach(async () => {
		await clearOfflineFiscalQueue();
		registerDefaultSyncHandler(null);
		mock.reset();
	});

	it("1. enqueues a new fiscal receipt with pending_fiscal_sync status", async () => {
		const payload = {
			orderId: "ord-101",
			totalSumKop: 150000,
			totalRub: 1500,
			patientId: "patient-uuid-1",
			clientContact: "+79991112233",
			idempotencyKey: "idem-key-101",
		};

		const receipt = await enqueueOfflineReceipt({
			visitId: "visit-1",
			paymentId: "pay-1",
			payload,
		});

		assert.ok(receipt.id, "Receipt must have a unique generated UUID");
		assert.equal(receipt.status, "pending_fiscal_sync");
		assert.equal(receipt.visitId, "visit-1");
		assert.equal(receipt.paymentId, "pay-1");
		assert.equal(receipt.payload.totalRub, 1500);
		assert.equal(receipt.retryCount, 0);

		const pending = await getPendingOfflineReceipts();
		assert.equal(pending.length, 1);
		assert.equal(pending[0]?.id, receipt.id);
	});

	it("2. enforces deduplication by id, paymentId, and idempotencyKey", async () => {
		const payload = {
			totalSumKop: 250000,
			idempotencyKey: "unique-mutation-12345",
		};

		// Enqueue first record
		const first = await enqueueOfflineReceipt({
			id: "static-uuid-1",
			paymentId: "pay-dedup-1",
			payload,
		});

		// 2a. Duplicate by id
		const dupeById = await enqueueOfflineReceipt({
			id: "static-uuid-1",
			payload: { ...payload, totalSumKop: 999999 },
		});
		assert.equal(dupeById.id, first.id, "Should return existing record by ID");

		// 2b. Duplicate by paymentId
		const dupeByPayment = await enqueueOfflineReceipt({
			paymentId: "pay-dedup-1",
			payload: { ...payload, totalSumKop: 888888 },
		});
		assert.equal(dupeByPayment.id, first.id, "Should return existing record by paymentId");

		// 2c. Duplicate by idempotencyKey
		const dupeByIdem = await enqueueOfflineReceipt({
			payload: { idempotencyKey: "unique-mutation-12345" },
		});
		assert.equal(dupeByIdem.id, first.id, "Should return existing record by idempotencyKey");

		const all = await getAllOfflineReceipts();
		assert.equal(all.length, 1, "Queue must contain exactly 1 deduplicated record");
	});

	it("3. transitions status from pending to synced when sync succeeds", async () => {
		const item = await enqueueOfflineReceipt({
			payload: { amountRub: 5000, cashier: "Петрова А.В." },
		});

		assert.equal(item.status, "pending_fiscal_sync");

		const synced = await markReceiptSynced(item.id);
		assert.ok(synced);
		assert.equal(synced.status, "synced");
		assert.ok(synced.syncedAt, "syncedAt timestamp must be recorded");

		const pendingAfter = await getPendingOfflineReceipts();
		assert.equal(pendingAfter.length, 0, "Synced receipt should no longer be in pending list");

		const allAfter = await getAllOfflineReceipts();
		assert.equal(allAfter.length, 1);
		assert.equal(allAfter[0]?.status, "synced");
	});

	it("4. handles retry counts and failures via markReceiptFailed", async () => {
		const item = await enqueueOfflineReceipt({
			payload: { amountRub: 3000 },
		});

		// 1st failure
		const f1 = await markReceiptFailed(item.id, "Timeout OFD response");
		assert.ok(f1);
		assert.equal(f1.retryCount, 1);
		assert.equal(f1.lastError, "Timeout OFD response");
		assert.equal(f1.status, "pending_fiscal_sync", "Should stay pending for subsequent retries");

		// Repeat failures until limit
		await markReceiptFailed(item.id, "Network drop 2");
		await markReceiptFailed(item.id, "Network drop 3");
		await markReceiptFailed(item.id, "Network drop 4");
		const f5 = await markReceiptFailed(item.id, "Permanent KKT failure");

		assert.ok(f5);
		assert.equal(f5.retryCount, 5);
		assert.equal(f5.status, "failed", "Exceeding retry threshold must mark status as failed");
	});

	it("5. syncPendingReceipts processes all pending items with syncCallback", async () => {
		const r1 = await enqueueOfflineReceipt({
			id: "sync-item-1",
			payload: { amountRub: 1000 },
		});
		const r2 = await enqueueOfflineReceipt({
			id: "sync-item-2",
			payload: { amountRub: 2000 },
		});
		const r3 = await enqueueOfflineReceipt({
			id: "sync-item-3",
			payload: { amountRub: 3000 },
		});

		const processedIds: string[] = [];
		const syncHandler = mock.fn(async (receipt: OfflineFiscalReceipt) => {
			processedIds.push(receipt.id);
			if (receipt.id === "sync-item-2") {
				return { success: false, error: "Fiscal register out of paper" };
			}
			return { success: true };
		});

		const result = await syncPendingReceipts(syncHandler);

		assert.equal(result.total, 3);
		assert.equal(result.syncedCount, 2);
		assert.equal(result.failedCount, 1);
		assert.deepEqual(processedIds, ["sync-item-1", "sync-item-2", "sync-item-3"]);

		const postR1 = await getOfflineReceiptById(r1.id);
		const postR2 = await getOfflineReceiptById(r2.id);
		const postR3 = await getOfflineReceiptById(r3.id);

		assert.equal(postR1?.status, "synced");
		assert.equal(postR2?.status, "pending_fiscal_sync");
		assert.equal(postR2?.lastError, "Fiscal register out of paper");
		assert.equal(postR3?.status, "synced");
	});

	it("6. triggers auto-sync upon 'online' event via registerDefaultSyncHandler", async () => {
		await enqueueOfflineReceipt({
			id: "auto-online-item-1",
			payload: { amountRub: 7500 },
		});

		let syncedCount = 0;
		registerDefaultSyncHandler(async () => {
			syncedCount++;
			return true;
		});

		// Trigger programmatic auto sync
		const syncRes = await triggerAutoSync();
		assert.equal(syncRes.syncedCount, 1);
		assert.equal(syncedCount, 1);

		const pending = await getPendingOfflineReceipts();
		assert.equal(pending.length, 0);

		// Emulate window online dispatch
		if (typeof window !== "undefined") {
			await enqueueOfflineReceipt({
				id: "auto-online-item-2",
				payload: { amountRub: 1200 },
			});
			window.dispatchEvent(new Event("online"));
			// Let microtask loop complete
			await new Promise((resolve) => setTimeout(resolve, 50));
			const pendingAfterEvent = await getPendingOfflineReceipts();
			assert.equal(pendingAfterEvent.length, 0);
		}
	});

	it("7. correctly deletes and clears records from the offline queue", async () => {
		const r1 = await enqueueOfflineReceipt({ id: "del-1", payload: { x: 1 } });
		const r2 = await enqueueOfflineReceipt({ id: "del-2", payload: { x: 2 } });

		let all = await getAllOfflineReceipts();
		assert.equal(all.length, 2);

		const deleted = await deleteOfflineReceipt(r1.id);
		assert.equal(deleted, true);

		all = await getAllOfflineReceipts();
		assert.equal(all.length, 1);
		assert.equal(all[0]?.id, r2.id);

		await clearOfflineFiscalQueue();
		const empty = await getAllOfflineReceipts();
		assert.equal(empty.length, 0);
	});

	it("8. notifies reactive subscribers on state mutations", async () => {
		const notifications: number[] = [];
		const unsubscribe = subscribeOfflineFiscalQueue((items) => {
			notifications.push(items.length);
		});

		// Initial subscription pushes current size
		assert.equal(notifications.length, 1);
		assert.equal(notifications[0], 0);

		await enqueueOfflineReceipt({ id: "sub-1", payload: { test: true } });
		assert.equal(notifications.length, 2);
		assert.equal(notifications[1], 1);

		await markReceiptSynced("sub-1");
		assert.equal(notifications.length, 3);

		unsubscribe();
		await enqueueOfflineReceipt({ id: "sub-2", payload: { test: 2 } });
		// No new notification after unsubscribe
		assert.equal(notifications.length, 3);
	});
});
