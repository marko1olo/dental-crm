import { and, eq } from "drizzle-orm";
import { db } from "./client.js";
import { patientCommunicationTimelines, patients } from "./schema.js";

/**
 * История коммуникаций пациента.
 *
 * Таблица хранит имя пациента строкой (patient_name), а не ссылку, поэтому
 * фильтруем по имени. БЕЗ этого фильтра функция возвращала записи всех
 * пациентов организации, и они показывались в карточке каждого из них.
 */
export async function getPatientCommunicationTimelinesFromDb(
	orgId: string,
	patientId?: string,
) {
	// Имя нужно, чтобы сопоставить строки таблицы с конкретным пациентом.
	let patientName: string | null = null;
	if (patientId) {
		const [patient] = await db
			.select({ fullName: patients.fullName })
			.from(patients)
			.where(and(eq(patients.id, patientId), eq(patients.organizationId, orgId)))
			.limit(1);
		if (!patient) return [];
		patientName = patient.fullName;
	}

	// БЫЛО: весь запрос стоял в try/catch, который при ЛЮБОЙ ошибке отдавал
	// пустой список (а до этого — выдуманную запись про «Васильева Олега
	// Петровича» со ссылкой на несуществующую аудиозапись, в карточке реального
	// пациента). Сбой базы выглядел для врача как «коммуникаций не было».
	// Ошибка должна дойти до обработчика и до клиента.
	return db
		.select()
		.from(patientCommunicationTimelines)
		.where(
			patientName
				? and(
						eq(patientCommunicationTimelines.organizationId, orgId),
						eq(patientCommunicationTimelines.patientName, patientName),
					)
				: eq(patientCommunicationTimelines.organizationId, orgId),
		);
}
