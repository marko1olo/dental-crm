/**
 * DENTE CRM — Omni-Platform Adaptor & Offline LAN Survivability Unit Test Suite
 */

import assert from "node:assert/strict";
import test from "node:test";
import {
	detectOmniEnvironment,
	detectPointerType,
	getOmniPlatformInfo,
	isAndroidNativeApp,
	isDesktopExecutable,
	isStandalonePwa,
	syncPlatformDomAttributes,
	omniPlatform,
	omniPlatformAdapter,
	DESKTOP_FINE_ERGONOMICS,
	TABLET_TOUCH_ERGONOMICS,
	PHONE_TOUCH_ERGONOMICS,
	DOCTOR_HOTKEYS,
} from "../lib/omniPlatformAdapter";
import {
	determineNetworkConnectivity,
	isLocalOrLanHostname,
} from "../utils/networkConnectivity";
import {
	isTypingInInputElement,
	dispatchDesktopShortcut,
} from "../hooks/useDesktopShortcuts";
import {
	printA4Document,
	printThermalReceipt,
	printSanpinLabel,
} from "../lib/hardwarePrinting";
import {
	detectPlatform,
	isDesktopExe,
	isAndroidApk,
	isPwa,
	isTouchDevice,
	isFinePointerDevice,
	isTablet,
	getControlDimensions,
	registerDoctorHotkeys,
	getDeviceDiagnosticReport,
} from "../utils/deviceDetection";

const originalWindowDesc = Object.getOwnPropertyDescriptor(globalThis, "window");
const originalDocumentDesc = Object.getOwnPropertyDescriptor(globalThis, "document");
const originalNavigatorDesc = Object.getOwnPropertyDescriptor(globalThis, "navigator");
const originalFetchDesc = Object.getOwnPropertyDescriptor(globalThis, "fetch");

function setMockWindow(val: unknown): void {
	Object.defineProperty(globalThis, "window", {
		value: val,
		configurable: true,
		writable: true,
	});
}

function setMockDocument(val: unknown): void {
	Object.defineProperty(globalThis, "document", {
		value: val,
		configurable: true,
		writable: true,
	});
}

function setMockNavigator(val: unknown): void {
	Object.defineProperty(globalThis, "navigator", {
		value: val,
		configurable: true,
		writable: true,
	});
}

function setMockFetch(val: unknown): void {
	Object.defineProperty(globalThis, "fetch", {
		value: val,
		configurable: true,
		writable: true,
	});
}

function restoreGlobals(): void {
	if (originalWindowDesc) {
		Object.defineProperty(globalThis, "window", originalWindowDesc);
	} else {
		delete (globalThis as { window?: unknown }).window;
	}

	if (originalDocumentDesc) {
		Object.defineProperty(globalThis, "document", originalDocumentDesc);
	} else {
		delete (globalThis as { document?: unknown }).document;
	}

	if (originalNavigatorDesc) {
		Object.defineProperty(globalThis, "navigator", originalNavigatorDesc);
	} else {
		delete (globalThis as { navigator?: unknown }).navigator;
	}

	if (originalFetchDesc) {
		Object.defineProperty(globalThis, "fetch", originalFetchDesc);
	} else {
		delete (globalThis as { fetch?: unknown }).fetch;
	}
}

