import type { PatientRecallRecord } from "./recallCycleCatalog";
import type { RecallInviteRequest, RecallInviteResponse } from "@dental/shared/recalls";
import {
	checkNotificationSpamCollision,
	type NotificationCollisionCheckResult,
} from "../leads/leadsFunnelEngine";

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
			: (candidate as unknown as { consentMarketing?: boolean }).consentMarketing ?? false;

	return checkNotificationSpamCollision({
		patientId: candidate.patientId,
		notificationType: "recall",
		consentMarketing,
		hasServiceAppointmentToday: options.hasServiceAppointmentToday,
		lastMarketingSentAt: options.lastContactedAt ?? (candidate as unknown as { lastInviteDate?: string }).lastInviteDate ?? null,
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

	const response = await fetch("/api/patients/recall-candidates/invite", {
		method: "POST",
		headers: { ...(headers ?? {}), "content-type": "application/json", Accept: "application/json" },
		body: JSON.stringify({ patientId: params.patientId, channel: params.channel, body: params.body }),
	});

	const payload = (await response.json().catch(() => ({}))) as {
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

export interface RecallStatusUpdateRequest {
	readonly patientId: string;
	readonly status: string;
	readonly channel?: string | undefined;
	readonly note?: string | undefined;
}

export interface RecallStatusUpdateResponse {
	readonly ok: boolean;
	readonly patientId: string;
	readonly status: string;
	readonly updatedAt: string;
	readonly message?: string | undefined;
}

export async function sendRecallCandidateStatusUpdate(
	params: RecallStatusUpdateRequest,
	headers?: Record<string, string>,
): Promise<RecallStatusUpdateResponse> {
	const response = await fetch(
		`/api/patients/recall-candidates/${encodeURIComponent(params.patientId)}/status`,
		{
			method: "PATCH",
			headers: { ...(headers ?? {}), "content-type": "application/json", Accept: "application/json" },
			body: JSON.stringify({ status: params.status, channel: params.channel, note: params.note }),
		},
	);
	const payload = (await response.json().catch(() => ({}))) as {
		ok?: boolean; patientId?: string; status?: string; updatedAt?: string; message?: string;
	};
	if (!response.ok) {
		throw new Error(payload.message || `Сервер ответил ошибкой ${response.status}`);
	}
	return {
		ok: Boolean(payload.ok),
		patientId: payload.patientId ?? params.patientId,
		status: payload.status ?? params.status,
		updatedAt: payload.updatedAt ?? new Date().toISOString(),
		message: payload.message,
	};
}

import type { PatientRecallItem, RecallChannelType } from "./recallRecordTypes";
import { extractFirstName } from "./recallSmsAndMessaging";

export function buildRecallMessageContent(
	candidate: PatientRecallItem,
	channel: RecallChannelType,
	clinicName = "Стоматология «ДЕНТЕ»",
): string {
	const firstName = extractFirstName(candidate.fullName);
	const doctor = candidate.attendingDoctorName || "Ваш лечащий врач";
	const bookingUrl = `https://dente.clinic/booking?pat=${candidate.patientId}&recall=${candidate.category}`;

	if (channel === "sms") {
		switch (candidate.category) {
			case "implants":
				return `${firstName}, подошел срок годового осмотра имплантов в ${clinicName}. Врач: ${doctor}. Запись: ${bookingUrl}`;
			case "orthodontics":
				return `${firstName}, подошел срок проверки ретейнеров у ортодонта в ${clinicName}. Запись: ${bookingUrl}`;
			case "endodontics":
				return `${firstName}, приглашаем на контрольный снимок и осмотр в ${clinicName}. Запись: ${bookingUrl}`;
			case "hygiene":
			default:
				return `${firstName}, прошло 6 мес с осмотра в ${clinicName}. Пора на профгигиену для сохранения гарантии: ${bookingUrl}`;
		}
	}

	if (channel === "telegram") {
		switch (candidate.category) {
			case "implants":
				return (
					`Здравствуйте, ${firstName}!\n\n` +
					`Стоматологическая клиника «${clinicName}» заботится о Вашей улыбке.\n` +
					`Прошел год с момента установки имплантатов. Доктор ${doctor} приглашает Вас на плановый рентген-контроль и гарантийный осмотр.\n\n` +
					`Записаться в 1 клик:\n${bookingUrl}\n\n` +
					`Или просто напишите нам ответное сообщение!`
				);
			case "orthodontics":
				return (
					`Добрый день, ${firstName}!\n\n` +
					`Клиника «${clinicName}». Ваш ортодонт ${doctor} ждет Вас на плановый контроль ретейнеров и капп.\n` +
					`Это необходимо для сохранения ровного положения зубов.\n\n` +
					`Выбрать удобное время:\n${bookingUrl}`
				);
			case "endodontics":
				return (
					`Здравствуйте, ${firstName}!\n\n` +
					`Стоматология «${clinicName}». Подошел срок контрольного осмотра после эндодонтического лечения у доктора ${doctor}.\n\n` +
					`Онлайн-запись:\n${bookingUrl}`
				);
			case "hygiene":
			default:
				return (
					`Здравствуйте, ${firstName}!\n\n` +
					`Прошло 6 месяцев с Вашего последнего визита в «${clinicName}».\n` +
					`Доктор ${doctor} рекомендует пройти плановый осмотр и гигиену Air-Flow для сохранения гарантий и здоровья зубов.\n\n` +
					`Онлайн-запись без звонков:\n${bookingUrl}\n\n` +
					`Будем рады видеть Вас!`
				);
		}
	}

	switch (candidate.category) {
		case "implants":
			return (
				`Здравствуйте, ${firstName}!\n\n` +
				`Стоматология «${clinicName}» беспокоится о здоровье Ваших зубов.\n` +
				`Прошел 1 год с момента установки коронок на имплантатах. Доктор ${doctor} ждет Вас на контрольный рентген-осмотр и специализированную гигиену для сохранения гарантии.\n\n` +
				`Запись к доктору в 1 клик:\n${bookingUrl}\n\n` +
				`Или ответьте на это сообщение, и администратор подберет слот!`
			);
		case "orthodontics":
			return (
				`Здравствуйте, ${firstName}!\n\n` +
				`Клиника «${clinicName}». Ваш ортодонт ${doctor} приглашает на плановый контроль ретейнеров и капп.\n` +
				`Регулярный чекап гарантирует стабильность ровной дуги зубов.\n\n` +
				`Записаться онлайн:\n${bookingUrl}`
			);
		case "endodontics":
			return (
				`Добрый день, ${firstName}!\n\n` +
				`Стоматология «${clinicName}». Напоминаем о плановом контрольном снимке зуба после лечения у доктора ${doctor}.\n\n` +
				`Выбрать время:\n${bookingUrl}`
			);
		case "hygiene":
		default:
			return (
				`Здравствуйте, ${firstName}!\n\n` +
				`Клиника «${clinicName}». Напоминаем, что прошло 6 месяцев с последней профгигиены Air-Flow у доктора ${doctor}.\n\n` +
				`Регулярная гигиена сохраняет гарантию на лечение и защищает десны.\n\n` +
				`Записаться онлайн в 1 клик:\n${bookingUrl}`
			);
	}
}
