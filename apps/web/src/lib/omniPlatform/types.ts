/**
 * DENTE CRM — Omni-Platform Adapter Types & Contracts (Layer 0)
 *
 * Pure TypeScript definitions, interfaces, and contracts.
 * Zero runtime dependencies, zero side effects.
 */

import type {
	DeviceFormFactor,
	OmniEnvironment,
	PointerType,
} from "@dental/shared";

export type { OmniEnvironment, PointerType };
export type FormFactor = DeviceFormFactor;

export interface OmniPlatformInfo {
	/** Active runtime execution environment */
	environment: OmniEnvironment;
	/** Primary pointing device type: fine (mouse) vs coarse (finger/touchscreen) */
	pointerType: PointerType;
	/** Screen topology and form factor */
	formFactor: FormFactor;
	/** Whether running in desktop EXE shell */
	isDesktop: boolean;
	/** Whether running in Android APK native shell */
	isAndroid: boolean;
	/** Whether running in standalone installed PWA window */
	isPwa: boolean;
	/** Whether running in regular browser tab */
	isWeb: boolean;
	/** Whether the device has a touch screen active */
	isTouch: boolean;
	/** Whether the device is operated primarily via mouse/trackpad */
	isMouse: boolean;
	/** Whether running on a tablet (iPad, Galaxy Tab chairside) */
	isTablet: boolean;
	/** Whether running on a phone */
	isPhone: boolean;
	/** Safe area insets in CSS pixels */
	safeArea: { top: number; bottom: number; left: number; right: number };
	/** Recommended minimum control height for current pointer */
	controlHeights: {
		/** Primary action button (Save, Print, Pay) */
		primaryActionMinHeightPx: number;
		/** Standard button / input min height */
		standardMinHeightPx: number;
		/** Dense secondary chip / tab min height */
		denseMinHeightPx: number;
		/** Minimum touch target hit size (>= 44px on coarse, primary >= 48px) */
		touchTargetMinPx: number;
		/** Recommended primary typography font size */
		fontSizePx: number;
	};
	/** Hardware capabilities matrix */
	capabilities: {
		canSilentPrintThermal: boolean;
		canDirectFiscalKktTcp: boolean;
		canDirectEscPosSocket: boolean;
		canHardwareHotkeys: boolean;
		canPrintA4: boolean;
		canDirectTwainVisiograph: boolean;
		canCameraScanBarcode: boolean;
		canUsbHidScanner: boolean;
		canNativeBiometrics: boolean;
		canOfflineStorage: boolean;
		hasPwaOfflineCache: boolean;
	};
}

export interface OmniWebSocketOptions {
	/** Initial reconnect delay in milliseconds (default 1000) */
	readonly reconnectBaseMs?: number;
	/** Maximum reconnect delay in milliseconds (default 30000) */
	readonly reconnectMaxMs?: number;
	/** Heartbeat ping interval in milliseconds (default 25000) */
	readonly pingIntervalMs?: number;
	/** Callback when connection opens */
	readonly onOpen?: () => void;
	/** Callback when message arrives */
	readonly onMessage?: (data: unknown) => void;
	/** Callback on error */
	readonly onError?: (err: Event) => void;
	/** Callback on close */
	readonly onClose?: () => void;
}

export interface OmniWebSocketClient {
	readonly isConnected: boolean;
	readonly send: (data: unknown) => boolean;
	readonly close: () => void;
	readonly reconnect: () => void;
}
