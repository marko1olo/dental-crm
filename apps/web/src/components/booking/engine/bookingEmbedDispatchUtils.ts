import { isValidUuid } from "@dental/shared";
import { safeLocalStorageGetItem } from "../../../lib/safeLocalStorage";
import { clientLogger } from "../../../services/logging/clientLogger";

export function resolveBookingOrganizationId(
	contextOrgId: string | null | undefined,
): string | null {
	if (typeof window !== "undefined") {
		const searchParams = new URLSearchParams(window.location.search || "");
		const fromSearch = searchParams.get("organizationId") || searchParams.get("org");
		if (fromSearch && isValidUuid(fromSearch)) return fromSearch;

		const hash = window.location.hash || "";
		const qIdx = hash.indexOf("?");
		if (qIdx >= 0) {
			const hashParams = new URLSearchParams(hash.slice(qIdx + 1));
			const fromHash = hashParams.get("organizationId") || hashParams.get("org");
			if (fromHash && isValidUuid(fromHash)) return fromHash;
		}
	}

	if (contextOrgId && isValidUuid(contextOrgId)) return contextOrgId;

	try {
		const cachedUser =
			safeLocalStorageGetItem("dente_cached_active_staff_user") ||
			safeLocalStorageGetItem("dental-crm:active-user:v1");
		if (cachedUser) {
			const parsed = JSON.parse(cachedUser) as { organizationId?: unknown };
			if (typeof parsed.organizationId === "string" && isValidUuid(parsed.organizationId)) {
				return parsed.organizationId;
			}
		}
		const storedOrgId = safeLocalStorageGetItem("dente_organization_id");
		if (storedOrgId && isValidUuid(storedOrgId)) return storedOrgId;
	} catch {
		return null;
	}
	return null;
}

export interface BookingReceiptData {
	bookingId: string;
	referenceNumber: string;
	status: "CONFIRMED" | "PENDING_RESERVATION";
	isNightMode: boolean;
	message: string;
	doctorName: string;
	specialty?: string | undefined;
	date: string;
	time: string;
	morningConfirmTime?: string | undefined;
	clinicAddress?: string | undefined;
	patientName: string;
	patientPhone: string;
	createdAt: string;
}

interface TelegramUser {
	id: number;
	first_name: string;
	username?: string | undefined;
}

interface TelegramWebApp {
	ready?: () => void;
	expand?: () => void;
	initDataUnsafe?: {
		user?: TelegramUser | undefined;
	} | undefined;
}

type WindowWithTelegram = Window & {
	Telegram?: {
		WebApp?: TelegramWebApp | undefined;
	} | undefined;
};

/**
 * Detects Telegram Mini App environment
 */
export function detectTelegramWebApp(): {
	isTelegram: boolean;
	user?: { id: number; firstName: string; username?: string | undefined } | undefined;
} {
	if (typeof window === "undefined") {
		return { isTelegram: false };
	}
	const win = window as unknown as WindowWithTelegram;
	const tg = win.Telegram?.WebApp;
	if (tg) {
		tg.ready?.();
		tg.expand?.();
		const user = tg.initDataUnsafe?.user;
		return {
			isTelegram: true,
			user: user
				? {
						id: user.id,
						firstName: user.first_name,
						username: user.username,
					}
				: undefined,
		};
	}
	return { isTelegram: false };
}

/**
 * Dispatches postMessage event to parent frame (for Tilda, WordPress, HTML embedding).
 */
export function dispatchBookingCompletedMessage(
	data: BookingReceiptData,
): void {
	if (typeof window !== "undefined" && window.parent && window.parent !== window) {
		try {
			window.parent.postMessage(
				{
					type: "DENTE_BOOKING_COMPLETED",
					payload: data,
				},
				"*",
			);
		} catch (err) {
			clientLogger.warn("[publicBookingEngine] postMessage dispatch failed:", err);
		}
	}
}
