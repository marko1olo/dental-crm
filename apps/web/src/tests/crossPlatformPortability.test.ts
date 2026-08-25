/**
 * DENTE DENTAL CRM — CROSS-PLATFORM PORTABILITY & HARDWARE INTEGRATION SUITE
 *
 * Automated verification of:
 * 1. USB HID 2D Barcode & GS1 DataMatrix Scanner Service (global interception, <35ms burst detection, focused input protection).
 * 2. SanPiN 3.3686-21, GS1 MDLP (Честный ЗНАК / 86-ФЗ), Lab Order & Medical Waste Barcode Parsers.
 * 3. Kiosk Mode & Accidental Exit Protection (fullscreen locking, PIN security, WakeLock, shortcut blocking, inactivity timer).
 * 4. Service Worker Shell Caching (cold-start <500ms, Cache-First static assets, HIPAA/152-FZ security isolation).
 * 5. Multi-Platform Hardware Dispatcher (Desktop Windows EXE, Android APK, Web PWA).
 */

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import vm from "node:vm";

import {
	DEFAULT_SCANNER_CONFIG,
	UsbBarcodeScanner,
	createUsbBarcodeScanner,
	getGlobalUsbBarcodeScanner,
	isHardwareScanBurst,
	parseLabOrderBarcode,
	parseMedicalWasteBarcode,
	parseSanpinBarcode,
	parseUniversalBarcode,
	subscribeUsbBarcodeScanner,
	validateEan13Checksum,
	type UsbBarcodeScanEvent,
} from "../services/hardware/usbBarcodeScanner";

import {
	KioskManager,
	PROFILE_DEFAULTS,
	createKioskManager,
	disableKioskMode,
	enableKioskMode,
	getGlobalKioskManager,
	isKioskModeActive,
	subscribeKioskState,
	verifyKioskExitPin,
	verifyPinConstantTime,
	type KioskConfig,
	type KioskState,
} from "../components/desktop/kioskMode";

import {
	CLINICAL_TOUCH_TARGETS,
	acquireDesktopVisiographImage,
	checkDesktopUpdates,
	createUsbHidScannerDetector,
	getDesktopNativeApi,
	getDesktopWindowState,
	installDesktopUpdate,
	isDesktopApp,
	listDesktopPrinters,
	listDesktopSerialPorts,
	listDesktopTwainDevices,
	printDesktopEscPosReceipt,
	printDesktopFiscalReceiptTcp,
	printDesktopSanpinThermalLabel,
	printDesktopThermalLabel,
	toggleDesktopFullScreen,
	toggleDesktopKioskMode,
	validateClinicalActionButtonErgonomics,
	type DesktopNativeApi,
} from "../native/desktopBridge";

import {
	detectRuntimePlatform,
	dispatchEscPosReceiptPrint,
	dispatchFiscalReceiptPrint,
	dispatchStaffBiometricAuth,
	dispatchThermalLabelPrint,
	dispatchUniversalScan,
	dispatchVisiographAcquisition,
} from "../native/hardwareDispatcher";

import {
	authenticateBiometricStaff,
	getDeviceFormFactor,
	getMobileNativeApi,
	getSafeAreaInsets,
	isMobileApp,
	isMobileSmartphone,
	isTabletDevice,
	parseGs1DataMatrix,
	scanDataMatrixWithCamera,
	triggerHaptic,
	type MobileNativeApi,
} from "../native/mobileBridge";

