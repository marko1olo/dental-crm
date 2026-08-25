/**
 * DENTE CRM — Clinical Kiosk Mode & Accidental Exit Protection Engine
 *
 * Designed for:
 * 1. Reception Waiting Area Self-Check-in Tablets & Kiosks (ru.dente.crm / PWA).
 * 2. Operatory Touchscreen Tablets (Doctor / Assistant chairside display).
 * 3. Operatory Windows Monoblocks (DENTE Desktop .EXE / Electron).
 *
 * Invariants & Capabilities:
 * - Locks Fullscreen & prevents accidental exit gestures / Escape / Alt+F4.
 * - PIN-protected exit mechanism with brute-force lockout safeguards.
 * - Screen WakeLock API integration to prevent display dimming/sleep during shifts.
 * - Context menu and dangerous browser shortcut blocking (DevTools, View Source, Close Tab).
 * - Automatic inactivity session reset for public reception terminals.
 * - Native desktop bridge integration (Electron/Tauri kiosk window control).
 */

import {
	toggleDesktopKioskMode,
	type DesktopWindowState,
} from "../../native/desktopBridge";
import { triggerHaptic } from "../../native/mobileBridge";

export type KioskProfile =
	| "reception_self_checkin"
	| "operatory_tablet"
	| "doctor_monoblock"
	| "custom";

export type KioskSecurityLevel = "strict" | "standard" | "open";

export interface KioskConfig {
	/** Active profile */
	readonly profile: KioskProfile;
	/** Security enforcement level */
	readonly securityLevel: KioskSecurityLevel;
	/** PIN code required to exit kiosk mode (default: '0000') */
	readonly exitPin: string;
	/** Whether to prevent screen dimming/sleep via Web Screen WakeLock API (default: true) */
	readonly enableWakeLock: boolean;
	/** Whether to suppress right-click context menus (default: true) */
	readonly preventContextMenu: boolean;
	/** Whether to block developer shortcuts (F12, Ctrl+Shift+I, etc.) (default: true) */
	readonly blockDevToolsShortcuts: boolean;
	/** Whether to block browser navigation shortcuts (Ctrl+W, Alt+F4, Backspace) (default: true) */
	readonly blockNavigationShortcuts: boolean;
	/** Inactivity timeout in seconds before resetting to home screen (0 = disabled, default: 120s for reception) */
	readonly inactivityTimeoutSeconds: number;
	/** Max failed PIN attempts before temporary lockout (default: 5) */
	readonly maxFailedPinAttempts: number;
	/** Temporary lockout duration in seconds after max failed PIN attempts (default: 30s) */
	readonly lockoutDurationSeconds: number;
	/** Callback invoked when inactivity timeout triggers */
	readonly onInactivityReset?: (() => void) | undefined;
}

export interface KioskState {
	readonly isActive: boolean;
	readonly isFullscreen: boolean;
	readonly hasWakeLock: boolean;
	readonly profile: KioskProfile;
	readonly securityLevel: KioskSecurityLevel;
	readonly lockedAt: string | null;
	readonly lastActivityAt: string | null;
	readonly failedPinAttempts: number;
	readonly isLockedOut: boolean;
	readonly lockoutUntilMs: number | null;
}

export const PROFILE_DEFAULTS: Record<KioskProfile, KioskConfig> = {
	reception_self_checkin: {
		profile: "reception_self_checkin",
		securityLevel: "strict",
		exitPin: "0000",
		enableWakeLock: true,
		preventContextMenu: true,
		blockDevToolsShortcuts: true,
		blockNavigationShortcuts: true,
		inactivityTimeoutSeconds: 120,
		maxFailedPinAttempts: 5,
		lockoutDurationSeconds: 30,
	},
	operatory_tablet: {
		profile: "operatory_tablet",
		securityLevel: "standard",
		exitPin: "0000",
		enableWakeLock: true,
		preventContextMenu: true,
		blockDevToolsShortcuts: true,
		blockNavigationShortcuts: true,
		inactivityTimeoutSeconds: 0, // No auto-reset during surgery/procedure
		maxFailedPinAttempts: 5,
		lockoutDurationSeconds: 30,
	},
	doctor_monoblock: {
		profile: "doctor_monoblock",
		securityLevel: "standard",
		exitPin: "0000",
		enableWakeLock: true,
		preventContextMenu: false,
		blockDevToolsShortcuts: true,
		blockNavigationShortcuts: true,
		inactivityTimeoutSeconds: 0,
		maxFailedPinAttempts: 5,
		lockoutDurationSeconds: 30,
	},
	custom: {
		profile: "custom",
		securityLevel: "standard",
		exitPin: "0000",
		enableWakeLock: true,
		preventContextMenu: true,
		blockDevToolsShortcuts: true,
		blockNavigationShortcuts: true,
		inactivityTimeoutSeconds: 0,
		maxFailedPinAttempts: 5,
		lockoutDurationSeconds: 30,
	},
};