test("Omni-Platform Adaptor & Multi-Environment Invariants Suite", async (t) => {
	t.afterEach(() => {
		restoreGlobals();
	});

	await t.test("1. Environment detection: Web Browser default fallback", () => {
		setMockWindow({
			matchMedia: () => ({ matches: false }),
		});
		setMockNavigator({
			userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/128.0",
		});

		assert.equal(isDesktopExecutable(), false);
		assert.equal(isAndroidNativeApp(), false);
		assert.equal(isStandalonePwa(), false);
		assert.equal(detectOmniEnvironment(), "web_browser");
	});

	await t.test("2. Environment detection: Desktop EXE (Electron / Tauri / DenteDesktop)", () => {
		// Mock Electron
		setMockWindow({
			electron: {},
			matchMedia: () => ({ matches: false }),
		});
		setMockNavigator({ userAgent: "Chrome/128.0 Electron/31.0.0" });

		assert.equal(isDesktopExecutable(), true);
		assert.equal(detectOmniEnvironment(), "desktop_exe");

		// Mock Tauri
		setMockWindow({
			__TAURI__: {},
			matchMedia: () => ({ matches: false }),
		});
		assert.equal(isDesktopExecutable(), true);
		assert.equal(detectOmniEnvironment(), "desktop_exe");

		// Mock denteDesktopNative bridge
		setMockWindow({
			denteDesktopNative: { isDesktop: true },
			matchMedia: () => ({ matches: false }),
		});
		assert.equal(isDesktopExecutable(), true);
		assert.equal(detectOmniEnvironment(), "desktop_exe");
	});

	await t.test("3. Environment detection: Android APK (Capacitor / Native Bridge)", () => {
		// Mock Capacitor
		setMockWindow({
			Capacitor: {
				isNativePlatform: () => true,
				getPlatform: () => "android",
			},
			matchMedia: () => ({ matches: false }),
		});
		setMockNavigator({ userAgent: "Android 14; Mobile" });

		assert.equal(isAndroidNativeApp(), true);
		assert.equal(detectOmniEnvironment(), "android_apk");

		// Mock denteMobileNative
		setMockWindow({
			denteMobileNative: { isMobileApp: true, platform: "android" },
			matchMedia: () => ({ matches: false }),
		});
		assert.equal(isAndroidNativeApp(), true);
		assert.equal(detectOmniEnvironment(), "android_apk");
	});

	await t.test("4. Environment detection: Standalone PWA Window", () => {
		setMockWindow({
			matchMedia: (query: string) => ({
				matches: query === "(display-mode: standalone)",
			}),
		});
		setMockNavigator({ userAgent: "Mozilla/5.0 Chrome/128.0" });

		assert.equal(isStandalonePwa(), true);
		assert.equal(detectOmniEnvironment(), "pwa_standalone");
	});

	await t.test("5. Pointer precision & Ergonomics resolution (coarse vs fine)", () => {
		// Mock Touch Screen (Tablet at chairside / smartphone)
		setMockWindow({
			innerWidth: 1024,
			matchMedia: (query: string) => ({
				matches: query === "(pointer: coarse)",
			}),
		});
		setMockNavigator({ maxTouchPoints: 5 });

		assert.equal(detectPointerType(), "coarse");
		const touchInfo = getOmniPlatformInfo();
		assert.equal(touchInfo.isTouch, true);
		assert.equal(touchInfo.isMouse, false);
		assert.equal(touchInfo.controlHeights.primaryActionMinHeightPx, 48);
		assert.equal(touchInfo.controlHeights.standardMinHeightPx, 44);

		// Mock Desktop Mouse
		setMockWindow({
			innerWidth: 1440,
			matchMedia: (query: string) => ({
				matches: query === "(pointer: fine)",
			}),
		});
		setMockNavigator({ maxTouchPoints: 0 });

		assert.equal(detectPointerType(), "fine");
		const mouseInfo = getOmniPlatformInfo();
		assert.equal(mouseInfo.isTouch, false);
		assert.equal(mouseInfo.isMouse, true);
		assert.equal(mouseInfo.controlHeights.primaryActionMinHeightPx, 36);
		assert.equal(mouseInfo.controlHeights.standardMinHeightPx, 32);
	});

	await t.test("6. syncPlatformDomAttributes: synchronizes data attributes on <html>", () => {
		const rootAttributes: Record<string, string> = {};
		const classList = new Set<string>();

		setMockDocument({
			documentElement: {
				setAttribute: (key: string, val: string) => {
					rootAttributes[key] = val;
				},
				classList: {
					add: (c: string) => classList.add(c),
					remove: (c: string) => classList.delete(c),
				},
			},
		});
		setMockWindow({
			innerWidth: 1024,
			matchMedia: (query: string) => ({
				matches: query === "(pointer: coarse)" || query === "(display-mode: standalone)",
			}),
		});
		setMockNavigator({ maxTouchPoints: 5 });

		syncPlatformDomAttributes();

		assert.equal(rootAttributes["data-platform"], "pwa");
		assert.equal(rootAttributes["data-pointer"], "coarse");
		assert.equal(rootAttributes["data-form-factor"], "tablet");
		assert.ok(classList.has("pointer-coarse"));
		assert.ok(!classList.has("pointer-fine"));
	});

	await t.test("7. LAN Survivability: determineNetworkConnectivity resilience during WAN dropout", async () => {
		// Case A: External WAN domain, navigator.onLine = false -> Offline
		setMockWindow({
			location: { hostname: "crm.dental-cloud.ru" },
		});
		setMockNavigator({ onLine: false });

		const cloudOfflineState = await determineNetworkConnectivity();
		assert.equal(cloudOfflineState.mode, "offline");
		assert.equal(cloudOfflineState.isOnline, false);

		// Case B: Local Clinic Server (LAN 192.168.1.100), navigator.onLine = false (WAN is down!),
		// but local server responds to /api/health probe -> LAN Online!
		setMockWindow({
			location: { hostname: "192.168.1.100" },
		});
		setMockNavigator({ onLine: false });
		setMockFetch(async (url: string) => {
			return { ok: true, status: 200 };
		});

		assert.equal(isLocalOrLanHostname("192.168.1.100"), true);
		const lanOnlineState = await determineNetworkConnectivity();
		assert.equal(lanOnlineState.mode, "lan_online");
		assert.equal(lanOnlineState.isOnline, true);
		assert.equal(lanOnlineState.isLan, true);
		assert.equal(lanOnlineState.badgeClass, "lan");
	});

	await t.test("8. Keyboard Shortcuts: isTypingInInputElement detection", () => {
		const mockTextarea = {
			tagName: "TEXTAREA",
			isContentEditable: false,
		} as unknown as HTMLElement;
		assert.equal(isTypingInInputElement(mockTextarea), true);

		const mockTextInput = {
			tagName: "INPUT",
			type: "text",
			isContentEditable: false,
		} as unknown as HTMLElement;
		assert.equal(isTypingInInputElement(mockTextInput), true);

		const mockCheckbox = {
			tagName: "INPUT",
			type: "checkbox",
			isContentEditable: false,
		} as unknown as HTMLElement;
		assert.equal(isTypingInInputElement(mockCheckbox), false);

		const mockButton = {
			tagName: "BUTTON",
			isContentEditable: false,
		} as unknown as HTMLElement;
		assert.equal(isTypingInInputElement(mockButton), false);
	});

	await t.test("9. Hardware Printing: A4 and Thermal receipt routing", async () => {
		let printCalled = false;
		setMockWindow({
			focus: () => {},
			print: () => {
				printCalled = true;
			},
			matchMedia: () => ({ matches: false }),
		});
		setMockDocument({
			body: {
				appendChild: () => {},
			},
			getElementById: () => null,
			createElement: () => ({
				id: "",
				className: "",
				innerHTML: "",
				remove: () => {},
			}),
		});

		const a4Res = await printA4Document("<div>Форма 043/у амбулаторная карта</div>");
		assert.equal(a4Res.success, true);
		assert.equal(a4Res.method, "browser_dialog");
		assert.equal(printCalled, true);
	});

	await t.test("10. OmniPlatform Contract: unified adapter interface", async () => {
		setMockWindow({
			innerWidth: 1440,
			matchMedia: (query: string) => ({
				matches: query === "(pointer: fine)",
			}),
		});
		setMockNavigator({ maxTouchPoints: 0, onLine: true });

		assert.ok(omniPlatform, "omniPlatform singleton must exist");
		assert.equal(omniPlatform.environment, "web_browser");
		assert.equal(omniPlatform.pointerType, "fine");
		assert.equal(omniPlatform.formFactor, "desktop");
		assert.equal(omniPlatform.controlDimensions.primaryActionMinHeightPx, 36);
		assert.equal(omniPlatform.controlDimensions.standardMinHeightPx, 32);
		assert.equal(omniPlatform.controlDimensions.denseMinHeightPx, 28);

		// Storage engine contract
		const storage = omniPlatform.getStorageEngine();
		assert.ok(typeof storage.saveDraft === "function");
		assert.ok(typeof storage.getDraft === "function");
		assert.ok(typeof storage.removeDraft === "function");
		assert.ok(typeof storage.enqueueMutation === "function");
		assert.ok(typeof storage.getPendingMutations === "function");
		assert.ok(typeof storage.markMutationSynced === "function");
		assert.ok(typeof storage.getStorageStatus === "function");

		// Network status contract
		const netStatus = await omniPlatform.getNetworkStatus();
		assert.ok(netStatus.mode);
		assert.ok(typeof netStatus.isOnline === "boolean");
		assert.ok(netStatus.labelRu);
		assert.ok(netStatus.descriptionRu);
	});

	await t.test("11. Device Detection: platform routing and control dimensions", () => {
		// Desktop EXE test
		setMockWindow({
			electron: {},
			innerWidth: 1920,
			matchMedia: () => ({ matches: false }),
		});
		setMockNavigator({ userAgent: "Chrome/128.0 Electron/31.0.0", maxTouchPoints: 0 });

		assert.equal(detectPlatform(), "desktop");
		assert.equal(isDesktopExe(), true);
		assert.equal(isFinePointerDevice(), true);
		assert.equal(isTouchDevice(), false);
		const desktopDims = getControlDimensions();
		assert.equal(desktopDims.primaryActionMinHeightPx, 36);
		assert.equal(desktopDims.standardMinHeightPx, 32);
		assert.equal(desktopDims.denseMinHeightPx, 28);

		// Android APK Tablet test
		setMockWindow({
			Capacitor: {
				isNativePlatform: () => true,
				getPlatform: () => "android",
			},
			innerWidth: 820,
			matchMedia: (query: string) => ({
				matches: query === "(pointer: coarse)",
			}),
		});
		setMockNavigator({ userAgent: "Android 14; Tablet", maxTouchPoints: 5 });

		assert.equal(detectPlatform(), "android");
		assert.equal(isAndroidApk(), true);
		assert.equal(isTouchDevice(), true);
		assert.equal(isFinePointerDevice(), false);
		const tabletDims = getControlDimensions();
		assert.equal(tabletDims.primaryActionMinHeightPx, 48);
		assert.equal(tabletDims.standardMinHeightPx, 44);
		assert.equal(tabletDims.denseMinHeightPx, 36);
		assert.equal(tabletDims.touchTargetMinPx, 44);

		// Diagnostic report
		const report = getDeviceDiagnosticReport();
		assert.equal(report.platform, "android");
		assert.equal(report.isTouch, true);
	});

	await t.test("12. Clinical Ergonomics Invariants (Mandates 8c, 8e, 8n)", () => {
		// Desktop workstation fine ergonomics must NEVER inflate buttons to 48px
		assert.equal(DESKTOP_FINE_ERGONOMICS.primaryActionMinHeightPx, 36);
		assert.equal(DESKTOP_FINE_ERGONOMICS.standardMinHeightPx, 32);
		assert.equal(DESKTOP_FINE_ERGONOMICS.denseMinHeightPx, 28);
		assert.equal(DESKTOP_FINE_ERGONOMICS.touchTargetMinPx, 28);

		// Tablet chairside coarse ergonomics must be glove-friendly (>= 44px)
		assert.equal(TABLET_TOUCH_ERGONOMICS.primaryActionMinHeightPx, 48);
		assert.equal(TABLET_TOUCH_ERGONOMICS.standardMinHeightPx, 44);
		assert.equal(TABLET_TOUCH_ERGONOMICS.touchTargetMinPx, 44);

		// Phone ergonomics
		assert.equal(PHONE_TOUCH_ERGONOMICS.primaryActionMinHeightPx, 52);
		assert.equal(PHONE_TOUCH_ERGONOMICS.touchTargetMinPx, 48);
	});

	await t.test("13. Doctor Hotkeys Map & Registration (F1-F12, Ctrl+S, Esc)", () => {
		// Verify canonical keys in DOCTOR_HOTKEYS
		assert.ok(DOCTOR_HOTKEYS.F1);
		assert.ok(DOCTOR_HOTKEYS.F2);
		assert.ok(DOCTOR_HOTKEYS.F3);
		assert.ok(DOCTOR_HOTKEYS.F4);
		assert.ok(DOCTOR_HOTKEYS.F5);
		assert.ok(DOCTOR_HOTKEYS.F9);
		assert.ok(DOCTOR_HOTKEYS.F11);
		assert.ok(DOCTOR_HOTKEYS.F12);
		assert.ok(DOCTOR_HOTKEYS.CTRL_S);
		assert.ok(DOCTOR_HOTKEYS.ESCAPE);

		// Test registerDoctorHotkeys event handling
		let f1Fired = false;
		let f2Fired = false;
		let f4Fired = false;
		let f5Fired = false;
		let f9Fired = false;
		let f11Fired = false;
		let f12Fired = false;
		let saveFired = false;
		let escFired = false;

		const listeners: Record<string, (e: any) => void> = {};
		const mockTarget = {
			addEventListener: (event: string, handler: (e: any) => void) => {
				listeners[event] = handler;
			},
			removeEventListener: (event: string) => {
				delete listeners[event];
			},
		};

		const unregister = registerDoctorHotkeys(
			{
				onF1Help: () => {
					f1Fired = true;
				},
				onF2SearchPatient: () => {
					f2Fired = true;
				},
				onF4Odontogram: () => {
					f4Fired = true;
				},
				onF5RefreshSchedule: () => {
					f5Fired = true;
				},
				onF9Checkout: () => {
					f9Fired = true;
				},
				onF11ToggleKiosk: () => {
					f11Fired = true;
				},
				onF12PrintDiary: () => {
					f12Fired = true;
				},
				onSave: () => {
					saveFired = true;
				},
				onEscape: () => {
					escFired = true;
				},
			},
			{ target: mockTarget as any },
		);

		assert.ok(listeners.keydown, "keydown listener must be attached");

		const createFakeEvent = (key: string, code: string, ctrl = false) => {
			let defaultPrevented = false;
			return {
				key,
				code,
				ctrlKey: ctrl,
				metaKey: false,
				altKey: false,
				shiftKey: false,
				target: { tagName: "BODY" },
				preventDefault: () => {
					defaultPrevented = true;
				},
				stopPropagation: () => {},
				get defaultPrevented() {
					return defaultPrevented;
				},
			};
		};

		// Test F1
		const eF1 = createFakeEvent("F1", "F1");
		listeners.keydown(eF1);
		assert.equal(f1Fired, true);
		assert.equal(eF1.defaultPrevented, true);

		// Test F4 (Odontogram)
		const eF4 = createFakeEvent("F4", "F4");
		listeners.keydown(eF4);
		assert.equal(f4Fired, true);
		assert.equal(eF4.defaultPrevented, true);

		// Test F9 (Checkout)
		const eF9 = createFakeEvent("F9", "F9");
		listeners.keydown(eF9);
		assert.equal(f9Fired, true);
		assert.equal(eF9.defaultPrevented, true);

		// Test F11 (Kiosk)
		const eF11 = createFakeEvent("F11", "F11");
		listeners.keydown(eF11);
		assert.equal(f11Fired, true);
		assert.equal(eF11.defaultPrevented, true);

		// Test F12 (Print)
		const eF12 = createFakeEvent("F12", "F12");
		listeners.keydown(eF12);
		assert.equal(f12Fired, true);
		assert.equal(eF12.defaultPrevented, true);

		// Test Ctrl+S (Autosave with Russian layout 'ы')
		const eSaveRu = createFakeEvent("ы", "KeyS", true);
		listeners.keydown(eSaveRu);
		assert.equal(saveFired, true);
		assert.equal(eSaveRu.defaultPrevented, true);

		// Test Escape
		const eEsc = createFakeEvent("Escape", "Escape");
		listeners.keydown(eEsc);
		assert.equal(escFired, true);
		assert.equal(eEsc.defaultPrevented, true);

		unregister();
		assert.equal(listeners.keydown, undefined, "Listener must be removed after unregister");
	});
});
