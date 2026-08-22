import assert from "node:assert/strict";
import test from "node:test";
import {
	acquireDesktopVisiographImage,
	getDesktopNativeApi,
	isDesktopApp,
	listDesktopSerialPorts,
	listDesktopTwainDevices,
	printDesktopFiscalReceiptTcp,
	watchDesktopDicomFolder,
	unwatchDesktopDicomFolder,
	type DesktopNativeApi,
} from "../native/desktopBridge";
import {
	detectRuntimePlatform,
	dispatchFiscalReceiptPrint,
	dispatchStaffBiometricAuth,
	dispatchUniversalScan,
	dispatchVisiographAcquisition,
} from "../native/hardwareDispatcher";
import {
	authenticateBiometricStaff,
	getMobileNativeApi,
	isMobileApp,
	parseGs1DataMatrix,
	scanDataMatrixWithCamera,
	triggerHaptic,
	type MobileNativeApi,
} from "../native/mobileBridge";

test("Multi-Platform Native Bridges & Universal Dispatcher", async (t) => {
	await t.test("Default environment detects web_pwa when no native wrappers present", () => {
		assert.equal(isDesktopApp(), false);
		assert.equal(isMobileApp(), false);
		assert.equal(detectRuntimePlatform(), "web_pwa");
		assert.equal(getDesktopNativeApi(), null);
		assert.equal(getMobileNativeApi(), null);
	});

	await t.test("acquireDesktopVisiographImage gives clear Russian error in browser", async () => {
		const result = await acquireDesktopVisiographImage("sensor-1");
		assert.equal(result.success, false);
		assert.ok(result.error?.includes("DENTE Desktop (.exe)"));
	});

	await t.test("scanDataMatrixWithCamera gives clear guidance in web browser", async () => {
		const result = await scanDataMatrixWithCamera();
		assert.equal(result.success, false);
		assert.ok(result.error?.includes("DENTE для Android (.apk)"));
	});

	await t.test("dispatchUniversalScan safely returns fallback for 2D scanner", async () => {
		const result = await dispatchUniversalScan();
		assert.equal(result.success, false);
		assert.equal(result.source, "usb_hid");
		assert.ok(result.error?.includes("2D-сканер"));
	});

	await t.test("dispatchVisiographAcquisition safely directs to desktop app or file upload", async () => {
		const result = await dispatchVisiographAcquisition("sensor-1");
		assert.equal(result.success, false);
		assert.ok(result.error?.includes("DENTE Desktop (.exe)"));
	});

	await t.test("Simulated Desktop Windows runtime executes native bridges seamlessly", async () => {
		const originalWindowDesc = Object.getOwnPropertyDescriptor(globalThis, "window");

		const mockDesktopNative: DesktopNativeApi = {
			isDesktop: true,
			platform: "win32",
			version: "0.1.0",
			listSerialPorts: async () => [
				{ path: "COM3", manufacturer: "Silicon Labs", vendorId: "10C4", productId: "EA60" },
			],
			listTwainDevices: async () => [
				{ id: "vatech-ezsensor", name: "Vatech EzSensor Classic HD", type: "sensor", connected: true },
			],
			acquireTwainImage: async (_deviceId: string) => ({
				success: true,
				dataBase64: "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
			}),
			printFiscalReceiptTcp: async (_params) => ({
				success: true,
				fiscalSign: "9876543210",
				fiscalDocNum: "1042",
				shiftNum: 42,
				kktSerialNumber: "0010670000001234",
				printedAt: "2026-08-22T23:00:00.000Z",
			}),
			watchLocalDicomFolder: async (_folderPath, _callbackId) => ({ success: true }),
			unwatchLocalDicomFolder: async (_folderPath) => ({ success: true }),
		};

		Object.defineProperty(globalThis, "window", {
			value: {
				denteDesktopNative: mockDesktopNative,
				location: { hostname: "localhost" },
			},
			configurable: true,
			writable: true,
		});

		try {
			assert.equal(isDesktopApp(), true);
			assert.equal(detectRuntimePlatform(), "desktop_win");

			const ports = await listDesktopSerialPorts();
			assert.equal(ports.length, 1);
			assert.equal(ports[0]?.path, "COM3");

			const devices = await listDesktopTwainDevices();
			assert.equal(devices.length, 1);
			assert.equal(devices[0]?.name, "Vatech EzSensor Classic HD");

			const twainResult = await acquireDesktopVisiographImage("vatech-ezsensor");
			assert.equal(twainResult.success, true);
			assert.ok(twainResult.dataUri?.startsWith("data:image/jpeg;base64,"));

			const printResult = await dispatchFiscalReceiptPrint({
				kktHost: "192.168.1.100",
				kktPort: 5555,
				payload: {
					cashierName: "Иванова А. С.",
					items: [{ name: "Профгигиена", priceRub: 5000, quantity: 1 }],
					totalRub: 5000,
					paymentType: "card",
				},
			});
			assert.equal(printResult.success, true);
			assert.equal(printResult.fiscalSign, "9876543210");

			const watchRes = await watchDesktopDicomFolder("C:\\DenteDICOM\\Incoming", "cb-1");
			assert.equal(watchRes.success, true);

			const unwatchRes = await unwatchDesktopDicomFolder("C:\\DenteDICOM\\Incoming");
			assert.equal(unwatchRes.success, true);
		} finally {
			if (originalWindowDesc) {
				Object.defineProperty(globalThis, "window", originalWindowDesc);
			} else {
				delete (globalThis as any).window;
			}
		}
	});

	await t.test("Simulated Mobile Android runtime executes scanner and biometric bridges seamlessly", async () => {
		const originalWindowDesc = Object.getOwnPropertyDescriptor(globalThis, "window");

		const mockMobileNative: MobileNativeApi = {
			isMobileApp: true,
			platform: "android",
			appVersion: "0.1.0",
			scanBarcode: async () => ({
				success: true,
				barcode: "010460123456789021abcd123456\u001d91EE06\u001d92abcdef01234567",
				format: "DATA_MATRIX",
			}),
			authenticateBiometric: async (_prompt) => ({
				success: true,
				authenticated: true,
				biometryType: "fingerprint",
			}),
			hapticFeedback: (_type) => {},
			shareFile: async (_path, _title) => ({ success: true }),
		};

		Object.defineProperty(globalThis, "window", {
			value: {
				denteMobileNative: mockMobileNative,
				location: { hostname: "crm.dente.ru" },
			},
			configurable: true,
			writable: true,
		});

		try {
			assert.equal(isMobileApp(), true);
			assert.equal(detectRuntimePlatform(), "mobile_android");

			const scanResult = await dispatchUniversalScan();
			assert.equal(scanResult.success, true);
			assert.equal(scanResult.source, "native_camera");
			assert.equal(scanResult.format, "DATA_MATRIX");
			assert.equal(scanResult.parsedGs1?.isValidMdlp, true);
			assert.equal(scanResult.parsedGs1?.gtin, "04601234567890");

			const bioResult = await dispatchStaffBiometricAuth("Вход врача");
			assert.equal(bioResult.success, true);
			assert.equal(bioResult.authenticated, true);
			assert.equal(bioResult.biometryType, "fingerprint");
		} finally {
			if (originalWindowDesc) {
				Object.defineProperty(globalThis, "window", originalWindowDesc);
			} else {
				delete (globalThis as any).window;
			}
		}
	});
});
