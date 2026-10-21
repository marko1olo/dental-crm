import type { TenantDb } from "../../../db/rls.js";
import { labOrders, patients, users } from "../../../db/schema.js";
import { eq } from "drizzle-orm";

/**
 * DB query helper: Seeds deterministic demo lab orders if empty for demo organization.
 */
export async function seedDemoLabOrdersIfEmpty(tx: TenantDb, orgId: string) {
	const orgPatients = await tx
		.select()
		.from(patients)
		.where(eq(patients.organizationId, orgId))
		.limit(4);
	const orgUsers = await tx
		.select()
		.from(users)
		.where(eq(users.organizationId, orgId))
		.limit(1);

	if (orgPatients.length > 0) {
		const now = new Date();
		const doc0 = orgUsers[0];
		const p0 = orgPatients[0]!;
		const p1 = orgPatients[1] ?? p0;
		const p2 = orgPatients[2] ?? p0;
		const p3 = orgPatients[3] ?? p0;

		await tx.insert(labOrders).values([
			{
				organizationId: orgId,
				patientId: p0.id,
				doctorId: doc0?.id ?? null,
				doctorName: doc0?.fullName ?? "Д-р Воронов А. В.",
				secureToken: `SEC-DEMO-${orgId.slice(0, 8)}-101`,
				toothFdi: "16",
				material: "Керамика IPS e.max Press (Ivoclar)",
				colorVita: "A2",
				status: "received",
				dueDate: new Date(now.getTime() + 2 * 86400_000),
				priceRub: 28000,
				clinicalNotes: "Цельнокерамическая коронка e.MAX на зуб 16. Работа доставлена из ЗТЛ в клинику, готова к примерке.",
				sentAt: new Date(now.getTime() - 4 * 86400_000),
			},
			{
				organizationId: orgId,
				patientId: p1.id,
				doctorId: doc0?.id ?? null,
				doctorName: doc0?.fullName ?? "Д-р Воронов А. В.",
				secureToken: `SEC-DEMO-${orgId.slice(0, 8)}-102`,
				toothFdi: "21",
				material: "Диоксид циркония ZrO2 Katana ML",
				colorVita: "A1",
				status: "in_progress",
				dueDate: new Date(now.getTime() + 4 * 86400_000),
				priceRub: 32000,
				clinicalNotes: "Анатомическая коронка ZrO2 на зуб 21. Этап CAD/CAM фрезеровки и синтеризации.",
				sentAt: new Date(now.getTime() - 2 * 86400_000),
			},
			{
				organizationId: orgId,
				patientId: p2.id,
				doctorId: doc0?.id ?? null,
				doctorName: doc0?.fullName ?? "Д-р Воронов А. В.",
				secureToken: `SEC-DEMO-${orgId.slice(0, 8)}-103`,
				toothFdi: "46",
				material: "Диоксид циркония Prettau Anterior",
				colorVita: "A3",
				status: "sent",
				dueDate: new Date(now.getTime() + 5 * 86400_000),
				priceRub: 24000,
				clinicalNotes: "Цифровой слепок STL отправлен в лабораторию. Моделировка каркаса.",
				sentAt: new Date(now.getTime() - 86400_000),
			},
			{
				organizationId: orgId,
				patientId: p3.id,
				doctorId: doc0?.id ?? null,
				doctorName: doc0?.fullName ?? "Д-р Воронов А. В.",
				secureToken: `SEC-DEMO-${orgId.slice(0, 8)}-104`,
				toothFdi: "36",
				material: "Металлокерамика Co-Cr Noritake",
				colorVita: "A2",
				status: "completed",
				isLockedInstalled: true,
				installedAt: new Date(now.getTime() - 86400_000),
				completedAt: new Date(now.getTime() - 86400_000),
				dueDate: new Date(now.getTime() - 2 * 86400_000),
				priceRub: 18500,
				clinicalNotes: "Коронка 36 сдана и зафиксирована в полости рта пациента.",
				sentAt: new Date(now.getTime() - 6 * 86400_000),
			},
		]);
	}
}
