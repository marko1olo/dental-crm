/**
 * DENTE CRM — Mobile Android (.APK) / Capacitor Native Bridge Types (Layer 0)
 *
 * Pure interfaces, DTOs, contracts, and constants for mobile and cross-platform native capabilities.
 */

export interface MobileScanResult {
	success: boolean;
	barcode?: string | undefined;
	format?: "DATA_MATRIX" | "QR_CODE" | "CODE_128" | "EAN_13" | undefined;
	cancelled?: boolean | undefined;
	error?: string | undefined;
}

export interface ParsedGs1DataMatrix {
	raw: string;
	gtin?: string | undefined;
	serialNumber?: string | undefined;
	cryptoKey?: string | undefined;
	cryptoSignature?: string | undefined;
	batchLot?: string | undefined;
	expirationDate?: string | undefined;
	isValidMdlp: boolean;
}

export type MobileAuthMethod = "biometric" | "pin" | "password";
export type BiometricFallbackReason =
	| "not_enrolled"
	| "hardware_unavailable"
	| "user_fallback"
	| "cancelled"
	| "locked_out";

export interface MobileBiometricAuthResult {
	success: boolean;
	authenticated: boolean;
	authMethod?: MobileAuthMethod | undefined;
	biometryType?: "fingerprint" | "face" | "iris" | "none" | undefined;
	fallbackRequired?: boolean | undefined;
	fallbackReason?: BiometricFallbackReason | undefined;
	error?: string | undefined;
}

export type HapticFeedbackType =
	| "light"
	| "medium"
	| "heavy"
	| "selection"
	| "success"
	| "warning"
	| "error"
	| "impact";

export interface MobilePushNotificationPayload {
	readonly id?: string | undefined;
	readonly title?: string | undefined;
	readonly body?: string | undefined;
	readonly data?: Record<string, unknown> | undefined;
	readonly clickAction?: string | undefined;
	readonly isUrgentWakeUp?: boolean | undefined;
}

export interface MobilePushNotificationHandlers {
	readonly onRegistration?: (token: string) => void;
	readonly onRegistrationError?: (error: string) => void;
	readonly onNotificationReceived?: (notification: MobilePushNotificationPayload) => void;
	readonly onNotificationActionPerformed?: (
		notification: MobilePushNotificationPayload,
		actionId?: string,
	) => void;
}

export interface MobileNativeApi {
	isMobileApp: boolean;
	platform: "android" | "ios" | "web";
	appVersion: string;
	scanBarcode: () => Promise<MobileScanResult>;
	authenticateBiometric: (promptMessage?: string | undefined) => Promise<MobileBiometricAuthResult>;
	hapticFeedback: (type?: HapticFeedbackType | undefined) => void;
	shareFile: (filePath: string, title?: string | undefined) => Promise<{ success: boolean; error?: string | undefined }>;
	setSecureSecret?: (key: string, value: string) => Promise<{ success: boolean; error?: string | undefined }>;
	getSecureSecret?: (key: string) => Promise<{ success: boolean; value?: string | undefined; error?: string | undefined }>;
	removeSecureSecret?: (key: string) => Promise<{ success: boolean; error?: string | undefined }>;
	registerPushNotifications?: () => Promise<{ success: boolean; token?: string | undefined; error?: string | undefined }>;
	printThermalBinary?: (bytes: number[]) => Promise<{ success: boolean; error?: string | undefined }>;
	acquireWakeLock?: () => Promise<{ success: boolean }>;
	releaseWakeLock?: () => Promise<{ success: boolean }>;
	capturePhoto?: (options?: {
		quality?: number;
		facingMode?: "environment" | "user";
	}) => Promise<{ success: boolean; dataUrl?: string; error?: string }>;
}

export interface CapacitorPushNotificationSchema {
	title?: string;
	body?: string;
	id?: string;
	data?: Record<string, unknown>;
	click_action?: string;
}

export interface CapacitorPushNotificationActionResult {
	actionId: string;
	inputValue?: string;
	notification: CapacitorPushNotificationSchema;
}

export interface MobileCameraPhotoOptions {
	/** Image resolution / quality preset */
	readonly resolution?: "standard" | "high" | "macro" | undefined;
	/** Camera sensor facing direction */
	readonly facingMode?: "environment" | "user" | undefined;
	/** Prefer native camera activity over web MediaDevices */
	readonly preferNativeCamera?: boolean | undefined;
	/** Tooth code according to FDI (11..48) */
	readonly toothCode?: string | undefined;
	/** Clinical photo protocol category */
	readonly viewCategory?:
		| "portrait"
		| "occlusion"
		| "upper_arch"
		| "lower_arch"
		| "intraoral_macro"
		| "xray_film_scan"
		| undefined;
}

export interface MobileCameraPhotoResult {
	readonly success: boolean;
	readonly dataUrl?: string | undefined;
	readonly mimeType?: string | undefined;
	readonly widthPx?: number | undefined;
	readonly heightPx?: number | undefined;
	readonly capturedAt: string;
	readonly toothCode?: string | undefined;
	readonly viewCategory?: string | undefined;
	readonly error?: string | undefined;
}

export type DeviceFormFactor = "tablet" | "phone" | "desktop";

export interface ModalBackHandlerEntry {
	id: string;
	handler: () => boolean | void;
	priority: number;
}

export type DenteDeepLinkAction =
	| "open-visit"
	| "open-patient"
	| "open-invoice"
	| "open-tax-cert"
	| "open-sanpin"
	| "unknown";

export interface DenteDeepLinkPayload {
	readonly protocol: "dente" | "https" | "http";
	readonly action: DenteDeepLinkAction;
	readonly patientId?: string | undefined;
	readonly visitId?: string | undefined;
	readonly invoiceId?: string | undefined;
	readonly rawUrl: string;
	readonly params: Record<string, string>;
}

