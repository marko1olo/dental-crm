import {
	checkPatientBookingBlockDetails,
	isPatientBookingBlocked,
} from "../patientArchiveReasonsAndBlacklistsQuery.js";

export function useInMemory() {
	return process.env.DENTAL_STATE_PERSISTENCE === "off";
}

/**
 * Экстренность приёма определяется ТОЛЬКО структурными флагами запроса,
 * которые клиент выставляет явно в карточке острой боли
 * (allowEmergencyOverride / allowOverbooking / urgency).
 *
 * Прежний разбор свободного текста причины регуляркой («острая боль»,
 * «пульпит», «флюс»…) превращал плановое перелечивание каналов с диагнозом
 * в анамнезе в экстренный приём: молча снимались проверка чёрного списка,
 * архивной блокировки и занятости слота, а приёму ставился фейковый флаг
 * isOverbooking. Текст причины пишут люди о плановом лечении — решать,
 * экстренный ли это приём, должен администратор переключателем, а не regex.
 */
export function isEmergencyBookingOverride(input: {
	allowEmergencyOverride?: boolean | null | undefined;
	allowOverbooking?: boolean | null | undefined;
	urgency?: "routine" | "urgent" | "emergency" | null | undefined;
}): boolean {
	return Boolean(
		input?.allowEmergencyOverride ||
			input?.allowOverbooking ||
			input?.urgency === "urgent" ||
			input?.urgency === "emergency",
	);
}

/**
 * Валидация блокировок пациента (архив / черный список) с учетом исключения для острой боли.
 * Ст. 124 УК РФ (Неоказание помощи больному): экстренная запись не блокируется.
 */
export async function assertPatientNotBlocked(
	organizationId: string,
	patientId: string,
	patientStatus?: string | null,
	isEmergencyOverride = false,
): Promise<void> {
	if (isEmergencyOverride) {
		return;
	}

	if (patientStatus === "archived") {
		const details = await checkPatientBookingBlockDetails(
			organizationId,
			patientId,
		);
		const reasonText = details.reason ? ` Причина: ${details.reason}.` : "";
		const legalText = details.legalBasis
			? ` Правовое основание: ${details.legalBasis}.`
			: "";
		throw new Error(
			`Пациент находится в архиве. Запись заблокирована.${reasonText}${legalText}`,
		);
	}

	const blockDetails = await checkPatientBookingBlockDetails(
		organizationId,
		patientId,
	);
	if (blockDetails.isBlocked) {
		const reasonText = blockDetails.reason
			? ` Причина: ${blockDetails.reason}.`
			: "";
		const legalText = blockDetails.legalBasis
			? ` Правовое основание: ${blockDetails.legalBasis}.`
			: "";
		throw new Error(
			`Пациент внесен в черный список / архив. Запись заблокирована.${reasonText}${legalText}`,
		);
	}
}

export { isPatientBookingBlocked, checkPatientBookingBlockDetails };
