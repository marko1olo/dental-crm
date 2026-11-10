/**
 * @file templateRenderer.ts
 * @description Layer 1: Communication settings resolution, reminder lead hours parsing,
 * and template variable configuration.
 */

import { eq } from "drizzle-orm";
import { withTenantCtx } from "../../../db/rls.js";
import { clinics, communicationSettings } from "../../../db/schema.js";
import {
	type CommunicationChannelCode,
	isMachineDeliverableChannel,
} from "../channelRouter.js";
import {
	DEFAULT_COMMUNICATION_SETTINGS,
	FALLBACK_COMMUNICATION_TIMEZONE,
	type ResolvedCommunicationSettings,
} from "./types.js";

export function parseChannelFallback(raw: string): CommunicationChannelCode[] {
	try {
		const parsed: unknown = JSON.parse(raw);
		if (!Array.isArray(parsed))
			return DEFAULT_COMMUNICATION_SETTINGS.channelFallback;
		const channels = parsed.filter(
			(value): value is CommunicationChannelCode =>
				typeof value === "string" && isMachineDeliverableChannel(value),
		);
		return channels.length > 0
			? channels
			: DEFAULT_COMMUNICATION_SETTINGS.channelFallback;
	} catch {
		return DEFAULT_COMMUNICATION_SETTINGS.channelFallback;
	}
}

/** Часы до приёма, когда отправлять напоминание. Порядок — от дальнего к ближнему. */
export function parseLeadHours(raw: string): number[] {
	try {
		const parsed: unknown = JSON.parse(raw);
		if (!Array.isArray(parsed)) return [24];
		const hours = parsed
			.map((value) =>
				typeof value === "number" ? value : Number.parseFloat(String(value)),
			)
			.filter((value) => Number.isFinite(value) && value > 0 && value <= 720);
		return hours.length > 0
			? [...new Set(hours)].sort((left, right) => right - left)
			: [24];
	} catch {
		return [24];
	}
}

export async function resolveCommunicationSettings(
	organizationId: string,
): Promise<ResolvedCommunicationSettings> {
	/*
	 * КОНТЕКСТ СТАВИТСЯ ЗДЕСЬ, А НЕ У ВЫЗЫВАЮЩЕГО. Эту функцию зовут и из
	 * маршрутов (контекст уже стоит от глобальной обёртки server.ts), и из
	 * фонового цикла, где запроса нет вовсе. Арендатор — обязательный аргумент,
	 * то есть он известен ВСЕГДА, поэтому обёртка принадлежит функции. Без неё
	 * фоновый вызов получал ноль строк и молча уходил на умолчания: тихие часы
	 * считались в чужом поясе, и сообщение уходило пациенту ночью.
	 * Вложенный вызов бесплатен — withTenantCtx переиспользует уже открытую
	 * транзакцию и не берёт второго соединения из пула (см. db/rls.ts).
	 */
	return withTenantCtx(organizationId, async (tx) => {
		const [row] = await tx
			.select()
			.from(communicationSettings)
			.where(eq(communicationSettings.organizationId, organizationId))
			.limit(1);

		/*
		 * Строки настроек связи у организации может не быть вовсе — так выглядит
		 * любая только что созданная клиника. Раньше в этом случае возвращались
		 * умолчания с часовым поясом "Europe/Moscow", хотя `clinics.timezone` по
		 * умолчанию `Europe/Samara`: тихие часы считались в чужом поясе, и обе их
		 * границы съезжали на час.
		 *
		 * Источник правды о поясе — клиника, поэтому спрашиваем его у неё. Берём
		 * самую раннюю клинику организации: у сети их может быть несколько, и пока
		 * настройки связи одни на организацию, выбор обязан быть определённым, а не
		 * зависеть от порядка выдачи строк. Если клиник нет ни одной — остаётся
		 * константа, и она совпадает с умолчанием `clinics.timezone`.
		 */
		if (!row) {
			const [clinic] = await tx
				.select({ timezone: clinics.timezone })
				.from(clinics)
				.where(eq(clinics.organizationId, organizationId))
				.orderBy(clinics.createdAt)
				.limit(1);

			return {
				...DEFAULT_COMMUNICATION_SETTINGS,
				timezone: clinic?.timezone ?? FALLBACK_COMMUNICATION_TIMEZONE,
			};
		}

		return {
			timezone: row.timezone,
			quietHoursStartMinute: row.quietHoursStartMinute,
			quietHoursEndMinute: row.quietHoursEndMinute,
			deferServiceInQuietHours: row.deferServiceInQuietHours,
			blockMarketingInQuietHours: row.blockMarketingInQuietHours,
			dailyLimitPerPatient: row.dailyLimitPerPatient,
			maxAttempts: row.maxAttempts,
			retryBaseSeconds: row.retryBaseSeconds,
			retryMaxSeconds: row.retryMaxSeconds,
			channelFallback: parseChannelFallback(row.channelFallbackJson),
			appointmentReminderEnabled: row.appointmentReminderEnabled,
			appointmentReminderLeadHours: parseLeadHours(
				row.appointmentReminderLeadHoursJson,
			),
			appointmentReminderWindowMinutes: row.appointmentReminderWindowMinutes,
		};
	});
}
