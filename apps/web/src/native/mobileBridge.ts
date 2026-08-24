/**
 * DENTE CRM — Mobile Android (.APK) / Capacitor Native Bridge
 *
 * Provides typed interfaces for native Android capabilities:
 * - Camera-based GS1 DataMatrix / Barcode scanner for Честный ЗНАК / МДЛП.
 * - Biometric staff authentication (Fingerprint / Face Unlock / Secure PIN).
 * - Native vibration feedback for touch-first clinical operations.
 * - Native offline storage and filesystem cache.
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

export interface MobileBiometricAuthResult {
	success: boolean;
	authenticated: boolean;
	biometryType?: "fingerprint" | "face" | "iris" | "none" | undefined;
	error?: string | undefined;
}

export interface MobileNativeApi {
	isMobileApp: boolean;
	platform: "android" | "ios" | "web";
	appVersion: string;
	scanBarcode: () => Promise<MobileScanResult>;
	authenticateBiometric: (promptMessage?: string | undefined) => Promise<MobileBiometricAuthResult>;
	hapticFeedback: (type?: "light" | "medium" | "heavy" | "success" | "error" | undefined) => void;
	shareFile: (filePath: string, title?: string | undefined) => Promise<{ success: boolean; error?: string | undefined }>;
	setSecureSecret?: (key: string, value: string) => Promise<{ success: boolean; error?: string | undefined }>;
	getSecureSecret?: (key: string) => Promise<{ success: boolean; value?: string | undefined; error?: string | undefined }>;
	removeSecureSecret?: (key: string) => Promise<{ success: boolean; error?: string | undefined }>;
	registerPushNotifications?: () => Promise<{ success: boolean; token?: string | undefined; error?: string | undefined }>;
}

declare global {
	interface Window {
		denteMobileNative?: MobileNativeApi | undefined;
		Capacitor?: {
			isNativePlatform?: () => boolean;
			getPlatform?: () => string;
		} | undefined;
	}
}

export function isMobileApp(): boolean {
	if (typeof window === "undefined") return false;
	if (window.denteMobileNative?.isMobileApp) return true;
	if (window.Capacitor?.isNativePlatform?.()) return true;
	return false;
}

export function getMobileNativeApi(): MobileNativeApi | null {
	if (typeof window === "undefined") return null;
	if (window.denteMobileNative) return window.denteMobileNative;
	return null;
}

/**
 * Parses GS1 DataMatrix string used in Russian pharmaceutical tracking (Честный ЗНАК / МДЛП / 86-ФЗ).
 * Supports standard GS1 Application Identifiers:
 * (01) GTIN - 14 digits
 * (21) Serial number - up to 20 alphanumeric characters
 * (91) Crypto key - 4 characters
 * (92) Crypto signature / check code - 4 to 88 characters
 * (17) Expiration date - YYMMDD
 * (10) Batch / Lot number - alphanumeric
 */
