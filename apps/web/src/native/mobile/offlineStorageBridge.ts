/**
 * DENTE CRM — Mobile Offline Secure Storage & Thermal Binary Printing (Layer 2)
 *
 * Android Keystore / SessionStorage secure token storage and ESC/POS thermal printing.
 */

import {
	safeSessionStorageGetItem,
	safeSessionStorageSetItem,
	safeSessionStorageRemoveItem,
} from "../../lib/safeLocalStorage";
import { getMobileNativeApi } from "./platform";

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
	try {
		safeSessionStorageSetItem(`dente_sec_${key}`, value);
		return { success: true };
	} catch (err: unknown) {
		const msg = err instanceof Error ? err.message : "Session storage unavailable";
		return { success: false, error: msg };
	}
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
	const val = safeSessionStorageGetItem(`dente_sec_${key}`);
	if (val !== null) {
		return { success: true, value: val };
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
	safeSessionStorageRemoveItem(`dente_sec_${key}`);
	return { success: true };
}

/**
 * Direct thermal receipt binary printing on Android APK via native bridge
 * or Capacitor Bluetooth LE belt printer (Mandate 8e, 8n).
 */
export async function printMobileThermalBinary(
	bytes: number[] | Uint8Array,
): Promise<{ success: boolean; method: "mobile_native" | "bluetooth_le" | "unsupported"; error?: string }> {
	const byteArray = Array.isArray(bytes) ? bytes : Array.from(bytes);

	// 1. Injected Android Native API bridge
	const api = getMobileNativeApi();
	if (api?.printThermalBinary) {
		try {
			const res = await api.printThermalBinary(byteArray);
			return {
				success: res.success,
				method: "mobile_native",
				...(res.error ? { error: res.error } : {}),
			};
		} catch (err) {
			return {
				success: false,
				method: "mobile_native",
				error: err instanceof Error ? err.message : "Ошибка нативной печати Android",
			};
		}
	}

	// 2. Capacitor BluetoothLe Plugin fallback (portable ESC/POS belt printer)
	if (typeof window !== "undefined" && window.Capacitor?.Plugins?.BluetoothLe?.write) {
		try {
			const ble = window.Capacitor.Plugins.BluetoothLe;
			const targetDeviceId = typeof localStorage !== "undefined" ? localStorage.getItem("dente_ble_printer_id") : null;
			if (targetDeviceId && ble.write) {
				const base64 = btoa(String.fromCharCode(...byteArray));
				await ble.write({
					deviceId: targetDeviceId,
					service: "e7810a71-73ae-499d-8c15-faa9aef0c3f2",
					characteristic: "bef8d6c9-9c21-4c9e-b632-bd58c1009f9f",
					value: base64,
				});
				return { success: true, method: "bluetooth_le" };
			}
		} catch {
			// Fall through
		}
	}

	return {
		success: false,
		method: "unsupported",
		error: "Мобильная печать недоступна: нативный мост не обнаружен",
	};
}
