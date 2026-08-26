/**
 * @dental/web — Multi-Platform Hardware Bridge & IPC Unit Tests.
 *
 * Validates cross-platform runtime engine (Desktop .EXE / Mobile .APK / Web PWA):
 * 1. Desktop IPC Bridge & Hardware Communication (Serial COM, TWAIN, 54-FZ KKT, DICOM PACS).
 * 2. ATOL Driver KKT 10 & Shtrikh-M Protocol Encoding, Frame Checksums & FFD 1.2 Tags.
 * 3. 2D Barcode Scanner Stream Buffering & Clinical Code Classification (GS1 DataMatrix, EAN-13, QR, SanPiN).
 * 4. Hardware Emulators (AtolKkt10Emulator, ShtrihMKktEmulator, UsbComScannerEmulator, TwainSensorEmulator).
 * 5. Local Offline SQLite/Postgres Failover Engine for isolated clinics without internet.
 * 6. Universal Hardware Dispatcher routing across desktop, mobile and web platforms.
 */

import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, it } from "node:test";
import {
	buildAtol10ReceiptJson,
	buildAtolFiscalQrString,
	buildShtrikhCommandPacket,
	classifyBarcodeScan,
	computeShtrikhLrc,
	LocalOfflineDatabaseManager,
	parseAtol10ErrorCode,
	parseShtrikhErrorCode,
	parseShtrikhResponsePacket,
	ScannerStreamBuffer,
	type DecodedScanResult,
} from "@dental/shared/hardware";
import {
	classifyTwainHardwareError,
	detectRuntimePlatform,
	dispatchEscPosReceiptPrint,
	dispatchFiscalReceiptPrint,
	dispatchStaffBiometricAuth,
	dispatchThermalLabelPrint,
	dispatchUniversalScan,
	dispatchVisiographAcquisition,
	getDesktopLocalServerStatus,
	isDesktopApp,
	isUsbHidScanBurst,
	listDesktopPrinters,
	listDesktopSerialPorts,
	listDesktopTwainDevices,
	printDesktopAtol10FiscalReceipt,
	printDesktopEscPosReceipt,
	printDesktopFiscalReceiptTcp,
	printDesktopShtrihMFiscalReceipt,
	printDesktopThermalLabel,
	switchDesktopLocalDatabaseMode,
	type DesktopNativeApi,
} from "../native/index.js";
import {
	AtolKkt10Emulator,
	ShtrihMKktEmulator,
	TwainSensorEmulator,
	UsbComScannerEmulator,
} from "../services/hardware/hardwareEmulators.js";