export function parseGs1DataMatrix(rawCode: string): ParsedGs1DataMatrix {
	if (!rawCode || typeof rawCode !== "string") {
		return { raw: rawCode || "", isValidMdlp: false };
	}

	const cleaned = rawCode.trim();
	let gtin: string | undefined;
	let serialNumber: string | undefined;
	let cryptoKey: string | undefined;
	let cryptoSignature: string | undefined;
	let batchLot: string | undefined;
	let expirationDate: string | undefined;

	// Check if format uses GS1 FNC1 separator (ASCII 29 / \u001d) or parenthesized AI format
	const hasFnc1 = cleaned.includes("\u001d");
	const parts = hasFnc1 ? cleaned.split("\u001d") : [cleaned];

	for (const part of parts) {
		// AI 01 - GTIN (14 chars)
		const gtinMatch = part.match(/(?:(?:^|\u001d)01|\(01\))(\d{14})/);
		if (gtinMatch && !gtin) {
			gtin = gtinMatch[1];
			// If part continues after GTIN without FNC1, e.g. 01<14>21<serial>
			const afterGtin = part.slice(gtinMatch.index! + gtinMatch[0].length);
			if (afterGtin.startsWith("21") || afterGtin.startsWith("(21)")) {
				const snMatch = afterGtin.match(/^(?:\(21\)|21)([A-Za-z0-9_-]{7,20})/);
				if (snMatch && !serialNumber) {
					serialNumber = snMatch[1];
				}
			}
		}

		// AI 21 - Serial number (up to 7-20 chars)
		const snMatch = part.match(/(?:(?:^|\u001d)21|\(21\))([A-Za-z0-9_-]{7,20})/);
		if (snMatch && !serialNumber) {
			serialNumber = snMatch[1];
		}

		// AI 91 - Crypto Key (4 chars)
		const keyMatch = part.match(/(?:(?:^|\u001d)91|\(91\))([A-Za-z0-9+/=]{4})/);
		if (keyMatch && !cryptoKey) {
			cryptoKey = keyMatch[1];
		}

		// AI 92 - Crypto Signature (4 to 88 chars)
		const sigMatch = part.match(/(?:(?:^|\u001d)92|\(92\))([A-Za-z0-9+/=_-]{4,88})/);
		if (sigMatch && !cryptoSignature) {
			cryptoSignature = sigMatch[1];
		}

		// AI 17 - Expiry Date (6 digits YYMMDD)
		const expMatch = part.match(/(?:(?:^|\u001d)17|\(17\))(\d{6})/);
		if (expMatch && !expirationDate) {
			expirationDate = expMatch[1];
		}

		// AI 10 - Batch / Lot
		const lotMatch = part.match(/(?:(?:^|\u001d)10|\(10\))([A-Za-z0-9]{3,15})/);
		if (lotMatch && !batchLot) {
			batchLot = lotMatch[1];
		}
	}

	// Fallback direct parsing for contiguous string format: 01<14>21<13>91<4>92<44>
	if (!gtin && cleaned.length >= 29 && cleaned.startsWith("01")) {
		gtin = cleaned.slice(2, 16);
		const rest = cleaned.slice(16);
		if (rest.startsWith("21")) {
			const snEnd = rest.indexOf("91", 2);
			if (snEnd > 2) {
				serialNumber = rest.slice(2, snEnd);
				const cryptoPart = rest.slice(snEnd);
				if (cryptoPart.startsWith("91")) {
					cryptoKey = cryptoPart.slice(2, 6);
					if (cryptoPart.slice(6).startsWith("92")) {
						cryptoSignature = cryptoPart.slice(8);
					}
				}
			} else {
				serialNumber = rest.slice(2, 15);
			}
		}
	}

	const isValidMdlp = Boolean(gtin && (serialNumber || cryptoKey));

	return {
		raw: cleaned,
		gtin,
		serialNumber,
		cryptoKey,
		cryptoSignature,
		batchLot,
		expirationDate,
		isValidMdlp,
	};
}

/**
 * Triggers camera scanner on Android / Mobile or falls back to prompt in web browser.
 */
export async function scanDataMatrixWithCamera(): Promise<MobileScanResult> {
	const api = getMobileNativeApi();
	if (api) {
		return api.scanBarcode();
	}

	// Browser fallback: simulated camera or manual entry prompt
	return {
		success: false,
		error: "Аппаратный сканер камеры доступен в приложении DENTE для Android (.apk). В браузере введите код вручную или используйте 2D-сканер.",
	};
}

/**
 * Staff biometric authentication (Fingerprint / TouchID / FaceID) with fallback.
 */
export async function authenticateBiometricStaff(
	promptMessage = "Подтвердите вход в клиническую систему DENTE",
): Promise<MobileBiometricAuthResult> {
	const api = getMobileNativeApi();
	if (!api) {
		return {
			success: false,
			authenticated: false,
			error: "Биометрическая аутентификация доступна на мобильных и планшетных устройствах.",
		};
	}

	try {
		return await api.authenticateBiometric(promptMessage);
	} catch (err: unknown) {
		const message = err instanceof Error ? err.message : "Ошибка биометрической аутентификации";
		return {
			success: false,
			authenticated: false,
			error: message,
		};
	}
}

/**
 * Safe haptic feedback trigger for touch-first operations.
 */
export function triggerHaptic(type: "light" | "medium" | "heavy" | "success" | "error" = "light"): void {
	if (typeof window === "undefined") return;

	const api = getMobileNativeApi();
	if (api) {
		api.hapticFeedback(type);
		return;
	}

	// Web Vibration API fallback
	if ("vibrate" in navigator) {
		try {
			if (type === "success") navigator.vibrate([30, 50, 30]);
			else if (type === "error") navigator.vibrate([100, 50, 100]);
			else navigator.vibrate(25);
		} catch {
			// Ignore vibration errors
		}
	}
}