export type KioskStateSubscriber = (state: KioskState) => void;

/**
 * Constant-time string comparison for PIN verification.
 */
export function verifyPinConstantTime(entered: string, expected: string): boolean {
	if (typeof entered !== "string" || typeof expected !== "string") return false;
	const a = entered.trim();
	const b = expected.trim();
	if (a.length !== b.length || a.length === 0) return false;

	let diff = 0;
	for (let i = 0; i < a.length; i++) {
		diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
	}
	return diff === 0;
}

/**
 * Industrial Kiosk Mode & Fullscreen Guard Controller.
 */
export class KioskManager {
	private config: KioskConfig;
	private state: KioskState;
	private subscribers: Set<KioskStateSubscriber> = new Set();
	private wakeLockSentinel: unknown = null;
	private inactivityTimer: ReturnType<typeof setTimeout> | null = null;

	// Event listener references for clean removal
	private boundKeydownHandler: ((e: KeyboardEvent) => void) | null = null;
	private boundContextMenuHandler: ((e: MouseEvent) => void) | null = null;
	private boundFullscreenChangeHandler: (() => void) | null = null;
	private boundBeforeUnloadHandler: ((e: BeforeUnloadEvent) => void) | null = null;
	private boundActivityHandler: (() => void) | null = null;
	private boundVisibilityChangeHandler: (() => void) | null = null;

	constructor(initialConfig: Partial<KioskConfig> = {}) {
		const profile = initialConfig.profile ?? "operatory_tablet";
		const baseConfig = PROFILE_DEFAULTS[profile] ?? PROFILE_DEFAULTS.operatory_tablet;
		this.config = { ...baseConfig, ...initialConfig };

		this.state = {
			isActive: false,
			isFullscreen: false,
			hasWakeLock: false,
			profile: this.config.profile,
			securityLevel: this.config.securityLevel,
			lockedAt: null,
			lastActivityAt: null,
			failedPinAttempts: 0,
			isLockedOut: false,
			lockoutUntilMs: null,
		};
	}

	public getState(): KioskState {
		return { ...this.state };
	}

	public subscribe(callback: KioskStateSubscriber): () => void {
		this.subscribers.add(callback);
		callback(this.getState());
		return () => {
			this.subscribers.delete(callback);
		};
	}

	/**
	 * Activates Kiosk Mode and enters Fullscreen.
	 */
	public async enable(configOverride?: Partial<KioskConfig>): Promise<{
		success: boolean;
		isFullscreen: boolean;
		error?: string | undefined;
	}> {
		if (configOverride) {
			const profile = configOverride.profile ?? this.config.profile;
			const base = PROFILE_DEFAULTS[profile] ?? this.config;
			this.config = { ...base, ...configOverride };
		}

		this.attachEventListeners();

		// 1. Enter Fullscreen (via Desktop Native or Web Fullscreen API)
		let fsSuccess = false;
		try {
			const desktopState = await toggleDesktopKioskMode(true);
			fsSuccess = desktopState.isFullScreen || desktopState.isKiosk;
		} catch {
			fsSuccess = false;
		}

		if (!fsSuccess && typeof document !== "undefined" && document.documentElement?.requestFullscreen) {
			try {
				if (!document.fullscreenElement) {
					await document.documentElement.requestFullscreen();
					fsSuccess = true;
				} else {
					fsSuccess = true;
				}
			} catch {
				// User gesture required or forbidden in iframe
				fsSuccess = false;
			}
		}

		// 2. Request Screen WakeLock
		let wakeLockOk = false;
		if (this.config.enableWakeLock) {
			wakeLockOk = await this.acquireWakeLock();
		}

		// 3. Reset activity and start inactivity timer
		this.resetInactivityTimer();

		this.updateState({
			isActive: true,
			isFullscreen: fsSuccess,
			hasWakeLock: wakeLockOk,
			lockedAt: new Date().toISOString(),
			lastActivityAt: new Date().toISOString(),
			failedPinAttempts: 0,
			isLockedOut: false,
			lockoutUntilMs: null,
		});

		triggerHaptic("success");

		return {
			success: true,
			isFullscreen: fsSuccess,
		};
	}

