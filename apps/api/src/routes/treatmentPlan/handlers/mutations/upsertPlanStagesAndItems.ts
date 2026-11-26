import { and, eq, inArray } from "drizzle-orm";
import { generateUuidV7, rublesToKopecks } from "@dental/shared";
import type { TenantDb } from "../../../../db/rls.js";
import {
	treatmentPlanItemsNew,
	treatmentPlanStages,
} from "../../../../db/schema.js";
import { debtNumericText } from "../../../../money/patientDebt.js";
import type { treatmentPlanUpsertSchema } from "../../../odontogram/types.js";
import type { z } from "zod";
import { syncUpsertPlanLedgerItems } from "./planLedgerSync.js";
import {
	batchSyncUpdatePlanItemsNew,
	batchSyncUpdatePlanStages,
	type TreatmentPlanItemNewSyncUpdateRow,
	type TreatmentPlanStageSyncUpdateRow,
} from "./treatmentPlanBatchUpdate.js";

type UpsertInput = z.infer<typeof treatmentPlanUpsertSchema>;

export async function syncUpsertPlanStagesAndItems(
	tx: TenantDb,
	params: {
		organizationId: string;
		patientId: string;
		savedPlanId: string;
		input: UpsertInput;
		logger?: { warn: (obj: unknown, msg: string) => void } | undefined;
	},
): Promise<void> {
	const { organizationId, patientId, savedPlanId, input, logger } = params;

	const stageMap = new Map<number, string>();
	const existingStages = await tx
		.select()
		.from(treatmentPlanStages)
		.where(
			and(
				eq(treatmentPlanStages.planId, savedPlanId),
				eq(treatmentPlanStages.organizationId, organizationId),
			),
		);
	const existingByOrder = new Map(existingStages.map((s) => [s.stageOrder, s]));

	const stageUpdates: TreatmentPlanStageSyncUpdateRow[] = [];
	const stageInserts: Array<typeof treatmentPlanStages.$inferInsert> = [];
	const seenStageOrders = new Set<number>();

	if (input.stages && input.stages.length > 0) {
		for (const stg of input.stages) {
			const order = stg.stageOrder || 1;
			seenStageOrders.add(order);
			const existing = existingByOrder.get(order);
			if (existing) {
				stageUpdates.push({
					id: existing.id,
					stageName: stg.stageName || existing.stageName,
					completionPercentage: stg.completionPercentage ?? existing.completionPercentage,
				});
				stageMap.set(order, existing.id);
			} else {
				const newStageId = generateUuidV7();
				stageInserts.push({
					id: newStageId,
					organizationId,
					planId: savedPlanId,
					stageOrder: order,
					stageName: stg.stageName || `Этап ${order}`,
					completionPercentage: stg.completionPercentage ?? 0,
				});
				stageMap.set(order, newStageId);
			}
		}
	}

	for (const item of input.items) {
		const phaseNum = item.phase || 1;
		if (!stageMap.has(phaseNum) && !seenStageOrders.has(phaseNum)) {
			seenStageOrders.add(phaseNum);
			const existing = existingByOrder.get(phaseNum);
			if (existing) {
				stageMap.set(phaseNum, existing.id);
			} else {
				const newStageId = generateUuidV7();
				stageInserts.push({
					id: newStageId,
					organizationId,
					planId: savedPlanId,
					stageOrder: phaseNum,
					stageName: `Этап ${phaseNum}`,
					completionPercentage: 0,
				});
				stageMap.set(phaseNum, newStageId);
			}
		}
	}

	if (stageUpdates.length > 0) {
		await batchSyncUpdatePlanStages(tx, organizationId, stageUpdates);
	}
	if (stageInserts.length > 0) {
		await tx.insert(treatmentPlanStages).values(stageInserts);
	}

	const existingPlanItems = await tx
		.select()
		.from(treatmentPlanItemsNew)
		.where(
			and(
				eq(treatmentPlanItemsNew.planId, savedPlanId),
				eq(treatmentPlanItemsNew.organizationId, organizationId),
			),
		);
	const existingItemMap = new Map(existingPlanItems.map((it) => [it.id, it]));

	const incomingItemIds = new Set(
		input.items
			.map((item) => item.id)
			.filter((id): id is string => Boolean(id && existingItemMap.has(id))),
	);

	const idsToDelete = existingPlanItems
		.filter((it) => !incomingItemIds.has(it.id))
		.map((it) => it.id);

	if (idsToDelete.length > 0) {
		await tx
			.delete(treatmentPlanItemsNew)
			.where(
				and(
					inArray(treatmentPlanItemsNew.id, idsToDelete),
					eq(treatmentPlanItemsNew.organizationId, organizationId),
				),
			);
	}

	const createdItemsList: Array<{ id: string }> = [];
	const planItemsToUpdate: TreatmentPlanItemNewSyncUpdateRow[] = [];
	const planItemsToInsert: Array<typeof treatmentPlanItemsNew.$inferInsert> = [];

	for (const item of input.items) {
		const phaseNum = item.phase || 1;
		const itemPriceKopecks =
			typeof item.unitPriceKopecks === "number" && item.unitPriceKopecks > 0
				? Math.round(item.unitPriceKopecks)
				: rublesToKopecks(item.price);
		const itemDiscountKopecks = rublesToKopecks(item.discount);
		const resolvedStageId = stageMap.get(phaseNum) ?? null;
		const resolvedToothNumber = item.toothNumber ?? null;
		const resolvedPriceId = item.priceId || (item.isCustom ? "custom" : "service-item");
		const resolvedName = item.name ?? null;
		const resolvedPriceStr = debtNumericText(itemPriceKopecks);
		const resolvedDiscountStr = debtNumericText(itemDiscountKopecks);
		const resolvedIsBundle = Boolean(item.isAuto);
		const resolvedDoctorId = item.doctorId ?? null;

		if (item.id && existingItemMap.has(item.id)) {
			planItemsToUpdate.push({
				id: item.id,
				stageId: resolvedStageId,
				toothNumber: resolvedToothNumber,
				priceId: resolvedPriceId,
				name: resolvedName,
				quantity: item.quantity,
				price: resolvedPriceStr,
				discount: resolvedDiscountStr,
				priceKopecks: BigInt(itemPriceKopecks),
				discountKopecks: BigInt(itemDiscountKopecks),
				commissionKopecks: 0n,
				phase: phaseNum,
				isBundle: resolvedIsBundle,
				doctorId: resolvedDoctorId,
			});
			createdItemsList.push({ id: item.id });
		} else {
			const newId = generateUuidV7();
			planItemsToInsert.push({
				id: newId,
				organizationId,
				planId: savedPlanId,
				stageId: resolvedStageId,
				toothNumber: resolvedToothNumber,
				priceId: resolvedPriceId,
				name: resolvedName,
				quantity: item.quantity,
				price: resolvedPriceStr,
				discount: resolvedDiscountStr,
				priceKopecks: BigInt(itemPriceKopecks),
				discountKopecks: BigInt(itemDiscountKopecks),
				commissionKopecks: 0n,
				phase: phaseNum,
				isBundle: resolvedIsBundle,
				doctorId: resolvedDoctorId,
			});
			createdItemsList.push({ id: newId });
		}
	}

	if (planItemsToUpdate.length > 0) {
		await batchSyncUpdatePlanItemsNew(tx, organizationId, planItemsToUpdate);
	}
	if (planItemsToInsert.length > 0) {
		await tx.insert(treatmentPlanItemsNew).values(planItemsToInsert);
	}

	const itemsWithPlanItemId = input.items.map((item, idx) => ({
		...item,
		treatmentPlanItemId: createdItemsList[idx]?.id ?? null,
	}));

	await syncUpsertPlanLedgerItems(tx, {
		organizationId,
		patientId,
		savedPlanId,
		items: itemsWithPlanItemId,
		patientSignature: input.patientSignature,
		allowClinicalBlockerOverride: input.allowClinicalBlockerOverride,
		clinicalBlockerOverrideReason: input.clinicalBlockerOverrideReason,
		logger,
	});
}