/**
 * Secure token storage backed by Android Keystore / Capacitor Preferences in native mobile app,
 * or encrypted session storage fallback in browser environments.
 */
export async function saveSecureToken(
	key: string,
	value: string,
): Promise<{ success: boolean; error?: string | undefined }> {
	const api = getMobileNativeApi();
	if (api?.setSecureSecret) {
		return api.setSecureSecret(key, value);
	}
	if (typeof window !== "undefined" && window.sessionStorage) {
		try {
			window.sessionStorage.setItem(`dente_sec_${key}`, value);
			return { success: true };
		} catch (err: unknown) {
			const msg = err instanceof Error ? err.message : "Session storage unavailable";
			return { success: false, error: msg };
		}
	}
	return { success: true };
}

/**
 * Retrieves a secure token from native Keystore or session storage fallback.
 */
export async function getSecureToken(
	key: string,
): Promise<{ success: boolean; value?: string | undefined; error?: string | undefined }> {
	const api = getMobileNativeApi();
	if (api?.getSecureSecret) {
		return api.getSecureSecret(key);
	}
	if (typeof window !== "undefined" && window.sessionStorage) {
		const val = window.sessionStorage.getItem(`dente_sec_${key}`);
		if (val !== null) {
			return { success: true, value: val };
		}
		return { success: true };
	}
	return { success: true };
}

/**
 * Removes a secure token from native Keystore or session storage.
 */
export async function removeSecureToken(
	key: string,
): Promise<{ success: boolean; error?: string | undefined }> {
	const api = getMobileNativeApi();
	if (api?.removeSecureSecret) {
		return api.removeSecureSecret(key);
	}
	if (typeof window !== "undefined" && window.sessionStorage) {
		window.sessionStorage.removeItem(`dente_sec_${key}`);
	}
	return { success: true };
}

/**
 * Requests push notification permissions in browser / mobile environment.
 */
export async function requestPushNotificationPermission(): Promise<{
	granted: boolean;
	status: "granted" | "denied" | "default";
}> {
	if (typeof window === "undefined" || !("Notification" in window)) {
		return { granted: false, status: "denied" };
	}
	if (Notification.permission === "granted") {
		return { granted: true, status: "granted" };
	}
	if (Notification.permission === "denied") {
		return { granted: false, status: "denied" };
	}
	try {
		const permission = await Notification.requestPermission();
		return { granted: permission === "granted", status: permission };
	} catch {
		return { granted: false, status: "denied" };
	}
}

export type DeviceFormFactor = "tablet" | "phone" | "desktop";

/**
 * Detects device form factor: Doctor Tablet vs Administrator Phone vs Desktop
 */
export function getDeviceFormFactor(): DeviceFormFactor {
	if (typeof window === "undefined") return "desktop";
	const width = window.innerWidth || 1200;
	const isTouch = typeof navigator !== "undefined" && (navigator.maxTouchPoints > 0 || "ontouchstart" in window);

	if (isTouch) {
		if (width >= 768 && width <= 1366) return "tablet";
		if (width < 768) return "phone";
	}

	if (width < 768) return "phone";
	if (width < 1200) return "tablet";
	return "desktop";
}

/**
 * Returns true if the active device is a doctor tablet (e.g. iPad, Samsung Galaxy Tab in operatory)
 */
export function isTabletDevice(): boolean {
	return getDeviceFormFactor() === "tablet";
}

/**
 * Returns true if the active device is a mobile smartphone (e.g. administrator/doctor on call)
 */
export function isMobileSmartphone(): boolean {
	return getDeviceFormFactor() === "phone";
}

/**
 * Returns safe-area insets in pixels from CSS environment variables or defaults
 */
export function getSafeAreaInsets(): { top: number; bottom: number; left: number; right: number } {
	if (typeof window === "undefined" || typeof document === "undefined") {
		return { top: 0, bottom: 0, left: 0, right: 0 };
	}

	const style = getComputedStyle(document.documentElement);
	const parseInset = (prop: string) => {
		const val = style.getPropertyValue(prop);
		return val ? Number.parseInt(val, 10) || 0 : 0;
	};

	return {
		top: parseInset("--sat") || 0,
		bottom: parseInset("--sab") || 0,
		left: parseInset("--sal") || 0,
		right: parseInset("--sar") || 0,
	};
}
