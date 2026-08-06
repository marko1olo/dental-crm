/**
 * Согласия пациентов на канал — одним запросом на всю выборку.
 *
 * ЗАЧЕМ ОТДЕЛЬНЫЙ МОДУЛЬ. Правило «согласия читаются пакетом» уже было записано
 * в коде рассылок (services/communications/audience.ts) вместе с причиной: по
 * одному запросу на пациента — это тысяча запросов на тысячную рассылку. Но
 * жило оно приватной функцией внутри модуля рассылок, поэтому второй потребитель
 * того же справочника — планировщик напоминаний о приёме — его не переиспользовал
 * и спрашивал базу о каждом приёме по отдельности. Правило вынесено сюда, чтобы
 * у него был один владелец и оба вызывающих читали согласия одинаково.
 *
 * ОТБОР ПО ОРГАНИЗАЦИИ ОБЯЗАТЕЛЕН и стоит первым условием: согласие — это
 * юридическое основание для отправки, и подставить сюда согласие пациента чужой
 * клиники нельзя ни при какой ошибке вызывающего. Запрос попадает на индекс
 * patient_communication_consents_unique (organization_id, patient_id, channel,
 * scope).
 */

import { and, eq, inArray } from "drizzle-orm";
import { db } from "../../db/client.js";
import { patientCommunicationConsents } from "../../db/schema.js";
import type {
	CommunicationChannelCode,
	CommunicationConsentScope,
} from "./channelRouter.js";
import type { ConsentRecord } from "./deliveryPolicy.js";

/**
 * Согласия перечисленных пациентов, разложенные по идентификатору пациента.
 *
 * Пациент, у которого согласий нет, в карте отсутствует — вызывающий должен
 * трактовать это как пустой список, а не как «читать не удалось». Отказ базы
 * здесь не глотается: исключение уходит наверх, потому что молчаливое «согласий
 * нет» означало бы либо отказ от отправки, либо отправку без основания.
 */
export async function loadConsentsByPatient(
	organizationId: string,
	patientIds: readonly string[],
): Promise<Map<string, ConsentRecord[]>> {
	const result = new Map<string, ConsentRecord[]>();
	if (patientIds.length === 0) return result;

	const rows = await db
		.select({
			patientId: patientCommunicationConsents.patientId,
			channel: patientCommunicationConsents.channel,
			scope: patientCommunicationConsents.scope,
			state: patientCommunicationConsents.state,
		})
		.from(patientCommunicationConsents)
		.where(
			and(
				eq(patientCommunicationConsents.organizationId, organizationId),
				inArray(patientCommunicationConsents.patientId, [...patientIds]),
			),
		);

	for (const row of rows) {
		const list = result.get(row.patientId) ?? [];
		list.push({
			channel: row.channel as CommunicationChannelCode,
			scope: row.scope as CommunicationConsentScope,
			state: row.state as "granted" | "revoked",
		});
		result.set(row.patientId, list);
	}
	return result;
}
