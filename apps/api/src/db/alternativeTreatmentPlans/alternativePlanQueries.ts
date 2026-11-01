/**
 * apps/api/src/db/alternativeTreatmentPlans/alternativePlanQueries.ts
 *
 * Запросы выборки альтернативных планов лечения пациента:
 * - Группировка вариантов планов по planGroupId
 * - Считывание статусов (Approved, Declined, Draft)
 * - Подсчет позиций и сумм для интерфейса согласования планов
 */

import { and, desc, eq, inArray } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import {
	treatmentPlanItemsNew,
	treatmentPlans,
} from "../schema.js";

export interface AlternativePlanSummaryItem {
	id: string;
	name: string;
	tier: string | null;
	status: string;
	alternativeStatus: string;
	totalPriceRub: number;
	declinedReason: string | null;
	itemsCount: number;
}

export interface AlternativePlanGroupRecord {
	groupId: string;
	groupName: string;
	approvedPlanId: string | null;
	plans: AlternativePlanSummaryItem[];
}

/**
 * Получить группы альтернативных планов для пациента
 */
export async function getAlternativePlanGroupsForPatient(
	// biome-ignore lint/suspicious/noExplicitAny: Drizzle transaction or db instance
	dbClient: NodePgDatabase<any>,
	organizationId: string,
	patientId: string,
): Promise<AlternativePlanGroupRecord[]> {
	const plans = await dbClient
		.select()
		.from(treatmentPlans)
		.where(
			and(
				eq(treatmentPlans.organizationId, organizationId),
				eq(treatmentPlans.patientId, patientId),
				eq(treatmentPlans.isAlternative, true),
			),
		)
		.orderBy(desc(treatmentPlans.updatedAt));

	if (plans.length === 0) return [];

	const planIds = plans.map((p) => p.id);
	const items = await dbClient
		.select()
		.from(treatmentPlanItemsNew)
		.where(
			and(
				inArray(treatmentPlanItemsNew.planId, planIds),
				eq(treatmentPlanItemsNew.organizationId, organizationId),
			),
		);

	const itemsByPlanId = new Map<string, typeof items>();
	for (const it of items) {
		const group = itemsByPlanId.get(it.planId) ?? [];
		group.push(it);
		itemsByPlanId.set(it.planId, group);
	}

	const groupsMap = new Map<string, AlternativePlanGroupRecord>();

	for (const p of plans) {
		const groupId = p.planGroupId || p.id;
		const existing = groupsMap.get(groupId) ?? {
			groupId,
			groupName: p.groupName || p.name,
			approvedPlanId: null,
			plans: [],
		};

		const isApproved = p.status === "Approved" || p.alternativeStatus === "approved";
		if (isApproved) {
			existing.approvedPlanId = p.id;
		}

		existing.plans.push({
			id: p.id,
			name: p.name,
			tier: p.alternativeTier,
			status: p.status,
			alternativeStatus: p.alternativeStatus,
			totalPriceRub: Number(p.totalPriceRub || p.totalPrice || 0),
			declinedReason: p.declinedReason,
			itemsCount: (itemsByPlanId.get(p.id) ?? []).length,
		});

		groupsMap.set(groupId, existing);
	}

	return Array.from(groupsMap.values());
}
