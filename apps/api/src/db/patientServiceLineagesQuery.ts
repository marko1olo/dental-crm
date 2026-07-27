import { eq, sql } from "drizzle-orm";
import { db } from "./client.js";
import { patientServiceLineages } from "./schema.js";


/**
 * БЫЛО: при пустой таблице (и при любой ошибке SQL) функция возвращала
 * выдуманную цепочку обслуживания «Васильева Олега Петровича» с источником
 * «Яндекс.Карты» — но только в общем списке; для конкретного пациента отдавался
 * пустой массив. То есть сводный экран показывал пациента, которого в клинике
 * нет, а по клику на него ничего не находилось.
 */
export async function getPatientServiceLineagesFromDb(orgId: string, patientId?: string) {
	const query = patientId
		? sql`SELECT * FROM patient_service_lineages WHERE organization_id = ${orgId} AND patient_id = ${patientId}`
		: sql`SELECT * FROM patient_service_lineages WHERE organization_id = ${orgId}`;

	const res = await db.execute(query);
	return (res.rows ?? []).map((row: any) => ({
		id: row.id,
		organizationId: row.organization_id,
		patientId: row.patient_id,
		patientName: row.patient_name,
		leadSource: row.lead_source,
		rescheduleCount: row.reschedule_count,
		waitlistEntryId: row.waitlist_entry_id,
		finalVisitId: row.final_visit_id,
		lifecycleStage: row.lifecycle_stage,
		createdAt: row.created_at,
	}));
}
