import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, it } from "node:test";
import type { DesktopNativeApi } from "../../../native/desktopBridge.js";
import { FiscalReceiptQueueManager } from "../fiscalReceiptQueueManager.js";
import type { FiscalReceiptPrintPayload, RadiographyScanEvent } from "../hardwareTypes.js";
import { KktLanPrinterService } from "../kktLanPrinter.js";
import { VisiographPacsWatcherService } from "../visiographPacsWatcher.js";

describe("Hardware Integration Suite — Clinic Network & Equipment", () => {
	const originalWindow = globalThis.window;

	beforeEach(() => {
		FiscalReceiptQueueManager.clearQueue();
		FiscalReceiptQueueManager.stopAutoRetryLoop();
		VisiographPacsWatcherService.clearRecentScans();
		VisiographPacsWatcherService.bindToActivePatient(undefined, undefined);
	});

	afterEach(async () => {
		await VisiographPacsWatcherService.stopWatching();
		FiscalReceiptQueueManager.stopAutoRetryLoop();
		FiscalReceiptQueueManager.clearQueue();
		VisiographPacsWatcherService.clearRecentScans();
		if (originalWindow) {
			globalThis.window = originalWindow;
		} else {
			// @ts-expect-error cleanup
			delete globalThis.window;
		}
	});

	it("should execute complete clinic equipment workflow: payment -> offline buffering -> hardware reconnect -> visiograph scan -> patient chart link", async () => {
		let kktOnline = false;
		let printAttempts = 0;

		const mockNativeApi: DesktopNativeApi = {
			isDesktop: true,
			platform: "win32",
			version: "0.1.0",
			listSerialPorts: async () => [],
			listTwainDevices: async () => [],
			acquireTwainImage: async () => ({ success: true }),
			printFiscalReceiptTcp: async () => {
				printAttempts++;
				if (!kktOnline) {
					return {
						success: false,
						error: "Касса отключена или закончилась лента",
					};
				}
				return {
					success: true,
					fiscalSign: "9876543210",
					fiscalDocNum: "54321",
					shiftNum: 88,
					printedAt: "2026-08-23T12:00:00.000Z",
				};
			},
			checkKktStatusTcp: async () => ({
				online: kktOnline,
				paperOk: kktOnline,
				coverClosed: true,
				fnPresent: true,
				fnFiscalized: true,
				latencyMs: 12,
			}),
			watchLocalDicomFolder: async () => ({ success: true }),
			unwatchLocalDicomFolder: async () => ({ success: true }),
		};

		// @ts-expect-error mock window
		globalThis.window = { denteDesktopNative: mockNativeApi };

		// Step 1: Active Patient in Dental Operatory
		const activePatientId = "patient-ivanov-7788";
		const activeVisitId = "visit-20260823-01";
		VisiographPacsWatcherService.bindToActivePatient(activePatientId, activeVisitId);

		// Step 2: Attempt Payment & Fiscal Print while KKT is offline (e.g. paper ran out)
		const paymentPayload: FiscalReceiptPrintPayload = {
			patientId: activePatientId,
			visitId: activeVisitId,
			operationType: "income",
			customerContact: "+79995554433",
			cashierFullName: "Иванова А. С.",
			items: [
				{
					name: "Первичная консультация и прицельная рентгенография зуба 16",
					priceRub: 2200,
					quantity: 1,
					amountRub: 2200,
				},
			],
			totalRub: 2200,
			electronicRub: 2200,
		};

		const initialPrintResult = await KktLanPrinterService.printReceipt(paymentPayload);
		assert.equal(initialPrintResult.success, false);
		assert.equal(initialPrintResult.status, "hardware_offline");

		// Step 3: Buffer receipt in offline queue
		const queuedItem = FiscalReceiptQueueManager.enqueueReceipt(paymentPayload, initialPrintResult.error);
		assert.equal(queuedItem.status, "hardware_offline");
		assert.equal(FiscalReceiptQueueManager.getPendingItems().length, 1);

		// Step 4: Dental Assistant takes X-ray with Visiograph sensor
		let capturedScan: RadiographyScanEvent | null = null;
		const unwatchScan = VisiographPacsWatcherService.onNewScanDetected((scan) => {
			capturedScan = scan;
		});

		VisiographPacsWatcherService.dispatchScanEvent({
			filePath: "C:\\DentalImages\\Incoming\\IVANOV_tooth16_20260823.dcm",
			fileName: "IVANOV_tooth16_20260823.dcm",
			fileSize: 1024 * 650,
		});

		assert.ok(capturedScan);
		assert.equal((capturedScan as RadiographyScanEvent).patientId, activePatientId);
		assert.equal((capturedScan as RadiographyScanEvent).toothCode, "16");
		assert.equal((capturedScan as RadiographyScanEvent).modality, "IO");
		assert.equal((capturedScan as RadiographyScanEvent).previewReady, true);
		assert.ok((capturedScan as RadiographyScanEvent).thumbnailDataUri?.startsWith("data:image/png;base64,"));

		// Step 5: Cashier replaces paper roll -> KKT comes back online
		kktOnline = true;
		const flushResult = await FiscalReceiptQueueManager.flushAllPending();

		assert.equal(flushResult.totalProcessed, 1);
		assert.equal(flushResult.printedCount, 1);
		assert.equal(flushResult.failedCount, 0);
		assert.equal(FiscalReceiptQueueManager.getPendingItems().length, 0);

		const finishedItem = FiscalReceiptQueueManager.getAllQueuedItems()[0];
		assert.equal(finishedItem?.status, "printed");
		assert.equal(finishedItem?.lastError, null);

		unwatchScan();
	});
});
