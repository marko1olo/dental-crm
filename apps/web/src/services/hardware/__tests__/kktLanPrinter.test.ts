import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, it } from "node:test";
import type { DesktopNativeApi } from "../../../native/desktopBridge.js";
import type { FiscalReceiptPrintPayload } from "../hardwareTypes.js";
import { KktLanPrinterService } from "../kktLanPrinter.js";

describe("KktLanPrinterService — Direct LAN TCP KKT Printing (54-ФЗ)", () => {
	const originalWindow = globalThis.window;

	beforeEach(() => {
		KktLanPrinterService.setConfig({
			host: "192.168.1.150",
			port: 16732,
			protocol: "atol",
			timeoutMs: 3000,
			cashierFullName: "Иванова А. С.",
		});
	});

	afterEach(() => {
		if (originalWindow) {
			globalThis.window = originalWindow;
		} else {
			// @ts-expect-error cleanup
			delete globalThis.window;
		}
	});

	it("should maintain valid default clinic network configuration", () => {
		const cfg = KktLanPrinterService.getConfig();
		assert.equal(cfg.host, "192.168.1.150");
		assert.equal(cfg.port, 16732);
		assert.equal(cfg.protocol, "atol");
		assert.equal(cfg.cashierFullName, "Иванова А. С.");

		KktLanPrinterService.setConfig({ host: "192.168.0.88", port: 5555, protocol: "shtrih" });
		const updated = KktLanPrinterService.getConfig();
		assert.equal(updated.host, "192.168.0.88");
		assert.equal(updated.port, 5555);
		assert.equal(updated.protocol, "shtrih");
	});

	it("should compute deterministic 54-FZ QR code string compliant with Federal Tax Service (ФНС)", () => {
		const issuedAt = new Date("2026-08-23T14:30:00Z");
		const qrString = KktLanPrinterService.generate54FzQrString({
			issuedAt,
			totalRub: 4500.5,
			fnSerial: "9960440302145896",
			fiscalDocNum: "12345",
			fiscalSign: "3892019481",
			operationType: "income",
		});

		assert.ok(qrString.startsWith("t="));
		assert.ok(qrString.includes("&s=4500.50"));
		assert.ok(qrString.includes("&fn=9960440302145896"));
		assert.ok(qrString.includes("&i=12345"));
		assert.ok(qrString.includes("&fp=3892019481"));
		assert.ok(qrString.includes("&n=1"));
	});

	it("should compute deterministic fiscal sign (ФПД) hash", () => {
		const date = new Date("2026-08-23");
		const sign1 = KktLanPrinterService.computeFiscalSign("9960440302145896", "55443", date, 15000);
		const sign2 = KktLanPrinterService.computeFiscalSign("9960440302145896", "55443", date, 15000);
		const signDifferent = KktLanPrinterService.computeFiscalSign("9960440302145896", "55444", date, 15000);

		assert.equal(typeof sign1, "string");
		assert.equal(sign1.length, 10);
		assert.equal(sign1, sign2);
		assert.notEqual(sign1, signDifferent);
	});

	it("should print receipt via Electron desktop TCP bridge when available", async () => {
		const mockNativeApi: DesktopNativeApi = {
			isDesktop: true,
			platform: "win32",
			version: "0.1.0",
			listSerialPorts: async () => [],
			listTwainDevices: async () => [],
			acquireTwainImage: async () => ({ success: true }),
			printFiscalReceiptTcp: async (params) => {
				assert.equal(params.host, "192.168.1.150");
				assert.equal(params.port, 16732);
				return {
					success: true,
					fiscalSign: "1928374650",
					fiscalDocNum: "88991",
					shiftNum: 42,
					kktSerialNumber: "0010670000001234",
					printedAt: "2026-08-23T10:00:00.000Z",
				};
			},
			watchLocalDicomFolder: async () => ({ success: true }),
			unwatchLocalDicomFolder: async () => ({ success: true }),
		};

		// @ts-expect-error mock window
		globalThis.window = { denteDesktopNative: mockNativeApi };

		const payload: FiscalReceiptPrintPayload = {
			operationType: "income",
			customerContact: "+79991234567",
			cashierFullName: "Сидорова Е. В.",
			items: [
				{
					name: "Прием (осмотр, консультация) врача-стоматолога-терапевта",
					priceRub: 1500,
					quantity: 1,
					amountRub: 1500,
					medicalServiceCode804n: "A11.07.001",
				},
			],
			totalRub: 1500,
			electronicRub: 1500,
		};

		const result = await KktLanPrinterService.printReceipt(payload);

		assert.equal(result.success, true);
		assert.equal(result.status, "printed");
		assert.equal(result.fiscalSign, "1928374650");
		assert.equal(result.fiscalDocNum, "88991");
		assert.equal(result.shiftNum, 42);
		assert.ok(result.qrString);
		assert.ok(result.ofdVerificationUrl?.includes("https://ofd.ru/check"));
	});

	it("should return hardware_offline when direct TCP socket connection fails", async () => {
		const mockNativeApi: DesktopNativeApi = {
			isDesktop: true,
			platform: "win32",
			version: "0.1.0",
			listSerialPorts: async () => [],
			listTwainDevices: async () => [],
			acquireTwainImage: async () => ({ success: true }),
			printFiscalReceiptTcp: async () => ({
				success: false,
				error: "Таймаут подключения к ККТ 192.168.1.150:16732",
			}),
			watchLocalDicomFolder: async () => ({ success: true }),
			unwatchLocalDicomFolder: async () => ({ success: true }),
		};

		// @ts-expect-error mock window
		globalThis.window = { denteDesktopNative: mockNativeApi };

		const payload: FiscalReceiptPrintPayload = {
			operationType: "income",
			customerContact: "+79991234567",
			cashierFullName: "Иванова А. С.",
			items: [
				{
					name: "Лечение кариеса",
					priceRub: 4200,
					quantity: 1,
					amountRub: 4200,
				},
			],
			totalRub: 4200,
			cashRub: 4200,
		};

		const result = await KktLanPrinterService.printReceipt(payload);

		assert.equal(result.success, false);
		assert.equal(result.status, "hardware_offline");
		assert.ok(result.error?.includes("Таймаут"));
		assert.ok(result.fiscalSign);
		assert.ok(result.fiscalDocNum);
	});

	it("should perform health check on local KKT device via TCP", async () => {
		const mockNativeApi: DesktopNativeApi = {
			isDesktop: true,
			platform: "win32",
			version: "0.1.0",
			listSerialPorts: async () => [],
			listTwainDevices: async () => [],
			acquireTwainImage: async () => ({ success: true }),
			printFiscalReceiptTcp: async () => ({ success: true }),
			checkKktStatusTcp: async () => ({
				online: true,
				paperOk: true,
				coverClosed: true,
				fnPresent: true,
				fnFiscalized: true,
				latencyMs: 14,
				modelName: "АТОЛ 27Ф (LAN)",
				fnSerial: "9960440302145896",
				kktSerialNumber: "0010670000012345",
			}),
			watchLocalDicomFolder: async () => ({ success: true }),
			unwatchLocalDicomFolder: async () => ({ success: true }),
		};

		// @ts-expect-error mock window
		globalThis.window = { denteDesktopNative: mockNativeApi };

		const health = await KktLanPrinterService.checkDeviceHealth();

		assert.equal(health.online, true);
		assert.equal(health.paperOk, true);
		assert.equal(health.coverClosed, true);
		assert.equal(health.fnPresent, true);
		assert.equal(health.fnFiscalized, true);
		assert.equal(health.latencyMs, 14);
		assert.equal(health.modelName, "АТОЛ 27Ф (LAN)");
	});

	it("should trip circuit breaker to OPEN after repeated network failures and fast-fail subsequent requests", async () => {
		KktLanPrinterService.resetCircuitBreaker();

		const mockNativeApi: DesktopNativeApi = {
			isDesktop: true,
			platform: "win32",
			version: "0.1.0",
			listSerialPorts: async () => [],
			listTwainDevices: async () => [],
			acquireTwainImage: async () => ({ success: true }),
			printFiscalReceiptTcp: async () => ({
				success: false,
				error: "Сетевой сбой: Connection refused",
			}),
			watchLocalDicomFolder: async () => ({ success: true }),
			unwatchLocalDicomFolder: async () => ({ success: true }),
		};

		// @ts-expect-error mock window
		globalThis.window = { denteDesktopNative: mockNativeApi };

		const payload: FiscalReceiptPrintPayload = {
			operationType: "income",
			customerContact: "+79991234567",
			cashierFullName: "Иванова А. С.",
			items: [{ name: "Осмотр", priceRub: 500, quantity: 1, amountRub: 500 }],
			totalRub: 500,
		};

		// 1. Initial state: CLOSED
		let telemetry = KktLanPrinterService.getCircuitBreakerTelemetry();
		assert.equal(telemetry.state, "CLOSED");
		assert.equal(telemetry.consecutiveFailures, 0);

		// 2. Perform 5 consecutive failed prints to reach threshold
		for (let i = 0; i < KktLanPrinterService.FAILURE_THRESHOLD; i++) {
			await KktLanPrinterService.printReceipt(payload);
		}

		telemetry = KktLanPrinterService.getCircuitBreakerTelemetry();
		assert.equal(telemetry.state, "OPEN");
		assert.equal(telemetry.consecutiveFailures, 5);
		assert.ok(telemetry.lastFailureTime);
		assert.ok(telemetry.nextAllowedAttemptTime);

		// 3. Fast-fail while OPEN
		const fastFailResult = await KktLanPrinterService.printReceipt(payload);
		assert.equal(fastFailResult.success, false);
		assert.equal(fastFailResult.status, "hardware_offline");
		assert.match(fastFailResult.error || "", /Circuit Breaker OPEN/i);

		// 4. Reset
		KktLanPrinterService.resetCircuitBreaker();
		const resetTelemetry = KktLanPrinterService.getCircuitBreakerTelemetry();
		assert.equal(resetTelemetry.state, "CLOSED");
		assert.equal(resetTelemetry.consecutiveFailures, 0);
	});
});

