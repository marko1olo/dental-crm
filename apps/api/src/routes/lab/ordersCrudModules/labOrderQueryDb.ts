import { and, desc, eq, sql } from "drizzle-orm";
import { rublesToKopecks, kopecksToNumericString } from "@dental/shared";
import type { TenantDb } from "../../../db/rls.js";
import { labOrders, patients, users } from "../../../db/schema.js";

/**
 * DB query helper: Select lab orders with joined patient and doctor details.
 * Мандат 8bm: чтение целочисленных копеек напрямую из БД и единое форматирование через @dental/shared.
 */
export async function selectLabOrdersQuery(
	tx: TenantDb,
	orgId: string,
	patientId?: string,
) {
	const rows = await tx
		.select({
			id: labOrders.id,
			orderNumber: labOrders.orderNumber,
			patientId: labOrders.patientId,
			patientName: patients.fullName,
			treatmentPlanId: labOrders.treatmentPlanId,
			appointmentId: labOrders.appointmentId,
			doctorId: labOrders.doctorId,
			doctorName: sql<string | null>`coalesce(${users.fullName}, ${labOrders.doctorName})`,
			laboratoryName: labOrders.laboratoryName,
			secureToken: labOrders.secureToken,
			toothFdi: labOrders.toothFdi,
			material: labOrders.material,
			colorVita: labOrders.colorVita,
			status: labOrders.status,
			stage: labOrders.stage,
			dueDate: labOrders.dueDate,
			clinicalNotes: labOrders.clinicalNotes,
			labComments: labOrders.labComments,
			attachedImageUrl: labOrders.attachedImageUrl,
			priceRub: labOrders.priceRub,
			priceKopecks: labOrders.priceKopecks,
			labCostRub: labOrders.labCostRub,
			labCostKopecks: labOrders.labCostKopecks,
			isWarranty: labOrders.isWarranty,
			parentLabOrderId: labOrders.parentLabOrderId,
			warrantyLiabilityType: labOrders.warrantyLiabilityType,
			remakeReason: labOrders.remakeReason,
			fittingAppointmentId: labOrders.fittingAppointmentId,
			laboratoryId: labOrders.laboratoryId,
			paidFromCashOperationId: labOrders.paidFromCashOperationId,
			isLockedInstalled: labOrders.isLockedInstalled,
			installedAt: labOrders.installedAt,
			sentAt: labOrders.sentAt,
			completedAt: labOrders.completedAt,
			cancelledAt: labOrders.cancelledAt,
			createdAt: labOrders.createdAt,
			updatedAt: labOrders.updatedAt,
		})
		.from(labOrders)
		.leftJoin(patients, eq(patients.id, labOrders.patientId))
		.leftJoin(users, eq(users.id, labOrders.doctorId))
		.where(
			and(
				eq(labOrders.organizationId, orgId),
				patientId ? eq(labOrders.patientId, patientId) : undefined,
			),
		)
		.orderBy(desc(labOrders.createdAt));

	return rows.map((r) => {
		const finalPriceKopecks = r.priceKopecks != null
			? Number(r.priceKopecks)
			: (r.priceRub != null ? rublesToKopecks(r.priceRub) : 0);
		const finalLabCostKopecks = r.labCostKopecks != null
			? Number(r.labCostKopecks)
			: (r.labCostRub != null ? rublesToKopecks(r.labCostRub) : 0);

		return {
			...r,
			patientName: r.patientName || "Пациент",
			orderNumber: r.orderNumber || `ЗТЛ-${r.id.slice(0, 6).toUpperCase()}`,
			laboratoryName: r.laboratoryName || null,
			priceKopecks: finalPriceKopecks,
			amountKopecks: finalPriceKopecks,
			patientPriceKopecks: finalPriceKopecks,
			labCostKopecks: finalLabCostKopecks,
			costKopecks: finalLabCostKopecks,
			priceRub: kopecksToNumericString(finalPriceKopecks),
			labCostRub: kopecksToNumericString(finalLabCostKopecks),
		};
	});
}

export { seedDemoLabOrdersIfEmpty } from "./labOrderSeedDb.js";
