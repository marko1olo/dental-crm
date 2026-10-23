import { useCallback, useState } from "react";
import { isValidRussianPhone } from "../engine/bookingPhoneUtils";

export function useBookingSmsState(
	organizationId: string | null | undefined,
	apiBaseUrl: string,
	patientPhone: string,
	requireSmsVerification?: boolean,
	showToast?: (msg: string, type?: "info" | "warning" | "error" | "success") => void,
) {
	const showSmsVerification = Boolean(requireSmsVerification);
	const [smsCodeSent, setSmsCodeSent] = useState(false);
	const [enteredSmsCode, setEnteredSmsCode] = useState("");
	const [isSmsVerified, setIsSmsVerified] = useState(false);
	const [isSmsFallbackActive, setIsSmsFallbackActive] = useState(false);
	const [smsResendCountdown, setSmsResendCountdown] = useState(0);
	const [smsError, setSmsError] = useState<string | null>(null);

	const handleEnableSmsFallback = useCallback(() => {
		setIsSmsFallbackActive(true);
		setSmsError(null);
		showToast?.("Режим предварительной брони: администратор свяжется с вами для подтверждения", "info");
	}, [showToast]);

	const handleSendSmsCode = async () => {
		if (!isValidRussianPhone(patientPhone)) {
			setSmsError("Введите корректный номер телефона");
			return;
		}
		setSmsError(null);
		if (organizationId) {
			try {
				const response = await fetch(`${apiBaseUrl}/${organizationId}/send-otp`, {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({ phone: patientPhone }),
				});
				if (!response.ok) {
					const errData = await response.json().catch(() => ({}));
					setIsSmsFallbackActive(true);
					setSmsError(errData?.message || errData?.error || "Служба СМС временно недоступна. Запись переключена в режим предварительной брони.");
					showToast?.("Служба СМС временно недоступна. Вы можете завершить бронь без СМС — администратор перезвонит вам.", "info");
					return;
				}
			} catch {
				setIsSmsFallbackActive(true);
				setSmsError("Сбой связи со службой СМС. Запись переключена в режим предварительной брони.");
				showToast?.("Сбой связи с СМС-шлюзом. Запись переключена в режим предварительной брони без кода.", "info");
				return;
			}
		}
		setSmsCodeSent(true);
		setSmsResendCountdown(60);
	};

	const handleVerifySmsCode = async () => {
		if (!enteredSmsCode.trim()) {
			setSmsError("Введите проверочный код из сообщения");
			return;
		}
		setSmsError(null);
		if (organizationId) {
			try {
				const response = await fetch(`${apiBaseUrl}/${organizationId}/verify-otp`, {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({ phone: patientPhone, code: enteredSmsCode.trim() }),
				});
				if (!response.ok) {
					const errData = await response.json().catch(() => ({}));
					setSmsError(errData?.message || errData?.error || "Неверный код. Проверьте правильность ввода.");
					return;
				}
			} catch {
				setSmsError("Сбой связи с сервером при проверке кода");
				return;
			}
		}
		setIsSmsVerified(true);
		setSmsError(null);
	};

	return {
		showSmsVerification,
		smsCodeSent,
		setSmsCodeSent,
		enteredSmsCode,
		setEnteredSmsCode,
		isSmsVerified,
		setIsSmsVerified,
		isSmsFallbackActive,
		setIsSmsFallbackActive,
		smsResendCountdown,
		smsError,
		handleEnableSmsFallback,
		handleSendSmsCode,
		handleVerifySmsCode,
	};
}
