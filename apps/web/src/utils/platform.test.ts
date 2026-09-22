/**
 * platform.test.ts — Comprehensive Vitest suite for multi-runtime platform detection,
 * pointer precision, low-spec HDD status, safe area insets, and offline capabilities.
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
	getAppRuntime,
	isWebRuntimeActive,
	isDesktopRuntimeActive,
	isAndroidRuntimeActive,
	isPwaRuntimeActive,
	detectOperatingSystem,
	detectPointerCategory,
	detectFormFactor,
	getSafeAreaInsets,
	isNetworkOnline,
	isLowSpecMachine,
	isSlowHddDetected,
	getPlatformCapabilities,
	setMockPlatform,
} from "./platform.js";
import { setMockAppRuntimeKind } from "./runtimeRouter.js";
import { setForcedLowSpecMode } from "./lowSpecHddOptimizer.js";

describe("Unified Multi-Runtime Platform Suite", () => {
	beforeEach(() => {
		setMockPlatform(null);
		setMockAppRuntimeKind(null);
		setForcedLowSpecMode(null);
	});

	afterEach(() => {
		setMockPlatform(null);
		setMockAppRuntimeKind(null);
		setForcedLowSpecMode(null);
	});

	it("1. Accurately identifies current runtime among 4 environments", () => {
		setMockAppRuntimeKind("web_browser");
		expect(getAppRuntime()).toBe("web_browser");
		expect(isWebRuntimeActive()).toBe(true);
		expect(isDesktopRuntimeActive()).toBe(false);

		setMockAppRuntimeKind("desktop_exe");
		expect(getAppRuntime()).toBe("desktop_exe");
		expect(isDesktopRuntimeActive()).toBe(true);

		setMockAppRuntimeKind("android_apk");
		expect(getAppRuntime()).toBe("android_apk");
		expect(isAndroidRuntimeActive()).toBe(true);

		setMockAppRuntimeKind("pwa_standalone");
		expect(getAppRuntime()).toBe("pwa_standalone");
		expect(isPwaRuntimeActive()).toBe(true);
	});

	it("2. Mock platform override takes precedence for testing", () => {
		setMockPlatform({
			runtime: "desktop_exe",
			os: "windows",
			formFactor: "desktop",
			pointer: "fine",
			isLowSpec: true,
			isSlowHdd: true,
			isOnline: false,
		});

		const caps = getPlatformCapabilities();
		expect(caps.runtime).toBe("desktop_exe");
		expect(caps.os).toBe("windows");
		expect(caps.pointer).toBe("fine");
		expect(caps.isLowSpec).toBe(true);
		expect(caps.isSlowHdd).toBe(true);
		expect(caps.isOnline).toBe(false);
	});

	it("3. Detects OS and pointer categories correctly", () => {
		expect(["windows", "macos", "linux", "android", "ios", "unknown"]).toContain(detectOperatingSystem());
		expect(["fine", "coarse"]).toContain(detectPointerCategory());
		expect(["desktop", "tablet", "phone"]).toContain(detectFormFactor());
	});

	it("4. Low-spec machine detection aligns with lowSpecHddOptimizer", () => {
		setForcedLowSpecMode(true);
		expect(isLowSpecMachine()).toBe(true);

		setForcedLowSpecMode(false);
		expect(isLowSpecMachine()).toBe(false);
	});

	it("5. Safe area insets return numeric bounds without throwing", () => {
		const insets = getSafeAreaInsets();
		expect(typeof insets.top).toBe("number");
		expect(typeof insets.right).toBe("number");
		expect(typeof insets.bottom).toBe("number");
		expect(typeof insets.left).toBe("number");
	});

	it("6. Online state detection returns boolean", () => {
		expect(typeof isNetworkOnline()).toBe("boolean");
	});
});
