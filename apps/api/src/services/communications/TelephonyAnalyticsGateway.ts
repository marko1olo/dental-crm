import { z } from "zod";

export const TELEPHONY_PROVIDERS = ["uis", "mango", "asterisk", "beeline", "megafon"] as const;
export type TelephonyProvider = (typeof TELEPHONY_PROVIDERS)[number];

export const CALL_TYPES = ["inbound", "outbound", "missed"] as const;
export type CallType = (typeof CALL_TYPES)[number];

export interface CallWebhookPayload {
	organizationId?: string;
	provider: TelephonyProvider;
	type: CallType;
	callId: string;
	patientPhone: string;
	staffExtension?: string | null;
	audioUrl?: string | null;
	durationSeconds?: number | null;
	calledAt?: Date | null;
}

export interface ParsedCallEvent {
	organizationId: string;
	provider: TelephonyProvider;
	callId: string;
	patientPhone: string;
	direction: "inbound" | "outbound";
	status: "completed" | "missed" | "busy" | "failed";
	durationSeconds: number;
	recordingUrl: string | null;
	isMissed: boolean;
	callbackRequired: boolean;
	taskTitle?: string;
	taskBody?: string;
	calledAt: Date;
}

export class TelephonyAnalyticsGateway {
	/**
	 * Парсинг и нормализация вебхука телефонии в унифицированное событие
	 */
	public parseWebhook(payload: CallWebhookPayload, defaultOrgId: string = "default-org"): ParsedCallEvent {
		const orgId = payload.organizationId || defaultOrgId;
		const cleanPhone = this.normalizePhone(payload.patientPhone);
		const isMissed = payload.type === "missed";
		const direction = payload.type === "inbound" || payload.type === "missed" ? "inbound" : "outbound";
		const status = isMissed ? "missed" : "completed";
		const duration = Math.max(0, payload.durationSeconds ?? 0);
		const calledAt = payload.calledAt ?? new Date();

		const result: ParsedCallEvent = {
			organizationId: orgId,
			provider: payload.provider,
			callId: payload.callId,
			patientPhone: cleanPhone,
			direction,
			status,
			durationSeconds: duration,
			recordingUrl: payload.audioUrl ?? null,
			isMissed,
			callbackRequired: isMissed,
			calledAt,
		};

		if (isMissed) {
			result.taskTitle = `Перезвонить по пропущенному вызову (${cleanPhone})`;
			result.taskBody = `Провайдер: ${payload.provider.toUpperCase()}, ID звонка: ${payload.callId}, время: ${calledAt.toLocaleTimeString("ru-RU")}`;
		}

		return result;
	}

	/**
	 * Нормализация телефонного номера к стандарту E.164 (+7XXXXXXXXXX)
	 */
	public normalizePhone(phone: string): string {
		const digits = phone.replace(/\D/g, "");
		if (digits.length === 11 && (digits.startsWith("7") || digits.startsWith("8"))) {
			return `+7${digits.slice(1)}`;
		}
		if (digits.length === 10) {
			return `+7${digits}`;
		}
		return phone.trim();
	}

	/**
	 * Расчет конверсии входящих звонков в успешные записи на прием (%)
	 */
	public calculateCallToBookingRate(totalInboundCalls: number, confirmedBookings: number): number {
		if (totalInboundCalls <= 0) return 0;
		if (confirmedBookings <= 0) return 0;
		const rate = (confirmedBookings / totalInboundCalls) * 100;
		return Number(Math.min(100, Math.max(0, rate)).toFixed(1));
	}

	/**
	 * Расчет средней длительности результативных разговоров (сек)
	 */
	public calculateAverageCallDuration(calls: readonly { durationSeconds: number; status: string }[]): number {
		const successfulCalls = calls.filter((c) => c.status === "completed" && c.durationSeconds > 0);
		if (successfulCalls.length === 0) return 0;
		const totalSeconds = successfulCalls.reduce((sum, c) => sum + c.durationSeconds, 0);
		return Math.round(totalSeconds / successfulCalls.length);
	}
}
