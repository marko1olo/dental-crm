import { cleanPhoneDigits } from "../../../utils/formatters";

export type VerificationMethod = "sms" | "flash_call";

export interface SendOtpResult {
	success: boolean;
	message: string;
	cooldownSeconds?: number | undefined;
	challengeId?: string | undefined;
}

/**
 * Requests phone verification code from backend /api/public/booking/send-otp
 */
export async function sendOtpVerificationRequest(
	phone: string,
	method: VerificationMethod = "sms",
	organizationId?: string | null,
	apiBaseUrl: string = "/api/public/booking",
): Promise<SendOtpResult> {
	try {
		const res = await fetch(`${apiBaseUrl}/send-otp`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				phone: cleanPhoneDigits(phone),
				method,
				organizationId: organizationId ?? undefined,
			}),
		});

		const data = (await res.json().catch(() => ({}))) as {
			success?: boolean;
			error?: string;
			message?: string;
			cooldownSeconds?: number;
			challengeId?: string;
		};

		if (!res.ok) {
			return {
				success: false,
				message: data.error || data.message || "Не удалось отправить код подтверждения",
				cooldownSeconds: data.cooldownSeconds,
			};
		}

		return {
			success: true,
			message: data.message || "Код подтверждения отправлен",
			cooldownSeconds: data.cooldownSeconds ?? 60,
			challengeId: data.challengeId,
		};
	} catch {
		return {
			success: false,
			message: "Сбой сети при отправке кода подтверждения. Пожалуйста, проверьте подключение.",
			cooldownSeconds: 15,
		};
	}
}
