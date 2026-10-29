import { and, desc, eq, sql } from "drizzle-orm";
import type { TenantDb } from "../../../db/rls.js";
import { labOrders, patients, users } from "../../../db/schema.js";

/**
 * DB query helper: Select lab orders with joined patient and doctor details.
 */
export async function selectLabOrdersQuery(
	tx: TenantDb,
	orgId: string,
	patientId?: string,
) {
	const rows = await tx
		.select({
			id: labOrders.id,
			patientId: labOrders.patientId,
			patientName: patients.fullName,
			doctorId: labOrders.doctorId,
			doctorName: sql<string | null>`coalesce(${users.fullName}, ${labOrders.doctorName})`,
			secureToken: labOrders.secureToken,
			toothFdi: labOrders.toothFdi,
			material: labOrders.material,
			colorVita: labOrders.colorVita,
			status: labOrders.status,
			dueDate: labOrders.dueDate,
			clinicalNotes: labOrders.clinicalNotes,
			labComments: labOrders.labComments,
			attachedImageUrl: labOrders.attachedImageUrl,
			priceRub: labOrders.priceRub,
			labCostRub: labOrders.labCostRub,
			isWarranty: labOrders.isWarranty,
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
		.innerJoin(patients, eq(patients.id, labOrders.patientId))
		.leftJoin(users, eq(users.id, labOrders.doctorId))
		.where(
			and(
				eq(labOrders.organizationId, orgId),
				patientId ? eq(labOrders.patientId, patientId) : undefined,
			),
		)
		.orderBy(desc(labOrders.createdAt));

	return rows.map((r) => ({
		...r,
		priceKopecks: Math.round(Number(r.priceRub ?? 0) * 100),
		amountKopecks: Math.round(Number(r.priceRub ?? 0) * 100),
		labCostKopecks: Math.round(Number(r.labCostRub ?? 0) * 100),
		costKopecks: Math.round(Number(r.labCostRub ?? 0) * 100),
	}));
}

export { seedDemoLabOrdersIfEmpty } from "./labOrderSeedDb.js";