export type MobileDocShareChannel =
	| "native_share"
	| "capacitor"
	| "whatsapp_sos"
	| "telegram"
	| "clipboard"
	| "error";

export interface MobileDocShareResult {
	success: boolean;
	sharedVia: MobileDocShareChannel;
	urlOrPayload?: string | undefined;
	error?: string | undefined;
}

/**
 * Clinical UI ergonomics touch target & button dimensions constants (SanPiN / Touch-First).
 * In clinical operatories, doctors and nurses wear medical gloves and interact with touch monoblocks/tablets.
 */
export const CLINICAL_TOUCH_TARGETS = {
	/** Minimum touch target size for standard interactive elements (WCAG / iOS / Material) */
	MIN_TOUCH_SIZE_PX: 44,
	/** Minimum height for primary action buttons (Save, Print, Pay, Scan, Remind) */
	PRIMARY_ACTION_MIN_HEIGHT_PX: 48,
	/** Touch-first operatory monoblock / mobile primary action height */
	MOBILE_ACTION_MIN_HEIGHT_PX: 52,
	/** Minimum typography font size for primary action labels */
	PRIMARY_ACTION_FONT_SIZE_PX: 14,
	/** Tooth formula anatomical element minimum touch height */
	TOOTH_FORMULA_MIN_HEIGHT_PX: 140,
	/** Desktop dense ergonomics (Mandate 8c: mouse grid 28-36px, pilot cockpit style) */
	DESKTOP_DENSE_ACTION_MIN_HEIGHT_PX: 28,
	DESKTOP_DENSE_ACTION_MAX_HEIGHT_PX: 36,
	DESKTOP_DENSE_FONT_SIZE_PX: 12,
} as const;

/**
 * Safe Touch Gesture and Momentum Scroll configuration for clinical mobile views.
 */
export interface SafeSwipeOptions {
	/** Minimum distance in pixels required to trigger swipe (default: 48px) */
	minDistancePx?: number;
	/** Maximum diagonal deviation angle in degrees (default: 35 deg) */
	maxAngleDeg?: number;
	/** Prevent default gesture behaviour */
	preventDefault?: boolean;
	/** Callback for left swipe */
	onSwipeLeft?: () => void;
	/** Callback for right swipe */
	onSwipeRight?: () => void;
	/** Callback for top swipe */
	onSwipeUp?: () => void;
	/** Callback for bottom swipe */
	onSwipeDown?: () => void;
}

/**
 * Clinical Audio Feedback Types
 */
export type ClinicalAudioFeedbackType =
	| "scan_success"
	| "save_success"
	| "pay_success"
	| "warning"
	| "error"
	| "click";

// Dental Arch Tooth Constants
export const DENTAL_ARCH_ADULT_UPPER: readonly number[] = [18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28];
export const DENTAL_ARCH_ADULT_LOWER: readonly number[] = [48, 47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37, 38];
export const DENTAL_ARCH_PEDIATRIC_UPPER: readonly number[] = [55, 54, 53, 52, 51, 61, 62, 63, 64, 65];
export const DENTAL_ARCH_PEDIATRIC_LOWER: readonly number[] = [85, 84, 83, 82, 81, 71, 72, 73, 74, 75];

declare global {
	interface Window {
		denteMobileNative?: MobileNativeApi | undefined;
		Capacitor?: {
			isNativePlatform?: () => boolean;
			getPlatform?: () => string;
			Plugins?: {
				App?: {
					addListener?: (
						event: string,
						callback: (data: { canGoBack: boolean }) => void,
					) => { remove: () => void };
					exitApp?: () => void;
				};
				PushNotifications?: {
					requestPermissions?: () => Promise<{ receive: "granted" | "denied" | "prompt" }>;
					register?: () => Promise<void>;
					createChannel?: (channel: {
						id: string;
						name: string;
						description?: string;
						importance: number;
						visibility?: number;
						sound?: string;
						vibration?: boolean;
						lights?: boolean;
						lightColor?: string;
					}) => Promise<void>;
					addListener?: (
						event: "registration" | "registrationError" | "pushNotificationReceived" | "pushNotificationActionPerformed",
						// biome-ignore lint/suspicious/noExplicitAny: Capacitor plugin listener signature
						callback: (data: any) => void,
					) => { remove: () => void };
					removeAllListeners?: () => Promise<void>;
				};
				Badge?: {
					set?: (options: { count: number }) => Promise<void>;
					clear?: () => Promise<void>;
				};
				BluetoothLe?: {
					initialize?: () => Promise<void>;
					requestDevice?: (options?: Record<string, unknown>) => Promise<{ deviceId: string; name?: string }>;
					connect?: (options: { deviceId: string }) => Promise<void>;
					disconnect?: (options: { deviceId: string }) => Promise<void>;
					write?: (options: {
						deviceId: string;
						service: string;
						characteristic: string;
						value: string; // base64 or hex
					}) => Promise<void>;
				};
				Camera?: {
					getPhoto?: (options: {
						quality?: number;
						allowEditing?: boolean;
						resultType?: "uri" | "base64" | "dataUrl";
						source?: "prompt" | "camera" | "photos";
						direction?: "rear" | "front";
						width?: number;
						height?: number;
					}) => Promise<{
						dataUrl?: string;
						base64String?: string;
						format?: string;
						webPath?: string;
					}>;
					checkPermissions?: () => Promise<{ camera: "granted" | "denied" | "prompt" }>;
					requestPermissions?: () => Promise<{ camera: "granted" | "denied" | "prompt" }>;
				};
			};
		} | undefined;
	}
}