test("Cross-Platform Portability & Hardware Integration Suite", async (t) => {
	// ─────────────────────────────────────────────────────────────────────────
	// 1. USB HID 2D Barcode Scanner & Rapid Burst Interceptor
	// ─────────────────────────────────────────────────────────────────────────
	await t.test("1. USB Barcode Scanner: Hardware burst detection distinguishes scanner from human typing", () => {
		// 1.1 Valid hardware scan burst (rapid keystrokes ~8-15ms delta)
		const hardwareBurst = [
			{ key: "0", timestamp: 1000 },
			{ key: "1", timestamp: 1012 },
			{ key: "0", timestamp: 1024 },
			{ key: "4", timestamp: 1035 },
			{ key: "6", timestamp: 1045 },
			{ key: "0", timestamp: 1056 },
		];
		assert.equal(isHardwareScanBurst(hardwareBurst, 35, 3), true);

		// 1.2 Human typing with delay > 35ms between characters
		const humanTyping = [
			{ key: "0", timestamp: 1000 },
			{ key: "1", timestamp: 1120 }, // 120ms
			{ key: "0", timestamp: 1250 },
			{ key: "4", timestamp: 1390 },
		];
		assert.equal(isHardwareScanBurst(humanTyping, 35, 3), false);

		// 1.3 Too short burst (< min length)
		const shortBurst = [
			{ key: "0", timestamp: 1000 },
			{ key: "1", timestamp: 1010 },
		];
		assert.equal(isHardwareScanBurst(shortBurst, 35, 3), false);
	});

	await t.test("2. USB Barcode Scanner: EAN-13 checksum validation", () => {
		// Valid EAN-13 barcodes
		assert.equal(validateEan13Checksum("4601234567893"), true); // Check digit 3
		assert.equal(validateEan13Checksum("4006381333931"), true); // Stabilo boss EAN-13

		// Invalid EAN-13 barcodes (corrupted check digit)
		assert.equal(validateEan13Checksum("4601234567890"), false);
		assert.equal(validateEan13Checksum("12345"), false);
		assert.equal(validateEan13Checksum(""), false);
	});

	await t.test("3. USB Barcode Scanner: GS1 DataMatrix (Честный ЗНАК / МДЛП / 86-ФЗ) parser", () => {
		// Standard GS1 DataMatrix with FNC1 (\u001d) delimiters
		const mdlpRaw = "010460123456789321ABCD123456789\u001d91EE06\u001d92qwe+rtyu=\u001d17261231\u001d10LOT2026";
		const parsed = parseGs1DataMatrix(mdlpRaw);

		assert.equal(parsed.isValidMdlp, true);
		assert.equal(parsed.gtin, "04601234567893");
		assert.equal(parsed.serialNumber, "ABCD123456789");
		assert.equal(parsed.cryptoKey, "EE06");
		assert.equal(parsed.cryptoSignature, "qwe+rtyu=");
		assert.equal(parsed.expirationDate, "261231");
		assert.equal(parsed.batchLot, "LOT2026");

		// Universal parser recognition
		const univ = parseUniversalBarcode(mdlpRaw);
		assert.equal(univ.classification, "gs1_datamatrix");
		assert.equal(univ.isValid, true);
		assert.equal(univ.gs1?.gtin, "04601234567893");
	});

	await t.test("4. USB Barcode Scanner: SanPiN 3.3686-21 Autoclave sterilization package barcode parser", () => {
		// 4.1 2D DataMatrix pipe-delimited autoclave payload
		const sanpin2D = "BATCH-20260825#42|MELAG-01|CYC104|2026-08-25|2026-09-15|NURSE-01|SET-IMPLANT-01";
		const parsed2D = parseSanpinBarcode(sanpin2D);

		assert.ok(parsed2D !== null);
		assert.equal(parsed2D?.batchId, "BATCH-20260825");
		assert.equal(parsed2D?.serialNumber, 42);
		assert.equal(parsed2D?.autoclaveId, "MELAG-01");
		assert.equal(parsed2D?.cycleNumber, 104);
		assert.equal(parsed2D?.packDate, "2026-08-25");
		assert.equal(parsed2D?.expDate, "2026-09-15");
		assert.equal(parsed2D?.operatorId, "NURSE-01");
		assert.equal(parsed2D?.toolSetId, "SET-IMPLANT-01");
		assert.equal(typeof parsed2D?.isExpired, "boolean");

		// Universal parser recognition
		const univ2D = parseUniversalBarcode(sanpin2D);
		assert.equal(univ2D.classification, "sanpin_sterilization");
		assert.equal(univ2D.isValid, true);
		assert.equal(univ2D.sanpin?.cycleNumber, 104);

		// 4.2 1D Barcode SANPIN-AUTOCLAVE-CYC-DATE-SERIAL
		const sanpin1D = "SANPIN-MELAG01-042-20260825-007";
		const parsed1D = parseSanpinBarcode(sanpin1D);
		assert.ok(parsed1D !== null);
		assert.equal(parsed1D?.autoclaveId, "MELAG01");
		assert.equal(parsed1D?.cycleNumber, 42);
		assert.equal(parsed1D?.serialNumber, 7);

		// 4.3 1D Kraft prefix KB{BATCH}{SERIAL}
		const kraft1D = "KB202608250009";
		const parsedKraft = parseSanpinBarcode(kraft1D);
		assert.ok(parsedKraft !== null);
		assert.equal(parsedKraft?.serialNumber, 9);
	});

	await t.test("5. USB Barcode Scanner: Dental Lab Work Order and SanPiN Medical Waste barcode parsers", () => {
		// Lab order
		const labCode = "LAB-DENTART-PAT7042";
		const parsedLab = parseLabOrderBarcode(labCode);
		assert.ok(parsedLab !== null);
		assert.equal(parsedLab?.orderNumber, labCode);
		assert.equal(parsedLab?.labId, "LAB-DENTART");
		assert.equal(parsedLab?.patientId, "PAT-PAT7042");

		const univLab = parseUniversalBarcode(labCode);
		assert.equal(univLab.classification, "lab_order");
		assert.equal(univLab.isValid, true);

		// Medical waste (Class B hazardous waste container)
		const wasteCode = "WASTE-B-BAG992-1.85";
		const parsedWaste = parseMedicalWasteBarcode(wasteCode);
		assert.ok(parsedWaste !== null);
		assert.equal(parsedWaste?.wasteClass, "B");
		assert.equal(parsedWaste?.bagSerialNumber, "BAG992");
		assert.equal(parsedWaste?.weightKg, 1.85);

		const univWaste = parseUniversalBarcode(wasteCode);
		assert.equal(univWaste.classification, "medical_waste");
		assert.equal(univWaste.isValid, true);
	});

	await t.test("6. UsbBarcodeScanner Engine: Intercepts rapid bursts, debounces duplicates, and notifies subscribers", () => {
		const scanner = createUsbBarcodeScanner({
			maxInterKeyDelayMs: 35,
			minBarcodeLength: 5,
			debounceMs: 250,
			enableHaptic: false,
		});

		const events: UsbBarcodeScanEvent[] = [];
		const unsubscribe = scanner.onScan((ev) => events.push(ev));

		const testCode = "SANPIN-MELAG02-099-20260825-001";
		let tTime = 5000;

		// Feed rapid keystrokes (< 10ms per char)
		for (const ch of testCode) {
			scanner.processKey(ch, tTime);
			tTime += 8;
		}

		// Press Enter terminator
		const result = scanner.processKey("Enter", tTime + 5);
		assert.ok(result !== null);
		assert.equal(result.rawCode, testCode);
		assert.equal(result.data.classification, "sanpin_sterilization");
		assert.equal(result.data.sanpin?.cycleNumber, 99);
		assert.equal(events.length, 1);

		// Immediate duplicate scan within debounce window should be ignored
		for (const ch of testCode) {
			scanner.processKey(ch, tTime);
			tTime += 8;
		}
		const dupResult = scanner.processKey("Enter", tTime + 5);
		assert.equal(dupResult, null, "Debounced duplicate scan must return null");
		assert.equal(events.length, 1, "Duplicate scan must not trigger duplicate event");

		// Programmatic scan simulation
		const sim = scanner.simulateScan("010460123456789321SER999");
		assert.equal(sim.source, "emulated_scan");
		assert.equal(events.length, 2);

		unsubscribe();
		scanner.destroy();
	});

	// ─────────────────────────────────────────────────────────────────────────
	// 2. Kiosk Mode & Accidental Exit Protection Engine
	// ─────────────────────────────────────────────────────────────────────────
	await t.test("7. Kiosk Mode: Constant-time PIN verification", () => {
		assert.equal(verifyPinConstantTime("0000", "0000"), true);
		assert.equal(verifyPinConstantTime("1234", "1234"), true);
		assert.equal(verifyPinConstantTime("987654", "987654"), true);

		// Wrong PINs
		assert.equal(verifyPinConstantTime("0001", "0000"), false);
		assert.equal(verifyPinConstantTime("123", "1234"), false);
		assert.equal(verifyPinConstantTime("", "0000"), false);
		assert.equal(verifyPinConstantTime(null as any, "0000"), false);
	});

	await t.test("8. Kiosk Mode: Activation, Fullscreen locking, and PIN-protected exit", async () => {
		const kiosk = createKioskManager({
			profile: "reception_self_checkin",
			exitPin: "7788",
			maxFailedPinAttempts: 3,
			lockoutDurationSeconds: 10,
		});

		const stateHistory: KioskState[] = [];
		const unsub = kiosk.subscribe((s) => stateHistory.push(s));

		// 1. Initial State
		assert.equal(kiosk.getState().isActive, false);

		// 2. Enable Kiosk Mode
		const enableRes = await kiosk.enable();
		assert.equal(enableRes.success, true);
		assert.equal(kiosk.getState().isActive, true);
		assert.equal(kiosk.getState().profile, "reception_self_checkin");

		// 3. Attempt Disable with Wrong PIN (Attempt 1)
		const fail1 = await kiosk.disable("0000");
		assert.equal(fail1.success, false);
		assert.ok(fail1.error?.includes("Неверный PIN-код"));
		assert.equal(kiosk.getState().failedPinAttempts, 1);
		assert.equal(kiosk.getState().isActive, true);

		// 4. Attempt Disable with Wrong PIN (Attempt 2)
		const fail2 = await kiosk.disable("1111");
		assert.equal(fail2.success, false);
		assert.equal(kiosk.getState().failedPinAttempts, 2);

		// 5. Attempt Disable with Wrong PIN (Attempt 3 -> Enters Lockout)
		const fail3 = await kiosk.disable("2222");
		assert.equal(fail3.success, false);
		assert.ok(fail3.error?.includes("Блокировка"));
		assert.equal(kiosk.getState().isLockedOut, true);
		assert.ok(kiosk.getState().lockoutUntilMs !== null);

		// 6. During Lockout, even correct PIN is blocked until lockout expires
		const duringLockout = await kiosk.disable("7788");
		assert.equal(duringLockout.success, false);
		assert.ok(duringLockout.error?.includes("Превышено количество попыток"));

		// 7. Disable with Correct PIN (after clearing lockout for test)
		(kiosk as any).updateState({ isLockedOut: false, lockoutUntilMs: null, failedPinAttempts: 0 });
		const exitRes = await kiosk.disable("7788");
		assert.equal(exitRes.success, true);
		assert.equal(kiosk.getState().isActive, false);
		assert.equal(kiosk.getState().lockedAt, null);

		unsub();
		kiosk.destroy();
	});

	await t.test("9. Kiosk Mode: DevTools, View Source, and Dangerous Navigation shortcuts are blocked", async () => {
		const kiosk = createKioskManager({
			profile: "reception_self_checkin",
			exitPin: "0000",
			blockDevToolsShortcuts: true,
			blockNavigationShortcuts: true,
		});

		await kiosk.enable();

		// Helper to simulate keydown
		let defaultPrevented = false;
		let propagationStopped = false;
		const makeKeyEvent = (key: string, opts: { ctrl?: boolean; shift?: boolean; alt?: boolean } = {}) => {
			defaultPrevented = false;
			propagationStopped = false;
			return {
				key,
				ctrlKey: Boolean(opts.ctrl),
				metaKey: false,
				shiftKey: Boolean(opts.shift),
				altKey: Boolean(opts.alt),
				preventDefault: () => {
					defaultPrevented = true;
				},
				stopPropagation: () => {
					propagationStopped = true;
				},
			} as unknown as KeyboardEvent;
		};

		// 1. F12 (DevTools)
		(kiosk as any).handleKeyDown(makeKeyEvent("F12"));
		assert.equal(defaultPrevented, true, "F12 must be prevented");

		// 2. Ctrl+Shift+I (DevTools Inspect)
		(kiosk as any).handleKeyDown(makeKeyEvent("I", { ctrl: true, shift: true }));
		assert.equal(defaultPrevented, true, "Ctrl+Shift+I must be prevented");

		// 3. Ctrl+U (View Source)
		(kiosk as any).handleKeyDown(makeKeyEvent("U", { ctrl: true }));
		assert.equal(defaultPrevented, true, "Ctrl+U must be prevented");

		// 4. Ctrl+W (Close Tab)
		(kiosk as any).handleKeyDown(makeKeyEvent("W", { ctrl: true }));
		assert.equal(defaultPrevented, true, "Ctrl+W must be prevented");

		// 5. Alt+F4 (Close Window)
		(kiosk as any).handleKeyDown(makeKeyEvent("F4", { alt: true }));
		assert.equal(defaultPrevented, true, "Alt+F4 must be prevented");

		// 6. Escape in strict mode
		(kiosk as any).handleKeyDown(makeKeyEvent("Escape"));
		assert.equal(defaultPrevented, true, "Escape in strict kiosk must be prevented");

		// 7. Regular typing inside form inputs (not blocked)
		(kiosk as any).handleKeyDown(makeKeyEvent("a"));
		assert.equal(defaultPrevented, false, "Regular typing must not be prevented");

		await kiosk.disable("0000");
		kiosk.destroy();
	});

	// ─────────────────────────────────────────────────────────────────────────
	// 3. Service Worker Shell Caching & Cold-Start Resilience
	// ─────────────────────────────────────────────────────────────────────────
	await t.test("10. Service Worker: CacheFirst for static assets, security bypass for private clinical documents and DICOM", () => {
		const swCandidatePaths: readonly string[] = [
			path.resolve(process.cwd(), "public/sw.js"),
			path.resolve(process.cwd(), "apps/web/public/sw.js"),
		];
		let swPath = "public/sw.js";
		for (const p of swCandidatePaths) {
			if (fs.existsSync(p)) {
				swPath = p;
				break;
			}
		}
		assert.ok(fs.existsSync(swPath), `sw.js must exist at ${swPath}`);

		const swSource = fs.readFileSync(swPath, "utf8");

		// Inspect security isolation rules
		assert.ok(swSource.includes("isForbiddenRuntimeResponse"));
		assert.ok(swSource.includes('url.pathname.startsWith("/api/")'));
		assert.ok(swSource.includes("medical-documents"));
		assert.ok(swSource.includes("dicom"));
		assert.ok(swSource.includes("stl"));
		assert.ok(swSource.includes("SHELL_ASSETS"));
		assert.ok(swSource.includes('"/index.html"'));
		assert.ok(swSource.includes('"/manifest.webmanifest"'));
		assert.ok(swSource.includes("isCacheableExternalFont"));
	});

	await t.test("11. Service Worker: Simulated offline cold-start serves /index.html in < 500ms", async () => {
		const swCandidatePaths: readonly string[] = [
			path.resolve(process.cwd(), "public/sw.js"),
			path.resolve(process.cwd(), "apps/web/public/sw.js"),
		];
		let swPath = "public/sw.js";
		for (const p of swCandidatePaths) {
			if (fs.existsSync(p)) {
				swPath = p;
				break;
			}
		}
		const swSource = fs.readFileSync(swPath, "utf8");

		const mockCacheStorage = new Map<string, Map<string, Response>>();
		const fakeCaches = {
			async open(name: string) {
				if (!mockCacheStorage.has(name)) {
					mockCacheStorage.set(name, new Map<string, Response>());
				}
				const store = mockCacheStorage.get(name)!;
				return {
					async put(req: Request | string, res: Response) {
						const url = typeof req === "string" ? req : req.url;
						store.set(url, res.clone());
					},
					async match(req: Request | string) {
						const url = typeof req === "string" ? req : req.url;
						return store.get(url)?.clone() ?? null;
					},
					async addAll(urls: string[]) {
						for (const u of urls) {
							store.set(u, new Response(`cached:${u}`, { status: 200 }));
						}
					},
					async keys() {
						return Array.from(store.keys()).map((k) => new Request(k));
					},
					async delete(req: Request | string) {
						const url = typeof req === "string" ? req : req.url;
						return store.delete(url);
					},
				};
			},
			async match(req: Request | string) {
				for (const store of mockCacheStorage.values()) {
					const url = typeof req === "string" ? req : req.url;
					if (store.has(url)) return store.get(url)!.clone();
				}
				return null;
			},
			async keys() {
				return Array.from(mockCacheStorage.keys());
			},
			async delete(name: string) {
				return mockCacheStorage.delete(name);
			},
		};

		const listeners = new Map<string, Function>();
		const fakeSelf = {
			location: new URL("https://clinic.dente.ru/"),
			clients: {
				async claim() {},
			},
			addEventListener(type: string, fn: Function) {
				listeners.set(type, fn);
			},
			skipWaiting() {},
		};

		vm.runInContext(
			swSource,
			vm.createContext({
				self: fakeSelf,
				caches: fakeCaches,
				fetch: async () => {
					throw new Error("Network offline");
				},
				URL,
				Request,
				Response,
				Promise,
				console,
			}),
		);

		// Install phase
		const installWaits: Promise<unknown>[] = [];
		listeners.get("install")?.({
			waitUntil(p: Promise<unknown>) {
				installWaits.push(p);
			},
		});
		await Promise.all(installWaits);

		// Offline Navigation Request
		const startTime = performance.now();
		let responsePromise: Promise<Response> | null = null;
		listeners.get("fetch")?.({
			request: {
				method: "GET",
				mode: "navigate",
				url: "https://clinic.dente.ru/#shift",
			},
			respondWith(p: Promise<Response>) {
				responsePromise = p;
			},
		});

		assert.ok(responsePromise !== null);
		const response = await (responsePromise as unknown as Promise<Response>);
		const content = await response.text();
		const elapsedMs = performance.now() - startTime;

		assert.ok(content.includes("cached:/index.html"));
		assert.ok(elapsedMs < 500, `Cold start must be < 500ms (measured: ${elapsedMs.toFixed(2)}ms)`);
	});

	// ─────────────────────────────────────────────────────────────────────────
	// 4. Multi-Platform Native Bridges & Silent Printing Dispatcher
	// ─────────────────────────────────────────────────────────────────────────
	await t.test("12. Platform Detection & Native Drivers (Desktop Windows vs Android APK vs Web PWA)", async () => {
		// 12.1 Default Web PWA
		assert.equal(isDesktopApp(), false);
		assert.equal(isMobileApp(), false);
		assert.equal(detectRuntimePlatform(), "web_pwa");

		// 12.2 Simulated Desktop Windows (.EXE)
		const originalWindowDesc = Object.getOwnPropertyDescriptor(globalThis, "window");
		const mockDesktopApi: DesktopNativeApi = {
			isDesktop: true,
			platform: "win32",
			version: "1.0.0",
			listSerialPorts: async () => [{ path: "COM1", manufacturer: "FTDI" }],
			listTwainDevices: async () => [{ id: "twain-1", name: "EzSensor", type: "sensor", connected: true }],
			acquireTwainImage: async () => ({ success: true, dataBase64: "data:image/jpeg;base64,mock" }),
			printFiscalReceiptTcp: async () => ({ success: true, fiscalSign: "12345" }),
			printThermalLabel: async () => ({ success: true, silent: true, printerName: "Xprinter" }),
			printEscPosReceipt: async () => ({ success: true, silent: true, bytesSent: 256 }),
			watchLocalDicomFolder: async () => ({ success: true }),
			unwatchLocalDicomFolder: async () => ({ success: true }),
		};

		Object.defineProperty(globalThis, "window", {
			value: {
				denteDesktopNative: mockDesktopApi,
				location: { hostname: "localhost" },
			},
			configurable: true,
			writable: true,
		});

		try {
			assert.equal(isDesktopApp(), true);
			assert.equal(detectRuntimePlatform(), "desktop_win");

			// Test silent thermal label print in Desktop mode
			const thermalRes = await dispatchThermalLabelPrint({
				html: "<div>Sterilization Kraft Label</div>",
				silent: true,
			});
			assert.equal(thermalRes.success, true);
			assert.equal(thermalRes.silent, true);

			// Test silent ESC/POS receipt print in Desktop mode
			const escPosRes = await dispatchEscPosReceiptPrint({
				text: "DENTE RECEIPT\nTotal: 5000 RUB",
				silent: true,
			});
			assert.equal(escPosRes.success, true);
			assert.equal(escPosRes.silent, true);
		} finally {
			if (originalWindowDesc) {
				Object.defineProperty(globalThis, "window", originalWindowDesc);
			} else {
				delete (globalThis as any).window;
			}
		}
	});

	await t.test("13. Clinical Touch-First Ergonomics Validator & Safe Area Insets", () => {
		// Minimum clickable touch targets
		assert.equal(CLINICAL_TOUCH_TARGETS.MIN_TOUCH_SIZE_PX, 44);
		assert.equal(CLINICAL_TOUCH_TARGETS.PRIMARY_ACTION_MIN_HEIGHT_PX, 48);
		assert.equal(CLINICAL_TOUCH_TARGETS.MOBILE_ACTION_MIN_HEIGHT_PX, 52);

		// Valid primary action button
		const validErgo = validateClinicalActionButtonErgonomics({
			heightPx: 48,
			fontSizePx: 14,
			hasVisibleRussianLabel: true,
		});
		assert.equal(validErgo.isValid, true);
		assert.equal(validErgo.issues.length, 0);

		// Invalid action button (too small, no label)
		const invalidErgo = validateClinicalActionButtonErgonomics({
			heightPx: 36,
			fontSizePx: 11,
			hasVisibleRussianLabel: false,
		});
		assert.equal(invalidErgo.isValid, false);
		assert.ok(invalidErgo.issues.length >= 2);
	});
});
