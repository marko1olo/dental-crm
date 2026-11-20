import { useEffect, useMemo } from "react";
import { formatRussianPhone } from "../engine/bookingPhoneUtils";

export interface TelegramWebAppUser {
	id?: number | undefined;
	first_name?: string | undefined;
	last_name?: string | undefined;
	username?: string | undefined;
	language_code?: string | undefined;
	phone_number?: string | undefined;
}

export interface TelegramWebAppBridge {
	ready?: (() => void) | undefined;
	expand?: (() => void) | undefined;
	close?: (() => void) | undefined;
	initData?: string | undefined;
	initDataUnsafe?: {
		user?: TelegramWebAppUser | undefined;
		query_id?: string | undefined;
		auth_date?: number | undefined;
		hash?: string | undefined;
	} | undefined;
	requestContact?: ((callback: (shared: boolean) => void) => void) | undefined;
	HapticFeedback?: {
		impactOccurred?: (style: "light" | "medium" | "heavy") => void;
	} | undefined;
	openTelegramLink?: ((url: string) => void) | undefined;
}

declare global {
	interface Window {
		Telegram?: {
			WebApp?: TelegramWebAppBridge | undefined;
		} | undefined;
	}
}

export function useBookingTelegramContext(
	embedMode?: "standalone" | "iframe" | "modal" | "telegram" | undefined,
	patientName?: string | undefined,
	setPatientName?: ((name: string) => void) | undefined,
	patientPhone?: string | undefined,
	setPatientPhone?: ((phone: string) => void) | undefined,
	showToast?: ((msg: string, type?: "info" | "warning" | "error" | "success" | undefined) => void) | undefined,
) {
	const isTelegramContext = useMemo(() => {
		if (embedMode === "telegram") return true;
		if (typeof window === "undefined") return false;
		const searchParams = new URLSearchParams(window.location.search);
		const source = searchParams.get("source");
		const isTgParam = source === "tg" || source === "telegram" || searchParams.get("tg") === "1";
		const hasTgObject = Boolean(window.Telegram?.WebApp);
		return isTgParam || hasTgObject;
	}, [embedMode]);

	const effectiveEmbedMode = useMemo(() => {
		if (embedMode) return embedMode;
		if (isTelegramContext) return "telegram";
		if (typeof window !== "undefined" && window.self !== window.top) {
			return "iframe";
		}
		return "standalone";
	}, [embedMode, isTelegramContext]);

	useEffect(() => {
		if (typeof window === "undefined") return;
		const tg = window.Telegram?.WebApp;
		if (tg) {
			tg.ready?.();
			tg.expand?.();
			const user = tg.initDataUnsafe?.user;
			if (user && !patientName && setPatientName) {
				const full = [user.first_name, user.last_name].filter(Boolean).join(" ");
				if (full) setPatientName(full);
			}
			if (user?.phone_number && !patientPhone && setPatientPhone) {
				setPatientPhone(formatRussianPhone(user.phone_number));
			}
		}
	}, [patientName, patientPhone, setPatientName, setPatientPhone]);

	const handleTelegramShareContact = () => {
		if (typeof window === "undefined") return;
		const tg = window.Telegram?.WebApp;
		if (tg?.requestContact) {
			tg.requestContact((shared: boolean) => {
				if (shared && tg.initDataUnsafe?.user?.phone_number && setPatientPhone) {
					setPatientPhone(formatRussianPhone(tg.initDataUnsafe.user.phone_number));
					showToast?.("Номер успешно получен из Telegram", "success");
				}
			});
		} else if (tg?.initDataUnsafe?.user?.phone_number && setPatientPhone) {
			setPatientPhone(formatRussianPhone(tg.initDataUnsafe.user.phone_number));
			showToast?.("Номер получен из профиля Telegram", "success");
		} else {
			document.getElementById("patient-phone-input")?.focus();
		}
	};

	return { isTelegramContext, effectiveEmbedMode, handleTelegramShareContact };
}
