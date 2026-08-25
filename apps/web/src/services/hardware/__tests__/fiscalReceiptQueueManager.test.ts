import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, it } from "node:test";
import type { DesktopNativeApi } from "../../../native/desktopBridge.js";
import { FiscalReceiptQueueManager } from "../fiscalReceiptQueueManager.js";
import type { FiscalReceiptPrintPayload, QueuedFiscalReceiptItem } from "../hardwareTypes.js";
import { KktLanPrinterService } from "../kktLanPrinter.js";

describe("FiscalReceiptQueueManager — 54-FZ Offline Buffer & Auto-Retry Queue", () => {
	const originalWindow = globalThis.window;

	beforeEach(() => {
		FiscalReceiptQueueManager.clearQueue();
		FiscalReceiptQueueManager.stopAutoRetryLoop();
	});

	afterEach(() => {
		FiscalReceiptQueueManager.stopAutoRetryLoop();
		FiscalReceiptQueueManager.clearQueue();
		if (originalWindow) {
			globalThis.window = originalWindow;
		} else {
			// @ts-expect-error cleanup
			delete globalThis.window;
		}
	});

	it("should enqueue receipt when KKT hardware is offline without blocking checkout", () => {
		const payload: FiscalReceiptPrintPayload = {
			operationType: "income",
			customerContact: "+79997654321",
			cashierFullName: "Иванова А. С.",
			items: [
				{
					name: "Установка пломбы светового отверждения Filtek Ultimate",
					priceRub: 5600,
					quantity: 1,
					amountRub: 5600,
					medicalServiceCode804n: "A16.07.002",
				},
			],
			totalRub: 5600,
			electronicRub: 5600,
		};

		const item = FiscalReceiptQueueManager.enqueueReceipt(payload, "ККТ недоступна (таймаут)");

		assert.ok(item.id);
		assert.equal(item.status, "hardware_offline");
		assert.equal(item.retryCount, 1);
		assert.equal(item.lastError, "ККТ недоступна (таймаут)");
		assert.equal(item.payload.totalRub, 5600);

		const pending = FiscalReceiptQueueManager.getPendingItems();
		assert.equal(pending.length, 1);
		assert.equal(pending[0]?.id, item.id);
	});

	it("should notify subscribers when new receipts are queued or updated", () => {
		const events: QueuedFiscalReceiptItem[][] = [];
		const unsubscribe = FiscalReceiptQueueManager.subscribe((items) => {
			events.push(items);
		});

		const payload: FiscalReceiptPrintPayload = {
			operationType: "income",
			customerContact: "+79990001122",
			cashierFullName: "Иванова А. С.",
			items: [{ name: "Гигиеническая чистка зубов", priceRub: 4000, quantity: 1, amountRub: 4000 }],
			totalRub: 4000,
			cashRub: 4000,
		};

		FiscalReceiptQueueManager.enqueueReceipt(payload, "Бумага закончилась");

		assert.ok(events.length >= 2);
		const lastEvent = events[events.length - 1];
		assert.equal(lastEvent?.length, 1);
		assert.equal(lastEvent?.[0]?.lastError, "Бумага закончилась");

		unsubscribe();
	});

	it("should retry single receipt and transition status to printed on success", async () => {
		let callCount = 0;
		const mockNativeApi: DesktopNativeApi = {
			isDesktop: true,
			platform: "win32",
			version: "0.1.0",
			listSerialPorts: async () => [],
			listTwainDevices: async () => [],
			acquireTwainImage: async () => ({ success: true }),
			printFiscalReceiptTcp: async () => {
				callCount++;
				return {
					success: true,
					fiscalSign: "4920194851",
					fiscalDocNum: "77665",
					shiftNum: 10,
					printedAt: "2026-08-23T11:00:00.000Z",
				};
			},
			watchLocalDicomFolder: async () => ({ success: true }),
			unwatchLocalDicomFolder: async () => ({ success: true }),
		};

		// @ts-expect-error mock window
		globalThis.window = { denteDesktopNative: mockNativeApi };

		const payload: FiscalReceiptPrintPayload = {
			operationType: "income",
			customerContact: "+79998887766",
			cashierFullName: "Иванова А. С.",
			items: [{ name: "Удаление зуба сложное", priceRub: 7500, quantity: 1, amountRub: 7500 }],
			totalRub: 7500,
			electronicRub: 7500,
		};

		const item = FiscalReceiptQueueManager.enqueueReceipt(payload, "Offline");
		assert.equal(item.status, "hardware_offline");

		let printedEventFired = false;
		FiscalReceiptQueueManager.onReceiptPrinted((printedItem, res) => {
			printedEventFired = true;
			assert.equal(printedItem.id, item.id);
			assert.equal(res.fiscalSign, "4920194851");
		});

		const retryResult = await FiscalReceiptQueueManager.retryReceipt(item.id);

		assert.equal(retryResult.success, true);
		assert.equal(retryResult.status, "printed");
		assert.equal(callCount, 1);
		assert.equal(printedEventFired, true);

		const updatedItems = FiscalReceiptQueueManager.getAllQueuedItems();
		const updatedItem = updatedItems.find((i) => i.id === item.id);
		assert.equal(updatedItem?.status, "printed");
		assert.equal(updatedItem?.retryCount, 2);
		assert.equal(updatedItem?.lastError, null);
		assert.ok(updatedItem?.printedAt);
	});

	it("should flush all pending offline receipts when KKT comes back online", async () => {
		const mockNativeApi: DesktopNativeApi = {
			isDesktop: true,
			platform: "win32",
			version: "0.1.0",
			listSerialPorts: async () => [],
			listTwainDevices: async () => [],
			acquireTwainImage: async () => ({ success: true }),
			printFiscalReceiptTcp: async () => ({
				success: true,
				fiscalSign: "3920192837",
				fiscalDocNum: "10293",
				shiftNum: 15,
				printedAt: "2026-08-23T11:30:00.000Z",
			}),
			checkKktStatusTcp: async () => ({
				online: true,
				paperOk: true,
				coverClosed: true,
				fnPresent: true,
				fnFiscalized: true,
				latencyMs: 10,
			}),
			watchLocalDicomFolder: async () => ({ success: true }),
			unwatchLocalDicomFolder: async () => ({ success: true }),
		};

		// @ts-expect-error mock window
		globalThis.window = { denteDesktopNative: mockNativeApi };

		const payload1: FiscalReceiptPrintPayload = {
			operationType: "income",
			customerContact: "+79991112233",
			cashierFullName: "Иванова А. С.",
			items: [{ name: "КТ сегмента челюсти", priceRub: 2500, quantity: 1, amountRub: 2500 }],
			totalRub: 2500,
			electronicRub: 2500,
		};
		const payload2: FiscalReceiptPrintPayload = {
			operationType: "income",
			customerContact: "+79994445566",
			cashierFullName: "Иванова А. С.",
			items: [{ name: "ОПТГ панорамный снимок", priceRub: 1800, quantity: 1, amountRub: 1800 }],
			totalRub: 1800,
			cashRub: 1800,
		};

		FiscalReceiptQueueManager.enqueueReceipt(payload1);
		FiscalReceiptQueueManager.enqueueReceipt(payload2);

		assert.equal(FiscalReceiptQueueManager.getPendingItems().length, 2);

		const flushResult = await FiscalReceiptQueueManager.flushAllPending();

		assert.equal(flushResult.totalProcessed, 2);
		assert.equal(flushResult.printedCount, 2);
		assert.equal(flushResult.failedCount, 0);
		assert.equal(FiscalReceiptQueueManager.getPendingItems().length, 0);
	});

	it("should transition receipt to Dead Letter Queue (failed) after exceeding max retry limit", async () => {
		const mockNativeApi: DesktopNativeApi = {
			isDesktop: true,
			platform: "win32",
			version: "0.1.0",
			listSerialPorts: async () => [],
			listTwainDevices: async () => [],
			acquireTwainImage: async () => ({ success: true }),
			printFiscalReceiptTcp: async () => ({
				success: false,
				error: "ККТ выключена из сети",
			}),
			watchLocalDicomFolder: async () => ({ success: true }),
			unwatchLocalDicomFolder: async () => ({ success: true }),
		};

		// @ts-expect-error mock window
		globalThis.window = { denteDesktopNative: mockNativeApi };

		const payload: FiscalReceiptPrintPayload = {
			operationType: "income",
			customerContact: "+79991112233",
			cashierFullName: "Иванова А. С.",
			items: [{ name: "Консультация", priceRub: 1000, quantity: 1, amountRub: 1000 }],
			totalRub: 1000,
			cashRub: 1000,
		};

		const item = FiscalReceiptQueueManager.enqueueReceipt(payload);

		// Exhaust retries up to max limit (10)
		for (let i = 0; i < FiscalReceiptQueueManager.MAX_RETRY_LIMIT; i++) {
			await FiscalReceiptQueueManager.retryReceipt(item.id);
		}

		const items = FiscalReceiptQueueManager.getAllQueuedItems();
		const failedItem = items.find((i) => i.id === item.id);
		assert.ok(failedItem);
		assert.equal(failedItem.status, "failed");
		assert.match(failedItem.lastError || "", /карантин|лимит попыток/i);
		assert.ok(failedItem.retryCount > FiscalReceiptQueueManager.MAX_RETRY_LIMIT);
	});

	it("should evict oldest printed receipts when queue reaches capacity", () => {
		const payload: FiscalReceiptPrintPayload = {
			operationType: "income",
			customerContact: "+79991112233",
			cashierFullName: "Иванова А. С.",
			items: [{ name: "Консультация", priceRub: 1000, quantity: 1, amountRub: 1000 }],
			totalRub: 1000,
			cashRub: 1000,
		};

		// Mock a full queue with 1 printed item and fill to capacity
		const item1 = FiscalReceiptQueueManager.enqueueReceipt(payload, "Reason", "q-oldest-1");
		// @ts-expect-error mutate status for test
		item1.status = "printed";

		const telemetryInitial = FiscalReceiptQueueManager.getQueueTelemetry();
		assert.equal(telemetryInitial.currentSize, 1);
		assert.equal(telemetryInitial.maxCapacity, FiscalReceiptQueueManager.MAX_QUEUE_CAPACITY);

		// Calculate backoff delay
		const backoff0 = FiscalReceiptQueueManager.calculateBackoffDelay(0);
		const backoff3 = FiscalReceiptQueueManager.calculateBackoffDelay(3);
		assert.ok(backoff0 >= 1000 && backoff0 <= 1500);
		assert.ok(backoff3 >= 8000 && backoff3 <= 9000);
	});
});