describe("Multi-Platform Hardware Bridge & IPC Suite", () => {
	const originalWindow = globalThis.window;

	beforeEach(() => {
		// Reset window object before each test
		// @ts-expect-error reset window
		delete globalThis.window;
	});

	afterEach(() => {
		if (originalWindow) {
			globalThis.window = originalWindow;
		} else {
			// @ts-expect-error cleanup
			delete globalThis.window;
		}
	});

	it("1. Detects runtime platforms accurately (Desktop EXE, Mobile Android, Web PWA)", () => {
		// 1. Web PWA default
		assert.equal(detectRuntimePlatform(), "web_pwa");

		// 2. Desktop Windows (.EXE)
		(globalThis as unknown as { window: unknown }).window = {
			denteDesktopNative: {
				isDesktop: true,
				platform: "win32",
				version: "0.1.0",
			},
		};
		assert.equal(isDesktopApp(), true);
		assert.equal(detectRuntimePlatform(), "desktop_win");

		// 3. Mobile Android (.APK)
		(globalThis as unknown as { window: unknown }).window = {
			Capacitor: {
				isNativePlatform: () => true,
				getPlatform: () => "android",
			},
		};
		assert.equal(detectRuntimePlatform(), "mobile_android");
	});

	it("2. Validates ATOL Driver KKT 10 JSON formatting with 54-FZ FFD 1.2 tags and QR code generation", () => {
		const atolReq = buildAtol10ReceiptJson({
			type: "sell",
			electronical: false,
			taxationType: "usn_income",
			operator: {
				name: "Иванова А. С.",
				vatin: "770123456789",
			},
			clientInfo: {
				emailOrPhone: "+79991234567",
			},
			items: [
				{
					name: "Лечение пульпита (А16.07.002.001)",
					price: 6500.0,
					quantity: 1,
					amount: 6500.0,
					paymentMethod: "full_payment",
					paymentObject: "service",
					tax: { type: "vat_none" },
					medicalServiceCode804n: "A16.07.002.001",
				},
				{
					name: "Анестетик Ультракаин Д-С форте",
					price: 800.0,
					quantity: 1,
					amount: 800.0,
					paymentMethod: "full_payment",
					paymentObject: "goods_with_marking",
					tax: { type: "vat_none" },
					markingCode: {
						raw: "010460123456789021ABC12345919293",
						plannedStatus: 1,
					},
				},
			],
			payments: [
				{ type: "electronically", sum: 7300.0 },
			],
			total: 7300.0,
		});

		assert.ok(atolReq.request);
		const reqBody = atolReq.request as Record<string, unknown>;
		assert.equal(reqBody.type, "sell");
		assert.equal(reqBody.total, 7300.0);
		assert.equal(reqBody.taxationType, "usnIncome");

		const items = reqBody.items as Array<Record<string, unknown>>;
		assert.equal(items.length, 2);
		assert.equal(items[0]?.paymentMethod, 4); // full_payment
		assert.equal(items[0]?.paymentObject, 4); // service

		// Marking tag verification
		assert.ok(items[1]?.markingCode);
		assert.equal((items[1]?.markingCode as Record<string, unknown>).mark, "010460123456789021ABC12345919293");

		// QR code verification
		const qrString = buildAtolFiscalQrString({
			issuedAt: new Date("2026-08-26T12:00:00Z"),
			totalRub: 7300.0,
			fnSerial: "9960440302145896",
			fiscalDocNum: "10450",
			fiscalSign: "1234567890",
			operationType: "income",
		});
		assert.ok(qrString.startsWith("t="));
		assert.ok(qrString.includes("s=7300.00"));
		assert.ok(qrString.includes("fn=9960440302145896"));
		assert.ok(qrString.includes("i=10450"));
		assert.ok(qrString.includes("fp=1234567890"));
		assert.ok(qrString.endsWith("n=1"));

		// Error code mapping
		assert.ok(parseAtol10ErrorCode(1).includes("бумаги"));
		assert.ok(parseAtol10ErrorCode(2).includes("крышка"));
		assert.ok(parseAtol10ErrorCode(3).includes("24 часа"));
	});

	it("3. Validates Shtrikh-M binary frame transport, XOR LRC checksum and packet parsing", () => {
		const testPayload = new Uint8Array([0x01, 0x02, 0x03]);
		const lrc = computeShtrikhLrc(testPayload);
		assert.equal(lrc, 0x01 ^ 0x02 ^ 0x03);

		// Build packet for command 0x10 (Query status)
		const cmdPacket = buildShtrikhCommandPacket(0x10, new Uint8Array([0x1E])); // password 30
		assert.equal(cmdPacket[0], 0x02); // STX
		assert.equal(cmdPacket[2], 0x10); // Command

		// Parse valid packet
		const responsePacket = new Uint8Array([
			0x02, // STX
			0x03, // Length
			0x10, // Command
			0x00, // ReturnCode: Success
			0x01, // Operator number
			0x00, // Placeholder
		]);
		const lrcData = responsePacket.subarray(1, 5);
		responsePacket[5] = computeShtrikhLrc(lrcData);

		const parsed = parseShtrikhResponsePacket(responsePacket);
		assert.equal(parsed.success, true);
		assert.equal(parsed.commandCode, 0x10);
		assert.equal(parsed.returnCode, 0x00);

		// Error parsing
		assert.ok(parseShtrikhErrorCode(0x17).includes("бумаги"));
		assert.ok(parseShtrikhErrorCode(0x18).includes("24 часа"));
	});

	it("4. Validates 2D barcode scanner stream buffer and code classification", () => {
		const buffer = new ScannerStreamBuffer();

		// Incomplete chunk
		const chunk1 = buffer.pushChunk("DENTE:PATIENT:p-");
		assert.equal(chunk1.length, 0);

		// Complete chunk with newline delimiter
		const chunk2 = buffer.pushChunk("1042\r\n");
		assert.equal(chunk2.length, 1);
		assert.equal(chunk2[0], "DENTE:PATIENT:p-1042");

		// Classification
		const patientQr = classifyBarcodeScan("DENTE:PATIENT:p-1042", "usb_com_serial");
		assert.equal(patientQr.barcodeType, "qr_patient");
		assert.equal(patientQr.patientId, "p-1042");

		const sanpinKraft = classifyBarcodeScan("SANPIN:CSO-2026-08-23-01", "usb_com_serial");
		assert.equal(sanpinKraft.barcodeType, "sanpin_kraft");
		assert.equal(sanpinKraft.kraftPackageId, "CSO-2026-08-23-01");

		const ean13 = classifyBarcodeScan("4601234567890", "usb_com_serial");
		assert.equal(ean13.barcodeType, "ean13");

		const ean8 = classifyBarcodeScan("46123456", "usb_com_serial");
		assert.equal(ean8.barcodeType, "ean8");
	});

	it("5. Executes AtolKkt10Emulator & ShtrihMKktEmulator full lifecycle with error simulations", () => {
		const atolEmu = new AtolKkt10Emulator();

		// 1. Initial health check
		const initialStatus = atolEmu.getStatus();
		assert.equal(initialStatus.online, true);
		assert.equal(initialStatus.isPaperPresent, true);
		assert.equal(initialStatus.isShiftOpened, true);

		// 2. Successful fiscal receipt
		const printRes = atolEmu.printFiscalReceipt({
			type: "sell",
			operator: { name: "Иванова А. С." },
			items: [
				{ name: "Консультация", price: 1500, quantity: 1, amount: 1500 },
			],
			payments: [{ type: "electronically", sum: 1500 }],
			total: 1500,
		});
		assert.equal(printRes.success, true);
		assert.ok(printRes.fiscalSign);
		assert.ok(printRes.qrCode);

		// 3. Error simulation: Paper out
		atolEmu.setPaperPresent(false);
		const failedPrint = atolEmu.printFiscalReceipt({
			type: "sell",
			operator: { name: "Иванова А. С." },
			items: [{ name: "Тест", price: 100, quantity: 1, amount: 100 }],
			payments: [{ type: "cash", sum: 100 }],
			total: 100,
		});
		assert.equal(failedPrint.success, false);
		assert.equal(failedPrint.errorCode, 1);
		assert.ok(failedPrint.errorDescription?.includes("бумаги"));

		// 4. Recovery
		atolEmu.setPaperPresent(true);
		assert.equal(atolEmu.getStatus().isPaperPresent, true);

		// 5. Shtrikh-M Emulator
		const shtrihEmu = new ShtrihMKktEmulator();
		assert.equal(shtrihEmu.getStatus().online, true);

		const shtrihPrint = shtrihEmu.printReceipt({
			operatorName: "Иванова А. С.",
			operationType: 1,
			items: [{ name: "Лечение", priceKopecks: 300000, quantity: 1 }],
			totalKopecks: 300000,
		});
		assert.equal(shtrihPrint.success, true);
		assert.ok(shtrihPrint.fiscalDocNum);
		assert.ok(shtrihPrint.fiscalSign);
	});

	it("6. Validates UsbComScannerEmulator & TwainSensorEmulator in-memory operation", () => {
		const scannerEmu = new UsbComScannerEmulator();
		let scannedEvent: DecodedScanResult | null = null;

		const unsubscribe = scannerEmu.subscribe((ev) => {
			scannedEvent = ev;
		});

		scannerEmu.triggerScan("SANPIN:CSO-STERIL-001");
		assert.ok(scannedEvent);
		assert.equal((scannedEvent as DecodedScanResult).barcodeType, "sanpin_kraft");
		assert.equal((scannedEvent as DecodedScanResult).kraftPackageId, "CSO-STERIL-001");

		unsubscribe();

		// TWAIN Sensor Emulator
		const twainEmu = new TwainSensorEmulator();
		const devices = twainEmu.listDevices();
		assert.ok(devices.length >= 3);

		const vatech = devices[0];
		assert.ok(vatech);
		const capture = twainEmu.acquireImage(vatech.id, "26");
		assert.equal(capture.success, true);
		assert.equal(capture.toothCode, "26");
		assert.ok(capture.dataBase64?.startsWith("data:image/png;base64,"));
	});

	it("7. Manages local offline database failover and mutation buffer for isolated clinics", () => {
		const dbManager = new LocalOfflineDatabaseManager();

		// 1. Initial config
		assert.equal(dbManager.getConfig().engineType, "postgres_native");
		assert.equal(dbManager.getConfig().isOfflineCapable, true);

		// 2. Primary LAN Postgres connection online
		const onlineDecision = dbManager.evaluateFailover(true, true);
		assert.equal(onlineDecision.activeEngine, "postgres_native");
		assert.equal(onlineDecision.syncMode, "lan_primary_sync");
		assert.equal(onlineDecision.offlineQueueActive, false);

		// 3. Isolated clinic without internet (local Postgres healthy)
		const isolatedDecision = dbManager.evaluateFailover(true, false);
		assert.equal(isolatedDecision.activeEngine, "postgres_native");
		assert.equal(isolatedDecision.syncMode, "isolated_offline");
		assert.equal(isolatedDecision.offlineQueueActive, false);

		// 4. Hard server failure (Postgres offline) -> fallback to standalone SQLite
		const failoverDecision = dbManager.evaluateFailover(false, false);
		assert.equal(failoverDecision.activeEngine, "sqlite_standalone");
		assert.equal(failoverDecision.syncMode, "isolated_offline");
		assert.equal(failoverDecision.offlineQueueActive, true);
		assert.ok(failoverDecision.connectionString.startsWith("sqlite://"));

		// 5. Offline mutation buffering
		const mut1 = dbManager.enqueueMutation({
			organizationId: "org-dente-01",
			entityType: "visit_diary",
			entityId: "visit-101",
			action: "update",
			payloadJson: JSON.stringify({ diagnosis: "K02.1" }),
		});
		assert.equal(dbManager.getPendingMutations().length, 1);
		assert.equal(mut1.synced, false);

		// 6. Sync resolution
		dbManager.markMutationSynced(mut1.id);
		assert.equal(dbManager.getPendingMutations().length, 0);
	});

	it("8. Desktop Native Bridge wrappers and IPC calls", async () => {
		const mockNativeApi: DesktopNativeApi = {
			isDesktop: true,
			platform: "win32",
			version: "0.1.0",
			listSerialPorts: async () => [
				{ path: "COM1", manufacturer: "FTDI", vendorId: "0403" },
				{ path: "COM3", manufacturer: "Prolific", vendorId: "067B" },
			],
			listTwainDevices: async () => [
				{ id: "vatech-1", name: "Vatech EzSensor", type: "sensor", connected: true },
			],
			acquireTwainImage: async () => ({
				success: true,
				dataBase64: "iVBORw0KGgo=",
			}),
			listPrinters: async () => [
				{ name: "Xprinter XP-365B", isDefault: true, status: 0, isThermal: true },
			],
			printThermalLabel: async (p) => ({
				success: true,
				printedAt: "2026-08-26T12:00:00Z",
				printerName: p.printerName,
				silent: true,
			}),
			printEscPosReceipt: async (p) => ({
				success: true,
				printedAt: "2026-08-26T12:00:00Z",
				bytesSent: 128,
				silent: true,
			}),
			printFiscalReceiptTcp: async () => ({
				success: true,
				fiscalSign: "9876543210",
				fiscalDocNum: "1002",
				shiftNum: 42,
			}),
			printAtol10FiscalReceipt: async () => ({
				success: true,
				fiscalSign: "1122334455",
				fiscalDocNum: "2001",
			}),
			printShtrihMFiscalReceipt: async () => ({
				success: true,
				fiscalSign: "9988776655",
				fiscalDocNum: "3001",
			}),
			getLocalServerStatus: async () => ({
				isRunning: true,
				engine: "postgres_native",
				host: "127.0.0.1",
				port: 5432,
				databaseName: "dente_clinic",
				latencyMs: 3,
				canAcceptWrites: true,
				isOfflineCapable: true,
				pendingMutationsCount: 0,
				syncMode: "lan_primary_sync",
			}),
			switchLocalDatabaseMode: async (mode) => ({
				success: true,
				activeMode: mode,
			}),
			watchLocalDicomFolder: async () => ({ success: true }),
			unwatchLocalDicomFolder: async () => ({ success: true }),
		};

		// @ts-expect-error mock window
		globalThis.window = { denteDesktopNative: mockNativeApi };

		// Test serial ports listing
		const ports = await listDesktopSerialPorts();
		assert.equal(ports.length, 2);
		assert.equal(ports[0]?.path, "COM1");

		// Test TWAIN devices listing
		const twain = await listDesktopTwainDevices();
		assert.equal(twain.length, 1);
		assert.equal(twain[0]?.name, "Vatech EzSensor");

		// Test printers listing
		const printers = await listDesktopPrinters();
		assert.equal(printers.length, 1);
		assert.equal(printers[0]?.isThermal, true);

		// Test direct ATOL 10 & Shtrikh-M execution
		const atolPrint = await printDesktopAtol10FiscalReceipt({
			payload: {
				cashierName: "Иванова А. С.",
				items: [{ name: "Услуга", priceRub: 1000, quantity: 1 }],
				totalRub: 1000,
				paymentType: "card",
			},
		});
		assert.equal(atolPrint.success, true);
		assert.equal(atolPrint.fiscalDocNum, "2001");

		const shtrihPrint = await printDesktopShtrihMFiscalReceipt({
			payload: {
				cashierName: "Иванова А. С.",
				items: [{ name: "Услуга", priceRub: 1000, quantity: 1 }],
				totalRub: 1000,
				paymentType: "card",
			},
		});
		assert.equal(shtrihPrint.success, true);
		assert.equal(shtrihPrint.fiscalDocNum, "3001");

		// Test local server status & database mode switch
		const serverStatus = await getDesktopLocalServerStatus();
		assert.equal(serverStatus.isRunning, true);
		assert.equal(serverStatus.port, 5432);

		const switchResult = await switchDesktopLocalDatabaseMode("sqlite_standalone");
		assert.equal(switchResult.success, true);
		assert.equal(switchResult.activeMode, "sqlite_standalone");
	});

	it("9. TWAIN error classification translates raw device errors into friendly clinical diagnostics", () => {
		const err1 = classifyTwainHardwareError("TWCC_NODS: Data source not found or disconnected");
		assert.equal(err1.category, "usb_disconnected");
		assert.ok(err1.userFriendlyMessageRu.includes("USB-кабель"));

		const err2 = classifyTwainHardwareError("TWRC_FAILURE: Driver DS_FAILED DLL crashed");
		assert.equal(err2.category, "driver_crash");
		assert.ok(err2.userFriendlyMessageRu.includes("драйвера"));

		const err3 = classifyTwainHardwareError("Exposure time out: No radiation detected");
		assert.equal(err3.category, "exposure_timeout");
		assert.ok(err3.userFriendlyMessageRu.includes("экспозиции"));

		const err4 = classifyTwainHardwareError("TWRC_CANCEL: User aborted acquisition");
		assert.equal(err4.category, "user_cancelled");
	});

	it("10. USB HID Scanner burst timing validation", () => {
		const burstKeystrokes = [
			{ key: "0", timestamp: 1000 },
			{ key: "1", timestamp: 1020 },
			{ key: "0", timestamp: 1035 },
			{ key: "4", timestamp: 1050 },
			{ key: "6", timestamp: 1070 },
		];
		assert.equal(isUsbHidScanBurst(burstKeystrokes, 35, 3), true);

		const humanKeystrokes = [
			{ key: "0", timestamp: 1000 },
			{ key: "1", timestamp: 1200 }, // 200ms gap
			{ key: "0", timestamp: 1350 },
		];
		assert.equal(isUsbHidScanBurst(humanKeystrokes, 35, 3), false);
	});
});
