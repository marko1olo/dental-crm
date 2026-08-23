/**
 * DENTE CRM — Desktop Silent Thermal Printing & Device Topology Unit Suite
 */

import assert from "node:assert/strict";
import test from "node:test";
import {
	listDesktopPrinters,
	printDesktopEscPosReceipt,
	printDesktopThermalLabel,
	type DesktopNativeApi,
} from "../native/desktopBridge";
import {
	dispatchEscPosReceiptPrint,
	dispatchThermalLabelPrint,
	detectRuntimePlatform,
} from "../native/hardwareDispatcher";
import {
	getDeviceFormFactor,
	getSafeAreaInsets,
	isMobileSmartphone,
	isTabletDevice,
} from "../native/mobileBridge";

test("Desktop Silent Thermal Printing & Multi-Platform Form Factors Suite", async (t) => {
	t.afterEach(() => {
		// Clean up window mock
		delete (globalThis as { window?: unknown }).window;
	});

	await t.test("1. listDesktopPrinters: enumerates printers and detects thermal models", async () => {
		const mockNative: Partial<DesktopNativeApi> = {
			isDesktop: true,
			platform: "win32",
			version: "0.1.0",
			listPrinters: async () => [
				{ name: "Xprinter XP-365B (Thermal)", isDefault: true, status: 0, isThermal: true },
				{ name: "Zebra ZD410 (58mm Direct Thermal)", isDefault: false, status: 0, isThermal: true },
				{ name: "HP LaserJet Pro M404dn", isDefault: false, status: 0, isThermal: false },
			],
		};

		globalThis.window = {
			denteDesktopNative: mockNative as DesktopNativeApi,
		} as unknown as Window & typeof globalThis;

		const printers = await listDesktopPrinters();
		assert.equal(printers.length, 3);
		assert.equal(printers[0]!.isThermal, true);
		assert.equal(printers[2]!.isThermal, false);
	});

	await t.test("2. printDesktopThermalLabel: executes silent print without browser dialogs", async () => {
		let printParamsReceived: unknown = null;

		const mockNative: Partial<DesktopNativeApi> = {
			isDesktop: true,
			platform: "win32",
			version: "0.1.0",
			printThermalLabel: async (params) => {
				printParamsReceived = params;
				return {
					success: true,
					printedAt: new Date().toISOString(),
					printerName: params.printerName || "Xprinter XP-365B (Thermal)",
					widthMm: params.widthMm,
					heightMm: params.heightMm,
					silent: true,
				};
			},
		};

		globalThis.window = {
			denteDesktopNative: mockNative as DesktopNativeApi,
		} as unknown as Window & typeof globalThis;

		const res = await printDesktopThermalLabel({
			printerName: "Xprinter XP-365B (Thermal)",
			silent: true,
			widthMm: 58,
			heightMm: 40,
			html: "<div>Marking #001</div>",
		});

		assert.equal(res.success, true);
		assert.equal(res.silent, true);
		assert.ok(printParamsReceived);
	});

	await t.test("3. dispatchThermalLabelPrint: routes to Desktop Silent Driver in desktop mode", async () => {
		const mockNative: Partial<DesktopNativeApi> = {
			isDesktop: true,
			platform: "win32",
			version: "0.1.0",
			printThermalLabel: async (params) => ({
				success: true,
				printedAt: "2026-08-23T10:00:00.000Z",
				printerName: params.printerName || "Xprinter",
				silent: true,
			}),
		};

		globalThis.window = {
			denteDesktopNative: mockNative as DesktopNativeApi,
		} as unknown as Window & typeof globalThis;

		assert.equal(detectRuntimePlatform(), "desktop_win");

		const printResult = await dispatchThermalLabelPrint({
			html: "<div>Kraft Package #10</div>",
			widthMm: 58,
			heightMm: 40,
			silent: true,
		});

		assert.equal(printResult.success, true);
		assert.equal(printResult.silent, true);
	});

	await t.test("4. dispatchEscPosReceiptPrint: sends silent ESC/POS receipt in desktop mode", async () => {
		const mockNative: Partial<DesktopNativeApi> = {
			isDesktop: true,
			platform: "win32",
			version: "0.1.0",
			printEscPosReceipt: async (params) => ({
				success: true,
				printedAt: "2026-08-23T10:00:00.000Z",
				target: params.host ? `tcp://${params.host}:${params.port || 9100}` : "Default ESC/POS",
				bytesSent: 196,
				silent: true,
			}),
		};

		globalThis.window = {
			denteDesktopNative: mockNative as DesktopNativeApi,
		} as unknown as Window & typeof globalThis;

		const res = await dispatchEscPosReceiptPrint({
			host: "192.168.1.200",
			port: 9100,
			text: "КЛИНИКА ДЕНТЕ\nЧек №1042\nСумма: 3000.00 руб.\n",
			silent: true,
			widthMm: 80,
			cutPaper: true,
		});

		assert.equal(res.success, true);
		assert.equal(res.silent, true);
		assert.equal(res.target, "tcp://192.168.1.200:9100");
		assert.equal(res.bytesSent, 196);
	});

	await t.test("5. Device form factor detection: distinguishes tablet vs phone vs desktop", () => {
		// Mock desktop viewport
		globalThis.window = {
			innerWidth: 1440,
			navigator: { maxTouchPoints: 0 },
		} as unknown as Window & typeof globalThis;

		assert.equal(getDeviceFormFactor(), "desktop");
		assert.equal(isTabletDevice(), false);
		assert.equal(isMobileSmartphone(), false);

		// Mock tablet viewport (e.g. iPad 1024x768 with touch)
		globalThis.window = {
			innerWidth: 1024,
			navigator: { maxTouchPoints: 5 },
		} as unknown as Window & typeof globalThis;

		assert.equal(getDeviceFormFactor(), "tablet");
		assert.equal(isTabletDevice(), true);
		assert.equal(isMobileSmartphone(), false);

		// Mock phone viewport (e.g. iPhone 390x844 with touch)
		globalThis.window = {
			innerWidth: 390,
			navigator: { maxTouchPoints: 5 },
		} as unknown as Window & typeof globalThis;

		assert.equal(getDeviceFormFactor(), "phone");
		assert.equal(isTabletDevice(), false);
		assert.equal(isMobileSmartphone(), true);
	});

	await t.test("6. getSafeAreaInsets: returns fallback zero insets in mock environment", () => {
		const insets = getSafeAreaInsets();
		assert.deepEqual(insets, { top: 0, bottom: 0, left: 0, right: 0 });
	});
});
