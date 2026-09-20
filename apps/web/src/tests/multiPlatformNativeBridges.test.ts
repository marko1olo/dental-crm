import assert from "node:assert/strict";
import test from "node:test";
import {
	CLINICAL_TOUCH_TARGETS,
	acquireDesktopVisiographImage,
	checkDesktopUpdates,
	classifyTwainHardwareError,
	createUsbHidScannerDetector,
	getDesktopNativeApi,
	getDesktopWindowState,
	installDesktopUpdate,
	isDesktopApp,
	isPwaApp,
	isWebApp,
	isUsbHidScanBurst,
	listDesktopSerialPorts,
	listDesktopTwainDevices,
	printDesktopFiscalReceiptTcp,
	registerDesktopHotkeys,
	initDesktopHotkeys,
	subscribeDesktopUpdates,
	subscribeUsbHidScanner,
	toggleDesktopFullScreen,
	toggleDesktopKioskMode,
	validateClinicalActionButtonErgonomics,
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
import {
	enqueueCard043Mutation,
	enqueuePrescriptionMutation,
	enqueueCashReceiptMutation,
	enqueueAppointmentMutation,
	saveForm043Draft,
	loadForm043Draft,
	savePrescriptionDraft,
	loadPrescriptionDraft,
	saveCashReceiptDraft,
	loadCashReceiptDraft,
	saveAppointmentDraft,
	loadAppointmentDraft,
} from "../services/offline";

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

	await t.test("Clinical Touch-First Ergonomics Validator enforces >= 48px height, >= 14px font, and visible Russian labels", () => {
		// 1. Check statutory constants
		assert.equal(CLINICAL_TOUCH_TARGETS.MIN_TOUCH_SIZE_PX, 44);
		assert.equal(CLINICAL_TOUCH_TARGETS.PRIMARY_ACTION_MIN_HEIGHT_PX, 48);
		assert.equal(CLINICAL_TOUCH_TARGETS.MOBILE_ACTION_MIN_HEIGHT_PX, 52);
		assert.equal(CLINICAL_TOUCH_TARGETS.PRIMARY_ACTION_FONT_SIZE_PX, 14);

		// 2. Valid large action button (Save, Print, Pay, Scan, Remind)
		const validButton = validateClinicalActionButtonErgonomics({
			heightPx: 48,
			fontSizePx: 14,
			hasVisibleRussianLabel: true,
		});
		assert.equal(validButton.isValid, true);
		assert.equal(validButton.issues.length, 0);

		// 3. Invalid micro button (< 48px, small font, icon-only without text)
		const invalidMicroButton = validateClinicalActionButtonErgonomics({
			heightPx: 32,
			fontSizePx: 11,
			hasVisibleRussianLabel: false,
		});
		assert.equal(invalidMicroButton.isValid, false);
		assert.equal(invalidMicroButton.issues.length, 3);
		assert.ok(invalidMicroButton.issues.some((i) => i.includes("48px")));
		assert.ok(invalidMicroButton.issues.some((i) => i.includes("14px")));
		assert.ok(invalidMicroButton.issues.some((i) => i.includes("Запрет на изолированные иконки")));
	});

	await t.test("Multi-Target Environment Detection Facade (isDesktopApp, isMobileApp, isPwaApp, isWebApp)", () => {
		const originalWindowDesc = Object.getOwnPropertyDescriptor(globalThis, "window");

		// 1. Clean default / browser environment
		assert.equal(isDesktopApp(), false);
		assert.equal(isMobileApp(), false);
		assert.equal(isPwaApp(), false);
		assert.equal(isWebApp(), true);

		// 2. Simulated Desktop (Electron / Tauri / denteDesktopNative)
		Object.defineProperty(globalThis, "window", {
			value: {
				denteDesktopNative: { isDesktop: true },
			},
			configurable: true,
			writable: true,
		});
		assert.equal(isDesktopApp(), true);
		assert.equal(isMobileApp(), false);
		assert.equal(isPwaApp(), false);
		assert.equal(isWebApp(), false);

		// 3. Simulated Mobile Android (Capacitor / denteMobileNative)
		Object.defineProperty(globalThis, "window", {
			value: {
				denteMobileNative: { isMobileApp: true },
			},
			configurable: true,
			writable: true,
		});
		assert.equal(isDesktopApp(), false);
		assert.equal(isMobileApp(), true);
		assert.equal(isPwaApp(), false);
		assert.equal(isWebApp(), false);

		// 4. Simulated PWA Standalone (display-mode: standalone)
		Object.defineProperty(globalThis, "window", {
			value: {
				matchMedia: (query: string) => ({
					matches: query.includes("display-mode: standalone"),
				}),
			},
			configurable: true,
			writable: true,
		});
		assert.equal(isDesktopApp(), false);
		assert.equal(isMobileApp(), false);
		assert.equal(isPwaApp(), true);
		assert.equal(isWebApp(), false);

		// Restore globals
		if (originalWindowDesc) {
			Object.defineProperty(globalThis, "window", originalWindowDesc);
		} else {
			delete (globalThis as any).window;
		}
	});

	await t.test("Desktop Hotkeys: F5 reload protection, Ctrl+S quick save, Ctrl+P print", async () => {
		let f5Refreshed = false;
		let cardSaved = false;
		let printed = false;
		let modalClosed = false;

		const handlers = {
			onF5Refresh: () => {
				f5Refreshed = true;
			},
			onSave: async () => {
				cardSaved = true;
			},
			onPrint: async () => {
				printed = true;
			},
			onEscape: () => {
				modalClosed = true;
			},
		};

		// Mock EventTarget
		const listeners: Record<string, ((e: any) => void)[]> = {};
		const mockTarget = {
			addEventListener: (type: string, fn: (e: any) => void) => {
				if (!listeners[type]) listeners[type] = [];
				listeners[type]!.push(fn);
			},
			removeEventListener: (type: string, fn: (e: any) => void) => {
				if (listeners[type]) {
					listeners[type] = listeners[type]!.filter((l) => l !== fn);
				}
			},
		};

		const unregister = registerDesktopHotkeys(handlers, {
			target: mockTarget as any,
			preventF5Reload: true,
		});

		const emitKey = (options: {
			key: string;
			code?: string;
			ctrlKey?: boolean;
			metaKey?: boolean;
			altKey?: boolean;
			shiftKey?: boolean;
		}) => {
			let defaultPrevented = false;
			let stopped = false;
			const event = {
				...options,
				preventDefault: () => {
					defaultPrevented = true;
				},
				stopPropagation: () => {
					stopped = true;
				},
			};
			for (const fn of listeners["keydown"] || []) {
				fn(event);
			}
			return { defaultPrevented, stopped };
		};

		// Test 1: F5 must prevent default reload and call onF5Refresh
		const f5Res = emitKey({ key: "F5", code: "F5" });
		assert.equal(f5Res.defaultPrevented, true);
		assert.equal(f5Refreshed, true);

		// Test 2: Ctrl+S must prevent default browser save and call onSave
		const saveRes = emitKey({ key: "s", code: "KeyS", ctrlKey: true });
		assert.equal(saveRes.defaultPrevented, true);
		assert.equal(cardSaved, true);

		// Test 3: Ctrl+Ы (Cyrillic layout) must also trigger save
		cardSaved = false;
		const saveRuRes = emitKey({ key: "ы", code: "KeyS", ctrlKey: true });
		assert.equal(saveRuRes.defaultPrevented, true);
		assert.equal(cardSaved, true);

		// Test 4: Ctrl+P must prevent default print and call onPrint
		const printRes = emitKey({ key: "p", code: "KeyP", ctrlKey: true });
		assert.equal(printRes.defaultPrevented, true);
		assert.equal(printed, true);

		// Test 5: Escape must close modal
		const escRes = emitKey({ key: "Escape", code: "Escape" });
		assert.equal(escRes.defaultPrevented, true);
		assert.equal(modalClosed, true);

		// Cleanup
		unregister();
		assert.equal(listeners["keydown"]?.length ?? 0, 0);
	});

	await t.test("Offline-First Clinical Operations: Form 043/u, Prescriptions 107-1/у, 54-FZ Cashier, and Appointments without blocking screen", async () => {
		// 1. Form 043/u Diary Draft & Mutation
		const draft043 = await saveForm043Draft("pat-offline-1", {
			complaints: "Острая боль зуба 1.6 при накусывании",
			diagnosisIcd10: "K04.0",
		});
		assert.ok(draft043.draftKey.includes("pat-offline-1"));
		assert.equal(draft043.entityType, "DIARY_043_DRAFT");

		const loaded043 = await loadForm043Draft("pat-offline-1");
		assert.ok(loaded043);
		assert.equal((loaded043.data as any).diagnosisIcd10, "K04.0");

		const mut043 = await enqueueCard043Mutation({
			patientId: "pat-offline-1",
			diaryData: { diagnosisIcd10: "K04.0", status: "completed" },
		});
		assert.ok(mut043.mutationId);
		assert.equal(mut043.entityType, "DIARY_043_DRAFT");
		assert.equal(mut043.status, "pending");

		// 2. Prescription (107-1/у) Draft & Mutation
		const presDraft = await savePrescriptionDraft("rx-offline-1", {
			medications: [{ name: "Амоксиклав 875/125мг", frequency: "2 раза в день", durationDays: 5 }],
		});
		assert.ok(presDraft.draftKey.includes("rx-offline-1"));

		const loadedPres = await loadPrescriptionDraft("rx-offline-1");
		assert.ok(loadedPres);

		const mutPres = await enqueuePrescriptionMutation({
			patientId: "pat-offline-1",
			prescriptionNumber: "rx-offline-1",
			formType: "107-1/у",
			medications: [{ name: "Амоксиклав 875/125мг", frequency: "2 раза в день", durationDays: 5 }],
			diagnosisIcd10: "K04.0",
		});
		assert.ok(mutPres.mutationId);
		assert.equal(mutPres.entityType, "PRESCRIPTION_107_DRAFT");
		assert.equal(mutPres.status, "pending");

		// 3. Cash Receipt (54-FZ) Draft & Mutation with kopeck exactness
		const receiptDraft = await saveCashReceiptDraft("rcpt-offline-1", {
			totalRub: 4500,
			totalKopecks: 450000,
			paymentType: "card",
		});
		assert.ok(receiptDraft.draftKey.includes("rcpt-offline-1"));

		const loadedReceipt = await loadCashReceiptDraft("rcpt-offline-1");
		assert.ok(loadedReceipt);
		assert.equal((loadedReceipt.data as any).totalKopecks, 450000);

		const mutReceipt = await enqueueCashReceiptMutation({
			patientId: "pat-offline-1",
			invoiceId: "rcpt-offline-1",
			totalRub: 4500,
			totalKopecks: 450000,
			paymentType: "card",
			items: [
				{
					name: "Лечение периодонтита 1.6",
					priceRub: 4500,
					priceKopecks: 450000,
					quantity: 1,
					code804n: "A16.07.008",
				},
			],
			isFiscalized: false,
		});
		assert.ok(mutReceipt.mutationId);
		assert.equal(mutReceipt.entityType, "CASH_RECEIPT_DRAFT");
		assert.equal(mutReceipt.status, "pending");

		// 4. Appointment Booking Draft & Mutation
		const apptDraft = await saveAppointmentDraft("appt-offline-1", {
			patientId: "pat-offline-1",
			date: "2026-09-21",
			startTime: "10:00",
		});
		assert.ok(apptDraft.draftKey.includes("appt-offline-1"));

		const loadedAppt = await loadAppointmentDraft("appt-offline-1");
		assert.ok(loadedAppt);

		const mutAppt = await enqueueAppointmentMutation({
			patientId: "pat-offline-1",
			date: "2026-09-21",
			startTime: "10:00",
			endTime: "10:45",
			durationMinutes: 45,
			serviceTitle: "Повторный осмотр",
		});
		assert.ok(mutAppt.mutationId);
		assert.equal(mutAppt.entityType, "APPOINTMENT_BOOKING_DRAFT");
		assert.equal(mutAppt.status, "pending");
	});
});
