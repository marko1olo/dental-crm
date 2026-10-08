import { and, desc, eq, inArray } from "drizzle-orm";
import { db } from "../../db/client.js";
import {
	patients,
	treatmentItems,
	treatmentPlanItemsNew,
	treatmentPlans,
	users,
} from "../../db/schema.js";
import {
	LEDGER_ID_PREFIX_LENGTH,
	type TreatmentPlanItemRow,
	type TreatmentPlanRow,
} from "./types.js";

export function ledgerRowId(planId: string, slot: number): string {
	return `${planId.slice(0, LEDGER_ID_PREFIX_LENGTH)}${slot
		.toString(16)
		.padStart(4, "0")}`;
}

export async function ensurePatientInOrganization(
	patientId: string,
	organizationId: string,
): Promise<{ id: string } | null> {
	const [patient] = await db
		.select({ id: patients.id })
		.from(patients)
		.where(
			and(
				eq(patients.id, patientId),
				eq(patients.organizationId, organizationId),
			),
		)
		.limit(1);
	return patient ?? null;
}

export function numeric(value: unknown): number {
	const parsed = Number(value ?? 0);
	return Number.isFinite(parsed) ? parsed : 0;
}

export function splitStoredPriceId(value: string | null): { priceId: string; name: string } {
	const stored = value ?? "";
	const separatorIndex = stored.indexOf("::");
	if (separatorIndex < 0) return { priceId: stored, name: stored };
	return {
		priceId: stored.slice(0, separatorIndex),
		name: stored.slice(separatorIndex + 2) || stored.slice(0, separatorIndex),
	};
}

export function serializeTreatmentPlan(
	plan: TreatmentPlanRow,
	items: TreatmentPlanItemRow[],
	doctorsById?: Map<string, { fullName: string; specialty: string | null }>,
	ledgerMap?: Map<string, { status: string; visitId: string | null }>,
) {
	return {
		id: plan.id,
		patientId: plan.patientId,
		name: plan.name,
		status: plan.status,
		totalPrice: numeric(plan.totalPrice),
		patientSignature: plan.patientSignature ?? null,
		planGroupId: plan.planGroupId ?? null,
		groupName: plan.groupName ?? null,
		isAlternative: plan.isAlternative ?? false,
		alternativeTier: plan.alternativeTier ?? null,
		alternativeStatus: plan.alternativeStatus ?? "proposed",
		declinedReason: plan.declinedReason ?? null,
		activePriceFreezeTokenId: plan.activePriceFreezeTokenId ?? null,
		priceFreezePolicy: plan.priceFreezePolicy ?? "standard_30_days",
		priceFrozenUntil: plan.priceFrozenUntil
			? plan.priceFrozenUntil.toISOString()
			: null,
		discountMode: plan.discountMode ?? "plan_fixed",
		planDiscountPercent: Number(plan.planDiscountPercent ?? 0),
		planDiscountRub: Number(plan.planDiscountRub ?? 0),
		approvedAt: plan.approvedAt ? plan.approvedAt.toISOString() : null,
		createdAt: plan.createdAt.toISOString(),
		updatedAt: (plan.updatedAt ?? plan.createdAt).toISOString(),
		items: items.map((item, index) => {
			const { priceId, name } = splitStoredPriceId(item.priceId);
			const docInfo =
				item.doctorId && doctorsById
					? doctorsById.get(item.doctorId)
					: undefined;
			const ledgerId = ledgerRowId(plan.id, index).toLowerCase();
			const ledgerRow = ledgerMap?.get(ledgerId);
			const isCompleted = plan.status === "Completed" || ledgerRow?.status === "completed";
			return {
				id: item.id,
				toothNumber: item.toothNumber ?? undefined,
				priceId,
				name,
				quantity: item.quantity,
				price: numeric(item.price),
				discount: numeric(item.discount),
				phase: item.phase,
				isAuto: item.isBundle,
				doctorId: item.doctorId ?? null,
				doctorName: docInfo?.fullName ?? null,
				doctorSpecialty: docInfo?.specialty ?? null,
				status: isCompleted ? ("completed" as const) : ("planned" as const),
				isCompleted,
				visitId: ledgerRow?.visitId ?? null,
			};
		}),
	};
}

export async function loadTreatmentPlansForPatient(
	patientId: string,
	organizationId: string,
) {
	const plans = await db
		.select()
		.from(treatmentPlans)
		.where(
			and(
				eq(treatmentPlans.patientId, patientId),
				eq(treatmentPlans.organizationId, organizationId),
			),
		)
		.orderBy(desc(treatmentPlans.updatedAt));

	if (plans.length === 0) return [];

	const planIds = plans.map((plan) => plan.id);
	const items = await db
		.select()
		.from(treatmentPlanItemsNew)
		.where(
			and(
				inArray(treatmentPlanItemsNew.planId, planIds),
				eq(treatmentPlanItemsNew.organizationId, organizationId),
			),
		)
		.orderBy(treatmentPlanItemsNew.createdAt);

	const itemsByPlanId = new Map<string, TreatmentPlanItemRow[]>();
	for (const item of items) {
		const group = itemsByPlanId.get(item.planId) ?? [];
		group.push(item);
		itemsByPlanId.set(item.planId, group);
	}

	const doctorIds = [
		...new Set(
			items
				.map((item) => item.doctorId)
				.filter((id): id is string => Boolean(id)),
		),
	];
	const doctorsById = new Map<
		string,
		{ fullName: string; specialty: string | null }
	>();
	if (doctorIds.length > 0) {
		const docRows = await db
			.select({
				id: users.id,
				fullName: users.fullName,
				role: users.role,
				specialties: users.specialties,
			})
			.from(users)
			.where(
				and(
					eq(users.organizationId, organizationId),
					inArray(users.id, doctorIds),
				),
			);
		for (const doc of docRows) {
			const specList = Array.isArray(doc.specialties)
				? doc.specialties.join(", ")
				: null;
			doctorsById.set(doc.id, {
				fullName: doc.fullName,
				specialty:
					specList ||
					(doc.role === "doctor" ? "Врач-стоматолог" : doc.role),
			});
		}
	}

	// Загружаем записи из книги лечения (treatment_items) для определения статуса выполнения позиций
	const ledgerRows = await db
		.select({
			id: treatmentItems.id,
			status: treatmentItems.status,
			visitId: treatmentItems.visitId,
		})
		.from(treatmentItems)
		.where(
			and(
				eq(treatmentItems.organizationId, organizationId),
				eq(treatmentItems.patientId, patientId),
			),
		);

	const ledgerMap = new Map<string, { status: string; visitId: string | null }>();
	for (const lr of ledgerRows) {
		ledgerMap.set(lr.id.toLowerCase(), { status: lr.status, visitId: lr.visitId });
	}

	return plans.map((plan) =>
		serializeTreatmentPlan(
			plan,
			itemsByPlanId.get(plan.id) ?? [],
			doctorsById,
			ledgerMap,
		),
	);
}