	/**
	 * Deactivates Kiosk Mode with mandatory PIN verification (unless security level is 'open').
	 */
	public async disable(exitPin?: string): Promise<{
		success: boolean;
		error?: string | undefined;
	}> {
		if (!this.state.isActive) {
			return { success: true };
		}

		// Check Lockout
		const now = Date.now();
		if (this.state.isLockedOut && this.state.lockoutUntilMs && now < this.state.lockoutUntilMs) {
			const remainingSec = Math.ceil((this.state.lockoutUntilMs - now) / 1000);
			triggerHaptic("error");
			return {
				success: false,
				error: `Превышено количество попыток ввода PIN-кода. Повторите через ${remainingSec} сек.`,
			};
		}

		// Verify PIN if securityLevel is not 'open'
		if (this.config.securityLevel !== "open") {
			const isPinValid = verifyPinConstantTime(exitPin || "", this.config.exitPin);
			if (!isPinValid) {
				const nextFailed = this.state.failedPinAttempts + 1;
				const isNowLockedOut = nextFailed >= this.config.maxFailedPinAttempts;
				const lockoutUntilMs = isNowLockedOut
					? now + this.config.lockoutDurationSeconds * 1000
					: null;

				this.updateState({
					failedPinAttempts: nextFailed,
					isLockedOut: isNowLockedOut,
					lockoutUntilMs,
				});

				triggerHaptic("error");

				if (isNowLockedOut) {
					return {
						success: false,
						error: `Неверный PIN-код. Блокировка на ${this.config.lockoutDurationSeconds} секунд.`,
					};
				}

				return {
					success: false,
					error: `Неверный PIN-код выхода из киоск-режима. Осталось попыток: ${this.config.maxFailedPinAttempts - nextFailed}`,
				};
			}
		}

		// 1. Exit Fullscreen
		try {
			await toggleDesktopKioskMode(false);
		} catch {}

		if (typeof document !== "undefined" && document.exitFullscreen && document.fullscreenElement) {
			try {
				await document.exitFullscreen();
			} catch {}
		}

		// 2. Release WakeLock
		await this.releaseWakeLock();

		// 3. Detach listeners
		this.detachEventListeners();
		this.clearInactivityTimer();

		this.updateState({
			isActive: false,
			isFullscreen: false,
			hasWakeLock: false,
			lockedAt: null,
			failedPinAttempts: 0,
			isLockedOut: false,
			lockoutUntilMs: null,
		});

		triggerHaptic("light");

		return { success: true };
	}

	/**
	 * Verifies PIN without disabling kiosk mode (e.g. for supervisor modal unlock).
	 */
	public verifyPin(enteredPin: string): boolean {
		return verifyPinConstantTime(enteredPin, this.config.exitPin);
	}

	/**
	 * Registers user activity timestamp and restarts inactivity timer.
	 */
	public recordActivity(): void {
		this.state = {
			...this.state,
			lastActivityAt: new Date().toISOString(),
		};
		this.resetInactivityTimer();
	}

	public destroy(): void {
		this.detachEventListeners();
		this.clearInactivityTimer();
		this.releaseWakeLock();
		this.subscribers.clear();
	}

	private updateState(partial: Partial<KioskState>): void {
		this.state = { ...this.state, ...partial };
		for (const sub of this.subscribers) {
			try {
				sub(this.getState());
			} catch (err) {
				console.error("[KioskManager] Subscriber error:", err);
			}
		}
	}

