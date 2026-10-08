import { and, desc, eq, gte, inArray, isNotNull, lte, or, sql } from "drizzle-orm";
import { db } from "../../../db/client.js";
import {
	appointments,
	doctorCommissions,
	inventoryItems,
	inventoryTransactions,
	labItems,
	labOrders,
	organizations,
	patients,
	payments,
	serviceCatalogItems,
	treatmentItems,
	visits,
} from "../../../db/schema.js";
import type { DoctorPayoutScope } from "./types.js";

export async function fetchDoctorPayoutDrillDownDetails(scope: DoctorPayoutScope) {
	const { organizationId, from, to, onlyDoctorUserId } = scope;

	const paidVisitsDetails = await db
		.select({
			paymentId: payments.id,
			paymentAmountRub: payments.amountRub,
			paidAt: payments.paidAt,
			visitId: visits.id,
			visitCreatedAt: visits.createdAt,
			appointmentId: appointments.id,
			appointmentStartTime: appointments.startsAt,
			doctorUserId: appointments.doctorUserId,
			patientId: patients.id,
			patientName: patients.fullName,
			administrativeProfile: patients.administrativeProfile,
		})
		.from(payments)
		.innerJoin(
			visits,
			and(
				eq(payments.visitId, visits.id),
				eq(visits.organizationId, organizationId),
			),
		)
		.innerJoin(
			appointments,
			and(
				eq(visits.appointmentId, appointments.id),
				eq(appointments.organizationId, organizationId),
			),
		)
		.innerJoin(
			patients,
			and(
				eq(visits.patientId, patients.id),
				eq(patients.organizationId, organizationId),
			),
		)
		.where(
			and(
				eq(payments.organizationId, organizationId),
				eq(payments.status, "paid"),
				gte(payments.paidAt, from),
				lte(payments.paidAt, to),
				isNotNull(appointments.doctorUserId),
				onlyDoctorUserId ? eq(appointments.doctorUserId, onlyDoctorUserId) : undefined,
			),
		)
		.orderBy(desc(payments.paidAt));

	const rawVisitIds = paidVisitsDetails
		.map((v) => v.visitId)
		.filter((id): id is string => Boolean(id));
	const uniqueVisitIds = Array.from(new Set(rawVisitIds));

	let visitServices: Array<{
		id: string;
		visitId: string | null;
		title: string;
		order804nCode: string | null;
		category: string | null;
		specialty: string | null;
		toothCode: string | null;
		priceRub: unknown;
		quantity: unknown;
	}> = [];

	let visitMaterials: Array<{
		id: string;
		visitId: string | null;
		quantityChanged: unknown;
		unitCostRub: unknown;
		itemId: string | null;
		name: string | null;
		unit: string | null;
	}> = [];

	if (uniqueVisitIds.length > 0) {
		visitServices = await db
			.select({
				id: treatmentItems.id,
				visitId: treatmentItems.visitId,
				title: treatmentItems.title,
				order804nCode: serviceCatalogItems.order804nCode,
				category: serviceCatalogItems.category,
				specialty: serviceCatalogItems.specialty,
				toothCode: treatmentItems.toothCode,
				priceRub: treatmentItems.priceRub,
				quantity: treatmentItems.quantity,
			})
			.from(treatmentItems)
			.leftJoin(
				serviceCatalogItems,
				and(
					eq(treatmentItems.serviceId, serviceCatalogItems.id),
					eq(serviceCatalogItems.organizationId, organizationId),
				),
			)
			.where(
				and(
					eq(treatmentItems.organizationId, organizationId),
					inArray(treatmentItems.visitId, uniqueVisitIds),
				),
			);

		visitMaterials = await db
			.select({
				id: inventoryTransactions.id,
				visitId: inventoryTransactions.visitId,
				quantityChanged: inventoryTransactions.quantityChanged,
				unitCostRub: inventoryTransactions.unitCostRub,
				itemId: inventoryTransactions.itemId,
				name: inventoryItems.name,
				unit: inventoryItems.unit,
			})
			.from(inventoryTransactions)
			.leftJoin(
				inventoryItems,
				and(
					or(
						eq(inventoryTransactions.itemId, inventoryItems.id),
						eq(inventoryTransactions.inventoryItemId, inventoryItems.id),
					),
					eq(inventoryItems.organizationId, organizationId),
				),
			)
			.where(
				and(
					eq(inventoryTransactions.organizationId, organizationId),
					eq(inventoryTransactions.transactionType, "auto_deduct"),
					inArray(inventoryTransactions.visitId, uniqueVisitIds),
				),
			);
	}

	const rawLabOrders = await db
		.select({
			id: labOrders.id,
			doctorId: labOrders.doctorId,
			doctorName: labOrders.doctorName,
			patientId: labOrders.patientId,
			patientName: patients.fullName,
			secureToken: labOrders.secureToken,
			toothFdi: labOrders.toothFdi,
			material: labOrders.material,
			status: labOrders.status,
			priceRub: labOrders.priceRub,
			clinicalNotes: labOrders.clinicalNotes,
			dueDate: labOrders.dueDate,
			completedAt: labOrders.completedAt,
			createdAt: labOrders.createdAt,
		})
		.from(labOrders)
		.leftJoin(
			patients,
			and(
				eq(labOrders.patientId, patients.id),
				eq(patients.organizationId, organizationId),
			),
		)
		.where(
			and(
				eq(labOrders.organizationId, organizationId),
				isNotNull(labOrders.doctorId),
				inArray(labOrders.status, ["received", "completed"]),
				gte(
					sql`coalesce(${labOrders.completedAt}, ${labOrders.createdAt})`,
					from,
				),
				lte(
					sql`coalesce(${labOrders.completedAt}, ${labOrders.createdAt})`,
					to,
				),
				onlyDoctorUserId ? eq(labOrders.doctorId, onlyDoctorUserId) : undefined,
			),
		)
		.orderBy(
			desc(sql`coalesce(${labOrders.completedAt}, ${labOrders.createdAt})`),
		);

	const rawLabOrderIds = rawLabOrders.map((o) => o.id);
	let rawLabItems: Array<{
		id: string;
		labOrderId: string;
		toothFdi: number;
		restorationType: string;
		material: string;
		priceRub: unknown;
	}> = [];

	if (rawLabOrderIds.length > 0) {
		rawLabItems = await db
			.select({
				id: labItems.id,
				labOrderId: labItems.labOrderId,
				toothFdi: labItems.toothFdi,
				restorationType: labItems.restorationType,
				material: labItems.material,
				priceRub: labItems.priceRub,
			})
			.from(labItems)
			.where(
				and(
					eq(labItems.organizationId, organizationId),
					inArray(labItems.labOrderId, rawLabOrderIds),
				),
			);
	}

	const orgRows = await db
		.select({
			name: organizations.name,
			inn: organizations.inn,
		})
		.from(organizations)
		.where(eq(organizations.id, organizationId))
		.limit(1);
	const organizationName = orgRows[0]?.name ?? "Стоматологическая клиника";
	const organizationInn = orgRows[0]?.inn ?? undefined;

	const doctorSpecialtyRates = await db
		.select({
			userId: doctorCommissions.userId,
			specialty: doctorCommissions.specialty,
			serviceCategory: doctorCommissions.serviceCategory,
			commissionPct: doctorCommissions.commissionPct,
		})
		.from(doctorCommissions)
		.where(
			and(
				eq(doctorCommissions.organizationId, organizationId),
				eq(doctorCommissions.isActive, true),
				lte(doctorCommissions.effectiveFrom, to),
				isNotNull(doctorCommissions.userId),
			),
		)
		.orderBy(desc(doctorCommissions.effectiveFrom));

	return {
		organizationName,
		organizationInn,
		paidVisitsDetails,
		visitServices,
		visitMaterials,
		rawLabOrders,
		rawLabItems,
		doctorSpecialtyRates,
	};
}
