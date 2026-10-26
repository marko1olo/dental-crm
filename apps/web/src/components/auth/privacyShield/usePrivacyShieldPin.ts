import { useCallback, useEffect, useRef, useState } from "react";
import {
	DENTE_CLINIC_TOKEN_KEY,
	DENTE_PRIVACY_SHIELD_LOCKED_KEY,
	DENTE_STAFF_TOKEN_KEY,
	safeLocalStorageGetItem,
	safeLocalStorageRemoveItem,
	safeLocalStorageSetItem,
} from "../../../lib/safeLocalStorage";
import { logger } from "../../../utils/logger";
import { showToast } from "../../GlobalToast";
import type { DoctorPrivacyShieldProps, DoctorProfile } from "../doctorPrivacyShieldHelpers";

export function usePrivacyShieldPin(
	isOpen: boolean,
	doctor: DoctorPrivacyShieldProps["doctor"],
	onUnlock: DoctorPrivacyShieldProps["onUnlock"],
) {
	const [pin, setPin] = useState("");
	const [errorShake, setErrorShake] = useState(false);
	const [loading, setLoading] = useState(false);
	const [errorText, setErrorText] = useState<string | null>(null);
	const shakeTimeoutRef = useRef<NodeJS.Timeout | number | null>(null);

	useEffect(() => {
		return () => {
			if (shakeTimeoutRef.current) clearTimeout(shakeTimeoutRef.current);
		};
	}, []);

	const failUnlock = useCallback((message: string) => {
		showToast(message, "error");
		setErrorText(message);
		setErrorShake(true);
		setPin("");
		if (shakeTimeoutRef.current) clearTimeout(shakeTimeoutRef.current);
		shakeTimeoutRef.current = setTimeout(() => setErrorShake(false), 500);
	}, []);

	const submitPin = useCallback(
		async (completedPin: string) => {
			setLoading(true);
			setErrorShake(false);
			setErrorText(null);
			try {
				const clinicToken = safeLocalStorageGetItem(DENTE_CLINIC_TOKEN_KEY);
				const targetUserId = doctor?.id;
				const response = await fetch("/api/auth/staff/unlock", {
					method: "POST",
					headers: { "Content-Type": "application/json", "x-dente-clinic-token": clinicToken || "" },
					body: JSON.stringify({ ...(targetUserId ? { userId: targetUserId } : {}), pinCode: completedPin }),
				});
				const rawBody = await response.text();
				let payload: { message?: unknown; staffToken?: unknown; user?: unknown } | null = null;
				if (rawBody) {
					try { payload = JSON.parse(rawBody); } catch {
						logger.error("[DoctorPrivacyShield] Server response is not JSON", response.status, rawBody.slice(0, 100));
					}
				}
				if (response.ok) {
					const staffToken = typeof payload?.staffToken === "string" ? payload.staffToken.trim() : "";
					if (staffToken) safeLocalStorageSetItem(DENTE_STAFF_TOKEN_KEY, staffToken);
					safeLocalStorageRemoveItem(DENTE_PRIVACY_SHIELD_LOCKED_KEY);
					setPin("");
					const returnedUser = (payload?.user || doctor) as DoctorProfile;
					if (returnedUser && doctor?.id && returnedUser.id !== doctor.id) {
						showToast(`Смена врача: ${returnedUser.fullName || "Врач-стоматолог"}. Приём открыт.`, "success");
					} else {
						showToast("Приём возобновлен. Все данные на месте.", "success");
					}
					onUnlock(returnedUser);
					return;
				}
				const rawMsg = typeof payload?.message === "string" ? payload.message.trim() : "";
				const serverMsg = /[А-Яа-яЁё]/.test(rawMsg) ? rawMsg : "Неверный PIN-код сотрудника.";
				failUnlock(serverMsg);
			} catch (err) {
				logger.error("[DoctorPrivacyShield] Unlock request error:", err);
				failUnlock("Ошибка связи с сервером при проверке PIN.");
			} finally {
				setLoading(false);
			}
		},
		[doctor, onUnlock, failUnlock],
	);

	const handleKeyPress = useCallback((num: string) => {
		if (loading || pin.length >= 4) return;
		if (errorText) setErrorText(null);
		const nextPin = pin + num;
		setPin(nextPin);
		if (nextPin.length === 4) void submitPin(nextPin);
	}, [loading, pin, errorText, submitPin]);

	const handleBackspace = useCallback(() => {
		if (loading || pin.length === 0) return;
		if (errorText) setErrorText(null);
		setPin((prev) => prev.slice(0, -1));
	}, [loading, pin.length, errorText]);

	const handleClear = useCallback(() => {
		if (loading) return;
		setPin("");
		setErrorText(null);
	}, [loading]);

	useEffect(() => {
		if (!isOpen) return;
		const handleKeyDown = (e: KeyboardEvent) => {
			if (/^[0-9]$/.test(e.key)) {
				e.preventDefault(); e.stopPropagation(); handleKeyPress(e.key);
			} else if (e.key === "Backspace") {
				e.preventDefault(); e.stopPropagation(); handleBackspace();
			} else if (e.key === "Escape" || e.key === "c" || e.key === "C") {
				e.preventDefault(); e.stopPropagation(); handleClear();
			}
		};
		window.addEventListener("keydown", handleKeyDown, { capture: true });
		return () => { window.removeEventListener("keydown", handleKeyDown, { capture: true }); };
	}, [isOpen, handleKeyPress, handleBackspace, handleClear]);

	return { pin, errorShake, loading, errorText, handleKeyPress, handleBackspace, handleClear };
}
