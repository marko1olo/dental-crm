import assert from "node:assert/strict";
import test from "node:test";
import {
	acquireDesktopVisiographImage,
	checkDesktopUpdates,
	classifyTwainHardwareError,
	createUsbHidScannerDetector,
	getDesktopNativeApi,
	getDesktopWindowState,
	installDesktopUpdate,
	isDesktopApp,
	isUsbHidScanBurst,
	listDesktopSerialPorts,
	listDesktopTwainDevices,
	printDesktopFiscalReceiptTcp,
	subscribeDesktopUpdates,
	subscribeUsbHidScanner,
	toggleDesktopFullScreen,
	toggleDesktopKioskMode,
	watchDesktopDicomFolder,
	unwatchDesktopDicomFolder,
	type DesktopNativeApi,
} from "../native/desktopBridge";
import {
	detectRuntimePlatform,
	dispatchFiscalReceiptPrint,
	dispatchStaffBiometricAuth,
	dispatchThermalLabelPrint,
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
			printThermalLabel: async (params) => ({
				success: true,
				printedAt: "2026-08-23T10:00:00.000Z",
				printerName: params.printerName || "Xprinter XP-365B",
				silent: true,
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

			const thermalRes = await dispatchThermalLabelPrint({
				html: "<div>Sterilization #01</div>",
				silent: true,
			});
			assert.equal(thermalRes.success, true);
			assert.equal(thermalRes.silent, true);

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

	await t.test("classifyTwainHardwareError accurately identifies USB disconnects, driver crashes and timeouts", () => {
		const usbErr1 = classifyTwainHardwareError("TWRC_FAILURE: USB cable disconnected unexpectedly");
		assert.equal(usbErr1.category, "usb_disconnected");
		assert.ok(usbErr1.userFriendlyMessageRu.includes("USB-кабель"));

		const usbErr2 = classifyTwainHardwareError("TWCC_NODS: Data source not found");
		assert.equal(usbErr2.category, "usb_disconnected");
		assert.ok(usbErr2.userFriendlyMessageRu.includes("Визиограф отключен"));

		const crashErr = classifyTwainHardwareError("TWAIN_DS_FAILED: DLL driver crashed with unhandled exception");
		assert.equal(crashErr.category, "driver_crash");
		assert.ok(crashErr.userFriendlyMessageRu.includes("Сбой драйвера TWAIN"));

		const timeoutErr = classifyTwainHardwareError("Exposure timeout: No radiation detected within 15 seconds");
		assert.equal(timeoutErr.category, "exposure_timeout");
		assert.ok(timeoutErr.userFriendlyMessageRu.includes("экспозиции"));

		const cancelErr = classifyTwainHardwareError("TWRC_CANCEL: User aborted acquisition");
		assert.equal(cancelErr.category, "user_cancelled");
		assert.ok(cancelErr.userFriendlyMessageRu.includes("отменен"));
	});

	await t.test("Desktop TWAIN capture survives USB unplug and driver crash without throwing uncaught exceptions", async () => {
		const originalWindowDesc = Object.getOwnPropertyDescriptor(globalThis, "window");

		// Mock native desktop throwing simulated USB disconnection error
		const mockDisconnectNative: DesktopNativeApi = {
			isDesktop: true,
			platform: "win32",
			version: "0.1.0",
			listSerialPorts: async () => [],
			listTwainDevices: async () => [],
			acquireTwainImage: async (_deviceId: string) => {
				throw new Error("Device disconnected: USB communication link severed");
			},
			printFiscalReceiptTcp: async () => ({ success: false }),
			watchLocalDicomFolder: async () => ({ success: true }),
			unwatchLocalDicomFolder: async () => ({ success: true }),
		};

		Object.defineProperty(globalThis, "window", {
			value: {
				denteDesktopNative: mockDisconnectNative,
				location: { hostname: "localhost" },
			},
			configurable: true,
			writable: true,
		});

		try {
			const res = await acquireDesktopVisiographImage("vatech-sensor-01");
			assert.equal(res.success, false);
			assert.equal(res.errorCategory, "usb_disconnected");
			assert.ok(res.userFriendlyMessageRu?.includes("Визиограф отключен, проверьте USB-кабель"));
		} finally {
			if (originalWindowDesc) {
				Object.defineProperty(globalThis, "window", originalWindowDesc);
			} else {
				delete (globalThis as any).window;
			}
		}
	});

	await t.test("Desktop Fullscreen & Kiosk Mode controller toggles window display states safely", async () => {
		let currentFs = false;
		let currentKiosk = false;

		const mockWindowDesktop: DesktopNativeApi = {
			isDesktop: true,
			platform: "win32",
			version: "0.1.0",
			listSerialPorts: async () => [],
			listTwainDevices: async () => [],
			acquireTwainImage: async () => ({ success: true }),
			printFiscalReceiptTcp: async () => ({ success: true }),
			watchLocalDicomFolder: async () => ({ success: true }),
			unwatchLocalDicomFolder: async () => ({ success: true }),
			toggleFullScreen: async (flag) => {
				currentFs = flag !== undefined ? flag : !currentFs;
				return { isFullScreen: currentFs, isKiosk: currentKiosk, isMaximized: true };
			},
			toggleKioskMode: async (flag) => {
				currentKiosk = flag !== undefined ? flag : !currentKiosk;
				return { isFullScreen: currentKiosk, isKiosk: currentKiosk, isMaximized: true };
			},
			getWindowState: async () => ({
				isFullScreen: currentFs,
				isKiosk: currentKiosk,
				isMaximized: true,
			}),
		};

		const originalWindowDesc = Object.getOwnPropertyDescriptor(globalThis, "window");
		Object.defineProperty(globalThis, "window", {
			value: {
				denteDesktopNative: mockWindowDesktop,
				location: { hostname: "localhost" },
			},
			configurable: true,
			writable: true,
		});

		try {
			// Initial state
			const initial = await getDesktopWindowState();
			assert.equal(initial.isFullScreen, false);
			assert.equal(initial.isKiosk, false);

			// Toggle Fullscreen ON
			const fsOn = await toggleDesktopFullScreen(true);
			assert.equal(fsOn.isFullScreen, true);

			// Toggle Fullscreen OFF
			const fsOff = await toggleDesktopFullScreen(false);
			assert.equal(fsOff.isFullScreen, false);

			// Toggle Kiosk Mode ON (operatory monoblock display)
			const kioskOn = await toggleDesktopKioskMode(true);
			assert.equal(kioskOn.isKiosk, true);
			assert.equal(kioskOn.isFullScreen, true);

			// Toggle Kiosk Mode OFF
			const kioskOff = await toggleDesktopKioskMode(false);
			assert.equal(kioskOff.isKiosk, false);
		} finally {
			if (originalWindowDesc) {
				Object.defineProperty(globalThis, "window", originalWindowDesc);
			} else {
				delete (globalThis as any).window;
			}
		}
	});

	await t.test("USB HID 2D Barcode Scanner detector auto-intercepts rapid keystroke bursts (< 35ms)", async () => {
		// 1. Validate burst validator helper
		const validBurst = [
			{ key: "0", timestamp: 1000 },
			{ key: "1", timestamp: 1010 },
			{ key: "0", timestamp: 1020 },
			{ key: "4", timestamp: 1030 },
			{ key: "6", timestamp: 1042 },
		];
		assert.equal(isUsbHidScanBurst(validBurst, 35, 3), true);

		const humanTyping = [
			{ key: "0", timestamp: 1000 },
			{ key: "1", timestamp: 1200 }, // 200ms delay
			{ key: "0", timestamp: 1350 },
		];
		assert.equal(isUsbHidScanBurst(humanTyping, 35, 3), false);

		// 2. Test USB HID Detector with simulated DataMatrix scan
		const capturedEvents: any[] = [];
		const detector = createUsbHidScannerDetector({
			maxInterKeyDelayMs: 35,
			minBarcodeLength: 10,
			onScan: (ev) => capturedEvents.push(ev),
		});

		// Simulate DataMatrix code with standard GS1 separator: 010460123456789321ABCD123456789\u001d91EE06\u001d92qwe+rtyu=
		const rawMdlpCode = "010460123456789321ABCD123456789\u001d91EE06\u001d92qwe+rtyu=";
		let tTime = 10000;

		for (const char of rawMdlpCode) {
			detector.processKey(char, tTime);
			tTime += 8; // 8ms per character (typical hardware scanner speed)
		}

		// Press Enter terminator
		const result = detector.processKey("Enter", tTime + 5);
		assert.ok(result !== null);
		assert.equal(result.rawCode, rawMdlpCode);
		assert.equal(result.source, "usb_hid_scanner");
		assert.equal(result.parsedGs1.gtin, "04601234567893");
		assert.equal(result.parsedGs1.serialNumber, "ABCD123456789");
		assert.equal(result.parsedGs1.isValidMdlp, true);
		assert.equal(capturedEvents.length, 1);

		// 3. Verify human slow typing does not trigger scan event on Enter
		tTime += 500;
		detector.processKey("h", tTime);
		tTime += 150; // slow
		detector.processKey("e", tTime);
		tTime += 200; // slow
		detector.processKey("l", tTime);
		tTime += 100;
		detector.processKey("p", tTime);
		const humanEnterResult = detector.processKey("Enter", tTime + 50);

		assert.equal(humanEnterResult, null);
		assert.equal(capturedEvents.length, 1); // No new scan event

		detector.destroy();
	});

	await t.test("Desktop Silent Updates engine checks version and notifies renderer safely", async () => {
		// 1. In browser fallback
		const browserCheck = await checkDesktopUpdates();
		assert.equal(browserCheck.updateAvailable, false);
		assert.ok(browserCheck.releaseNotes?.includes("DENTE Desktop"));

		// 2. In desktop with mock electron-updater
		const mockUpdateDesktop: DesktopNativeApi = {
			isDesktop: true,
			platform: "win32",
			version: "0.1.0",
			listSerialPorts: async () => [],
			listTwainDevices: async () => [],
			acquireTwainImage: async () => ({ success: true }),
			printFiscalReceiptTcp: async () => ({ success: true }),
			watchLocalDicomFolder: async () => ({ success: true }),
			unwatchLocalDicomFolder: async () => ({ success: true }),
			checkForUpdates: async () => ({
				updateAvailable: true,
				currentVersion: "0.1.0",
				latestVersion: "0.2.0",
				releaseNotes: "Обновление модулей визиографа и печати СанПиН",
			}),
			installUpdate: async () => ({
				success: true,
				message: "Перезапуск и установка обновления...",
			}),
		};

		const originalWindowDesc = Object.getOwnPropertyDescriptor(globalThis, "window");
		Object.defineProperty(globalThis, "window", {
			value: {
				denteDesktopNative: mockUpdateDesktop,
				location: { hostname: "localhost" },
			},
			configurable: true,
			writable: true,
		});

		try {
			const checkRes = await checkDesktopUpdates();
			assert.equal(checkRes.updateAvailable, true);
			assert.equal(checkRes.currentVersion, "0.1.0");
			assert.equal(checkRes.latestVersion, "0.2.0");
			assert.ok(checkRes.releaseNotes?.includes("СанПиН"));

			const installRes = await installDesktopUpdate();
			assert.equal(installRes.success, true);
			assert.ok(installRes.message?.includes("Перезапуск"));
		} finally {
			if (originalWindowDesc) {
				Object.defineProperty(globalThis, "window", originalWindowDesc);
			} else {
				delete (globalThis as any).window;
			}
		}
	});
});