	private async acquireWakeLock(): Promise<boolean> {
		if (typeof navigator === "undefined" || !("wakeLock" in navigator)) {
			return false;
		}

		try {
			const nav = navigator as unknown as { wakeLock: { request: (type: string) => Promise<unknown> } };
			this.wakeLockSentinel = await nav.wakeLock.request("screen");
			return true;
		} catch {
			this.wakeLockSentinel = null;
			return false;
		}
	}

	private async releaseWakeLock(): Promise<boolean> {
		if (this.wakeLockSentinel && typeof (this.wakeLockSentinel as { release?: () => Promise<void> }).release === "function") {
			try {
				await (this.wakeLockSentinel as { release: () => Promise<void> }).release();
				this.wakeLockSentinel = null;
				return true;
			} catch {
				this.wakeLockSentinel = null;
				return false;
			}
		}
		return false;
	}

	private resetInactivityTimer(): void {
		this.clearInactivityTimer();
		if (this.config.inactivityTimeoutSeconds <= 0 || !this.state.isActive) {
			return;
		}

		this.inactivityTimer = setTimeout(() => {
			if (this.state.isActive) {
				try {
					this.config.onInactivityReset?.();
				} catch (err) {
					console.error("[KioskManager] Error in inactivity callback:", err);
				}
			}
		}, this.config.inactivityTimeoutSeconds * 1000);
	}

	private clearInactivityTimer(): void {
		if (this.inactivityTimer) {
			clearTimeout(this.inactivityTimer);
			this.inactivityTimer = null;
		}
	}

	private attachEventListeners(): void {
		if (typeof window === "undefined") return;

		// 1. Keyboard Blocking & Interception
		this.boundKeydownHandler = (e: KeyboardEvent) => this.handleKeyDown(e);
		window.addEventListener("keydown", this.boundKeydownHandler, true);

		// 2. Context Menu Suppression
		if (this.config.preventContextMenu) {
			this.boundContextMenuHandler = (e: MouseEvent) => {
				if (this.state.isActive) {
					e.preventDefault();
					e.stopPropagation();
				}
			};
			window.addEventListener("contextmenu", this.boundContextMenuHandler, true);
		}

		// 3. Fullscreen Change Enforcement
		this.boundFullscreenChangeHandler = () => {
			if (typeof document !== "undefined") {
				const isFs = Boolean(document.fullscreenElement);
				this.updateState({ isFullscreen: isFs });

				// If fullscreen was exited while strict kiosk is active -> alert & prompt
				if (!isFs && this.state.isActive && this.config.securityLevel === "strict") {
					triggerHaptic("warning");
				}
			}
		};
		if (typeof document !== "undefined") {
			document.addEventListener("fullscreenchange", this.boundFullscreenChangeHandler);
		}

		// 4. BeforeUnload Warning
		this.boundBeforeUnloadHandler = (e: BeforeUnloadEvent) => {
			if (this.state.isActive) {
				e.preventDefault();
				e.returnValue = "Киоск-режим DENTE активен. Закрытие окна заблокировано.";
				return e.returnValue;
			}
		};
		window.addEventListener("beforeunload", this.boundBeforeUnloadHandler);

		// 5. User Activity Monitoring
		this.boundActivityHandler = () => this.recordActivity();
		window.addEventListener("pointerdown", this.boundActivityHandler, { passive: true });
		window.addEventListener("keydown", this.boundActivityHandler, { passive: true });

		// 6. Visibility Change (Reacquire WakeLock if window regained focus)
		this.boundVisibilityChangeHandler = async () => {
			if (typeof document !== "undefined" && document.visibilityState === "visible" && this.state.isActive && this.config.enableWakeLock) {
				const ok = await this.acquireWakeLock();
				this.updateState({ hasWakeLock: ok });
			}
		};
		if (typeof document !== "undefined") {
			document.addEventListener("visibilitychange", this.boundVisibilityChangeHandler);
		}
	}

