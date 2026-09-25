/**
 * DENTE Dental CRM — Doctor Privacy Shield Helpers & Contracts
 *
 * Extracted per Mandate 8s (Modular Architecture & Anti-Bloat)
 */

import {
	DENTE_INACTIVITY_TIMEOUT_KEY,
	DENTE_PRIVACY_SHIELD_LOCKED_KEY,
	safeLocalStorageGetItem,
} from "../../lib/safeLocalStorage";

export {
	DENTE_INACTIVITY_TIMEOUT_KEY,
	DENTE_PRIVACY_SHIELD_LOCKED_KEY,
};

export interface DoctorProfile {
	id?: string | number | undefined;
	fullName?: string | undefined;
	name?: string | undefined;
	role?: string | undefined;
	avatarUrl?: string | undefined;
	pinCode?: string | undefined;
	[key: string]: unknown;
}

export interface DoctorPrivacyShieldProps {
	readonly isOpen: boolean;
	readonly doctor?: DoctorProfile | null | undefined;
	readonly onUnlock: (user?: unknown) => void;
	readonly onClinicLogout?: (() => void) | undefined;
	readonly onFullLock?: (() => void) | undefined;
	readonly className?: string | undefined;
}

export function getDoctorInitials(name?: string | null): string {
	if (!name || !name.trim()) return "ВР";
	const parts = name.trim().split(/\s+/);
	if (parts.length >= 2) {
		const first = parts[0]?.[0] || "";
		const second = parts[1]?.[0] || "";
		return `${first}${second}`.toUpperCase();
	}
	return (parts[0]?.slice(0, 2) || "ВР").toUpperCase();
}

export function formatDoctorRole(role?: string | null): string {
	switch (role) {
		case "doctor":
			return "Врач-стоматолог";
		case "assistant":
			return "Ассистент врача";
		case "admin":
			return "Администратор клиники";
		case "director":
		case "owner":
			return "Главный врач / Руководитель";
		default:
			return role || "Клинический специалист";
	}
}

/**
 * Получает таймаут неактивности в миллисекундах из localStorage.
 * Настраивается ключом `dente_inactivity_timeout_minutes` (по умолчанию: 5 минут).
 */
export function getInactivityTimeoutMs(): number {
	const raw = safeLocalStorageGetItem(DENTE_INACTIVITY_TIMEOUT_KEY);
	if (raw) {
		const val = Number.parseFloat(raw);
		if (!Number.isNaN(val) && val > 0) {
			return val * 60 * 1000;
		}
	}
	return 5 * 60 * 1000; // default 5 minutes
}

export const PIN_KEYS = [
	["1", "2", "3"],
	["4", "5", "6"],
	["7", "8", "9"],
	["C", "0", "BACKSPACE"],
] as const;
