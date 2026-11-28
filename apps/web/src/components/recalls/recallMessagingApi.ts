import type { PatientRecallRecord } from "./recallRecordTypes";
import { clientLogger } from "../../services/logging/clientLogger";
import type { RecallInviteRequest, RecallInviteResponse } from "@dental/shared/recalls";
import {
	checkNotificationSpamCollision,
	type NotificationCollisionCheckResult,
} from "../leads/leadsFunnelEngine";

export * from "./recallStatusUpdateApi";
export * from "./recallMessageContentBuilder";

export interface RecallSafetyCheckOptions {
	readonly hasServiceAppointmentToday?: boolean;
	readonly consentMarketing?: boolean | null;
	readonly lastContactedAt?: string | Date | null;
	readonly messagesSentTodayCount?: number;
	readonly targetDate?: Date;
}

export function validateRecallInviteSafety(
	candidate: PatientRecallRecord,
	options: RecallSafetyCheckOptions = {},
): NotificationCollisionCheckResult {
	const consentMarketing =
		options.consentMarketing !== undefined
			? options.consentMarketing
			: candidate.consentMarketing ?? false;

	return checkNotificationSpamCollision({
		patientId: candidate.patientId,
		notificationType: "recall",
		consentMarketing,
		hasServiceAppointmentToday: options.hasServiceAppointmentToday,
		lastMarketingSentAt: options.lastContactedAt ?? candidate.lastInviteDate ?? null,
		messagesSentTodayCount: options.messagesSentTodayCount ?? 0,
		targetDate: options.targetDate,
	});
}

export async function sendRecallCandidateInvite(
	params: RecallInviteRequest,
	headers?: Record<string, string>,
	safetyOptions?: RecallSafetyCheckOptions,
): Promise<RecallInviteResponse> {
	if (safetyOptions) {
		const safety = checkNotificationSpamCollision({
			patientId: params.patientId,
			notificationType: "recall",
			consentMarketing: safetyOptions.consentMarketing ?? false,
			hasServiceAppointmentToday: safetyOptions.hasServiceAppointmentToday,
			lastMarketingSentAt: safetyOptions.lastContactedAt,
			messagesSentTodayCount: safetyOptions.messagesSentTodayCount,
			targetDate: safetyOptions.targetDate,
		});
		if (!safety.allowed) {
			return {
				ok: false,
				duplicate: safety.suppressionType === "same_day_collision",
				message: safety.reason || "Отправка сообщения отложена защитой от спам-коллизий.",
			};
		}
	}

	const response = await fetch("/api/recalls/invite", {
		method: "POST",
		headers: {
			"Idempotency-Key": crypto.randomUUID(),
			...(headers ?? {}),
			"content-type": "application/json",
			Accept: "application/json",
		},
		body: JSON.stringify({ patientId: params.patientId, channel: params.channel, body: params.body }),
	});

	let raw: unknown = {};
	try {
		raw = await response.json();
	} catch (parseErr) {
		clientLogger.warn("[recallMessagingApi] Failed to parse response JSON:", parseErr);
	}
	const payload = (
		raw && typeof raw === "object" && "data" in raw
			? (raw as { data: Record<string, unknown> }).data
			: raw
	) as {
		ok?: boolean; outboxId?: string; duplicate?: boolean; message?: string; error?: string;
	};
	if (!response.ok) {
		throw new Error(payload.message || `Сервер ответил ошибкой ${response.status}`);
	}

	return {
		ok: Boolean(payload.ok),
		outboxId: payload.outboxId,
		duplicate: payload.duplicate,
		message: payload.message || (payload.duplicate
			? "Этого пациента уже приглашали в этом месяце — повторное сообщение не отправлено."
			: "Приглашение поставлено в очередь."),
	};
}