	private detachEventListeners(): void {
		if (typeof window === "undefined") return;

		if (this.boundKeydownHandler) {
			window.removeEventListener("keydown", this.boundKeydownHandler, true);
			this.boundKeydownHandler = null;
		}
		if (this.boundContextMenuHandler) {
			window.removeEventListener("contextmenu", this.boundContextMenuHandler, true);
			this.boundContextMenuHandler = null;
		}
		if (this.boundFullscreenChangeHandler && typeof document !== "undefined") {
			document.removeEventListener("fullscreenchange", this.boundFullscreenChangeHandler);
			this.boundFullscreenChangeHandler = null;
		}
		if (this.boundBeforeUnloadHandler) {
			window.removeEventListener("beforeunload", this.boundBeforeUnloadHandler);
			this.boundBeforeUnloadHandler = null;
		}
		if (this.boundActivityHandler) {
			window.removeEventListener("pointerdown", this.boundActivityHandler);
			window.removeEventListener("keydown", this.boundActivityHandler);
			this.boundActivityHandler = null;
		}
		if (this.boundVisibilityChangeHandler && typeof document !== "undefined") {
			document.removeEventListener("visibilitychange", this.boundVisibilityChangeHandler);
			this.boundVisibilityChangeHandler = null;
		}
	}

	private handleKeyDown(event: KeyboardEvent): void {
		if (!this.state.isActive) return;

		const key = event.key;
		const ctrl = event.ctrlKey || event.metaKey;
		const shift = event.shiftKey;
		const alt = event.altKey;

		// 1. Block DevTools Shortcuts (F12, Ctrl+Shift+I, Ctrl+Shift+J, Ctrl+Shift+C, Ctrl+U)
		if (this.config.blockDevToolsShortcuts) {
			if (
				key === "F12" ||
				(ctrl && shift && (key === "I" || key === "i" || key === "J" || key === "j" || key === "C" || key === "c")) ||
				(ctrl && (key === "U" || key === "u"))
			) {
				event.preventDefault();
				event.stopPropagation();
				triggerHaptic("warning");
				return;
			}
		}

		// 2. Block Navigation / Close Shortcuts (Ctrl+W, Ctrl+N, Ctrl+T, Ctrl+R, F5, Alt+F4, F11)
		if (this.config.blockNavigationShortcuts) {
			if (
				(ctrl && (key === "w" || key === "W" || key === "n" || key === "N" || key === "t" || key === "T")) ||
				(alt && key === "F4") ||
				key === "F11"
			) {
				event.preventDefault();
				event.stopPropagation();
				triggerHaptic("warning");
				return;
			}

			// In strict mode, prevent accidental refresh
			if (this.config.securityLevel === "strict" && (key === "F5" || (ctrl && (key === "r" || key === "R")))) {
				event.preventDefault();
				event.stopPropagation();
				triggerHaptic("warning");
				return;
			}
		}

		// 3. Escape key interception in Kiosk Mode
		if (key === "Escape") {
			if (this.config.securityLevel === "strict") {
				event.preventDefault();
				event.stopPropagation();
				triggerHaptic("warning");
			}
		}
	}
}

// Global Singleton Kiosk Manager Instance
let globalKioskManagerInstance: KioskManager | null = null;

export function getGlobalKioskManager(config?: Partial<KioskConfig>): KioskManager {
	if (!globalKioskManagerInstance) {
		globalKioskManagerInstance = new KioskManager(config);
	}
	return globalKioskManagerInstance;
}

export function enableKioskMode(config?: Partial<KioskConfig>): Promise<{
	success: boolean;
	isFullscreen: boolean;
	error?: string | undefined;
}> {
	return getGlobalKioskManager(config).enable(config);
}

export function disableKioskMode(exitPin?: string): Promise<{
	success: boolean;
	error?: string | undefined;
}> {
	return getGlobalKioskManager().disable(exitPin);
}

export function isKioskModeActive(): boolean {
	return getGlobalKioskManager().getState().isActive;
}

export function verifyKioskExitPin(pin: string): boolean {
	return getGlobalKioskManager().verifyPin(pin);
}

export function subscribeKioskState(callback: KioskStateSubscriber): () => void {
	return getGlobalKioskManager().subscribe(callback);
}

export function createKioskManager(config?: Partial<KioskConfig>): KioskManager {
	return new KioskManager(config);
}
