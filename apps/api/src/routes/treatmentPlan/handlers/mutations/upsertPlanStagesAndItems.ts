import { and, eq, inArray } from "drizzle-orm";
import { rublesToKopecks } from "@dental/shared";
import type { TenantDb } from "../../../../db/rls.js";
import {
	treatmentPlanItemsNew,
	treatmentPlanStages,
} from "../../../../db/schema.js";
import { debtNumericText } from "../../../../money/patientDebt.js";
import type { treatmentPlanUpsertSchema } from "../../../odontogram/types.js";
import type { z } from "zod";
import { syncUpsertPlanLedgerItems } from "./planLedgerSync.js";

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

	if (input.stages && input.stages.length > 0) {
		for (const stg of input.stages) {
			const order = stg.stageOrder || 1;
			const existing = existingByOrder.get(order);
			if (existing) {
				await tx
					.update(treatmentPlanStages)
					.set({
						stageName: stg.stageName || existing.stageName,
						completionPercentage: stg.completionPercentage ?? existing.completionPercentage,
					})
					.where(
						and(
							eq(treatmentPlanStages.id, existing.id),
							eq(treatmentPlanStages.organizationId, organizationId),
						),
					);
				stageMap.set(order, existing.id);
			} else {
				const [created] = await tx
					.insert(treatmentPlanStages)
					.values({
						organizationId,
						planId: savedPlanId,
						stageOrder: order,
						stageName: stg.stageName || `Этап ${order}`,
						completionPercentage: stg.completionPercentage ?? 0,
					})
					.returning({ id: treatmentPlanStages.id });
				if (created) stageMap.set(order, created.id);
			}
		}
	}

	for (const item of input.items) {
		const phaseNum = item.phase || 1;
		if (!stageMap.has(phaseNum)) {
			const existing = existingByOrder.get(phaseNum);
			if (existing) {
				stageMap.set(phaseNum, existing.id);
			} else {
				const [created] = await tx
					.insert(treatmentPlanStages)
					.values({
						organizationId,
						planId: savedPlanId,
						stageOrder: phaseNum,
						stageName: `Этап ${phaseNum}`,
						completionPercentage: 0,
					})
					.returning({ id: treatmentPlanStages.id });
				if (created) stageMap.set(phaseNum, created.id);
			}
		}
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
	for (const item of input.items) {
		const phaseNum = item.phase || 1;
		const itemPriceKopecks =
			typeof item.unitPriceKopecks === "number" && item.unitPriceKopecks > 0
				? Math.round(item.unitPriceKopecks)
				: rublesToKopecks(item.price);
		const itemDiscountKopecks = rublesToKopecks(item.discount);
		const itemPayload = {
			organizationId,
			planId: savedPlanId,
			stageId: stageMap.get(phaseNum) ?? null,
			toothNumber: item.toothNumber ?? null,
			priceId: item.priceId || (item.isCustom ? "custom" : "service-item"),
			name: item.name ?? null,
			quantity: item.quantity,
			price: debtNumericText(itemPriceKopecks),
			discount: debtNumericText(itemDiscountKopecks),
			priceKopecks: BigInt(itemPriceKopecks),
			discountKopecks: BigInt(itemDiscountKopecks),
			commissionKopecks: 0n,
			phase: phaseNum,
			isBundle: Boolean(item.isAuto),
			doctorId: item.doctorId ?? null,
		};

		if (item.id && existingItemMap.has(item.id)) {
			await tx
				.update(treatmentPlanItemsNew)
				.set(itemPayload)
				.where(
					and(
						eq(treatmentPlanItemsNew.id, item.id),
						eq(treatmentPlanItemsNew.organizationId, organizationId),
					),
				);
			createdItemsList.push({ id: item.id });
		} else {
			const [created] = await tx
				.insert(treatmentPlanItemsNew)
				.values(itemPayload)
				.returning({ id: treatmentPlanItemsNew.id });
			if (created) {
				createdItemsList.push({ id: created.id });
			}
		}
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
