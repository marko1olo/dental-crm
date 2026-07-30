/**
 * Безопасный доступ к localStorage.
 *
 * В приватном режиме Safari / при запрете хранения `getItem`/`setItem`/`removeItem`
 * бросают DOMException. Без try/catch вкладка настроек или выход из сессии
 * роняют всё приложение белым экраном.
 *
 * Единая точка — чтобы не копировать пустой catch в каждом компоненте.
 */

export function safeLocalStorageGetItem(key: string): string | null {
	if (typeof window === "undefined") return null;
	try {
		return window.localStorage.getItem(key);
	} catch {
		return null;
	}
}

export function safeLocalStorageSetItem(key: string, value: string): boolean {
	if (typeof window === "undefined") return false;
	try {
		window.localStorage.setItem(key, value);
		return true;
	} catch {
		return false;
	}
}

export function safeLocalStorageRemoveItem(key: string): boolean {
	if (typeof window === "undefined") return false;
	try {
		window.localStorage.removeItem(key);
		return true;
	} catch {
		return false;
	}
}

/** Токен сотрудника кабинета (PIN/login session). */
export const DENTE_STAFF_TOKEN_KEY = "dente_staff_token";

/** Токен клиники (cabinet unlock). */
export const DENTE_CLINIC_TOKEN_KEY = "dente_clinic_token";

export function readDenteStaffToken(): string {
	return safeLocalStorageGetItem(DENTE_STAFF_TOKEN_KEY)?.trim() || "";
}

export function readDenteClinicToken(): string {
	return safeLocalStorageGetItem(DENTE_CLINIC_TOKEN_KEY)?.trim() || "";
}
