import { and, eq, sql } from "drizzle-orm";
import { db } from "./client.js";
import { patientCommunicationTimelines, patients } from "./schema.js";

async function ensurePatientCommunicationTimelinesTable() {
	try {
		await db.execute(sql`
			CREATE TABLE IF NOT EXISTS "patient_communication_timelines" (
				"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
				"organization_id" uuid NOT NULL,
				"patient_name" text NOT NULL,
				"event_type" text DEFAULT 'call' NOT NULL,
				"status_color" text DEFAULT 'green' NOT NULL,
				"audio_recording_url" text,
				"comment" text NOT NULL,
				"created_at" timestamp with time zone DEFAULT now() NOT NULL
			);
		`);
	} catch (err) {
		console.warn("[ensurePatientCommunicationTimelinesTable warning]:", err);
	}
}

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
	try {
		await ensurePatientCommunicationTimelinesTable();

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

		const rows = await db
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

		return rows ?? [];
	} catch (err) {
		console.warn("[PatientCommunicationTimelines DB Fallback]:", err);
		// БЫЛО: при любой ошибке возвращалась ВЫДУМАННАЯ запись про
		// «Васильева Олега Петровича» со ссылкой на несуществующую аудиозапись —
		// в карточке реального пациента. Пустой список честнее.
		return [];
	}
}
