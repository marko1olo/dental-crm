import { useEffect, useMemo } from "react";
import { formatRussianPhone } from "../engine/bookingPhoneUtils";

export function useBookingTelegramContext(
	embedMode?: "standalone" | "iframe" | "modal" | "telegram",
	patientName?: string,
	setPatientName?: (name: string) => void,
	patientPhone?: string,
	setPatientPhone?: (phone: string) => void,
	showToast?: (msg: string, type?: "info" | "warning" | "error" | "success") => void,
) {
	const isTelegramContext = useMemo(() => {
		if (embedMode === "telegram") return true;
		if (typeof window === "undefined") return false;
		const searchParams = new URLSearchParams(window.location.search);
		const source = searchParams.get("source");
		const isTgParam = source === "tg" || source === "telegram" || searchParams.get("tg") === "1";
		const hasTgObject = Boolean((window as any)?.Telegram?.WebApp);
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
		const tg = (window as any)?.Telegram?.WebApp;
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
		const tg = (window as any)?.Telegram?.WebApp;
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
