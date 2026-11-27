/**
 * procedureApplyDeductionHandler.ts — Canonical SSOT procedure consumable deduction handler.
 * Consolidates `/api/treatment-consumables/apply-deduction` onto:
 *  - pg_advisory_xact_lock + INSERT ... ON CONFLICT DO NOTHING (zero 23505 races)
 *  - Canonical BOM (`procedureMaterialRules` / `procedureTechCards`) + explicit `treatment_consumables` links
 *  - Deterministic `ORDER BY id ASC FOR UPDATE` locking + FEFO (`fefoStockService.deductFefo`)
 */

import {
	isValidUuid,
	kopecksToRubles,
	resolveCostKopecks,
	type TreatmentConsumableDeductionRecord,
	type TreatmentConsumableDeductionRequest,
	type TreatmentConsumableDeductionResponse,
	type TreatmentConsumableDeductionWarning,
} from "@dental/shared";
import { and, asc, eq, inArray, or, sql } from "drizzle-orm";
import { withTenantCtx } from "../../../db/rls.js";
import {
	inventoryItems,
	procedureMaterialRules,
	procedureTechCardItems,
	procedureTechCards,
	serviceCatalogItems,
	treatmentConsumableDeductions,
	treatmentConsumables,
} from "../../../db/schema.js";
import { fefoStockService } from "../../inventory/fefoStockService.js";
import type { DbExecutor } from "../types.js";

async function executeCanonicalApplyDeduction(
	tx: DbExecutor,
	organizationId: string,
	request: TreatmentConsumableDeductionRequest,
): Promise<TreatmentConsumableDeductionResponse> {
	const refId = request.treatment_reference_id;
	await tx.execute(
		sql`SELECT pg_advisory_xact_lock(hashtext(${`${organizationId}:apply_deduction:${refId}`}))`,
	);

	const [existing] = await tx
		.select()
		.from(treatmentConsumableDeductions)
		.where(
			and(
				eq(treatmentConsumableDeductions.organizationId, organizationId),
				eq(treatmentConsumableDeductions.treatmentReferenceId, refId),
			),
		)
		.limit(1);

	if (existing) {
		return {
			success: true,
			treatmentReferenceId: refId,
			isOverdraft: existing.isOverdraft,
			alreadyProcessed: true,
			deductions: existing.deductions ?? [],
			warnings: [
				...(existing.warnings ?? []),
				{
					type: "already_processed",
					message: `Списание по идентификатору ${refId} уже было выполнено ранее.`,
				},
			],
		};
	}

	const codeCounts = new Map<string, number>();
	if (Array.isArray(request.items)) {
		for (const item of request.items) {
			if (!item.catalogItemCode || item.count <= 0) continue;
			codeCounts.set(
				item.catalogItemCode,
				(codeCounts.get(item.catalogItemCode) ?? 0) + item.count,
			);
		}
	}
	if (Array.isArray(request.catalog_item_codes)) {
		for (const code of request.catalog_item_codes) {
			if (!code) continue;
			codeCounts.set(code, (codeCounts.get(code) ?? 0) + 1);
		}
	}

	const requestedCodes = Array.from(codeCounts.keys());
	const requiredByItemId = new Map<string, number>();
	const coveredCodeItemKeys = new Set<string>();

	if (requestedCodes.length > 0) {
		// 1. Explicit treatment_consumables mappings
		const explicitLinks = await tx
			.select({
				catalogItemCode: treatmentConsumables.catalogItemCode,
				inventoryItemId: treatmentConsumables.inventoryItemId,
				quantity: treatmentConsumables.quantity,
			})
			.from(treatmentConsumables)
			.where(
				and(
					eq(treatmentConsumables.organizationId, organizationId),
					inArray(treatmentConsumables.catalogItemCode, requestedCodes),
				),
			);

		for (const link of explicitLinks) {
			const serviceCount = codeCounts.get(link.catalogItemCode) ?? 1;
			const qtyPerService = Number(link.quantity);
			if (!Number.isFinite(qtyPerService) || qtyPerService <= 0) continue;
			const totalQty = Number((qtyPerService * serviceCount).toFixed(4));
			requiredByItemId.set(
				link.inventoryItemId,
				Number(((requiredByItemId.get(link.inventoryItemId) ?? 0) + totalQty).toFixed(4)),
			);
			coveredCodeItemKeys.add(`${link.catalogItemCode}::${link.inventoryItemId}`);
		}

		// 2. Canonical BOM: serviceCatalogItems -> procedureMaterialRules & procedureTechCards
		const uuidCodes = requestedCodes.filter((c) => isValidUuid(c));
		const catalogFilter =
			uuidCodes.length > 0
				? or(
						inArray(serviceCatalogItems.code, requestedCodes),
						inArray(serviceCatalogItems.id, uuidCodes),
					)
				: inArray(serviceCatalogItems.code, requestedCodes);

		const services = await tx
			.select({
				id: serviceCatalogItems.id,
				code: serviceCatalogItems.code,
			})
			.from(serviceCatalogItems)
			.where(and(eq(serviceCatalogItems.organizationId, organizationId), catalogFilter));

		const serviceCodeMap = new Map<string, string>();
		const matchedServiceIds: string[] = [];
		for (const svc of services) {
			matchedServiceIds.push(svc.id);
			if (svc.code) serviceCodeMap.set(svc.id, svc.code);
		}

		if (matchedServiceIds.length > 0) {
			const ruleRows = await tx
				.select({
					serviceId: procedureMaterialRules.serviceId,
					inventoryItemId: procedureMaterialRules.inventoryItemId,
					quantityToDeduct: procedureMaterialRules.quantityToDeduct,
				})
				.from(procedureMaterialRules)
				.where(
					and(
						eq(procedureMaterialRules.organizationId, organizationId),
						inArray(procedureMaterialRules.serviceId, matchedServiceIds),
					),
				);

			for (const rule of ruleRows) {
				if (!rule.serviceId || !rule.inventoryItemId) continue;
				const svcCode = serviceCodeMap.get(rule.serviceId) ?? rule.serviceId;
				const svcCount = codeCounts.get(svcCode) ?? codeCounts.get(rule.serviceId) ?? 1;
				const perSvc = Number(rule.quantityToDeduct);
				if (!Number.isFinite(perSvc) || perSvc <= 0) continue;
				const dedupKey = `${svcCode}::${rule.inventoryItemId}`;
				if (coveredCodeItemKeys.has(dedupKey)) continue;
				coveredCodeItemKeys.add(dedupKey);
				const totalQty = Number((perSvc * svcCount).toFixed(4));
				requiredByItemId.set(
					rule.inventoryItemId,
					Number(((requiredByItemId.get(rule.inventoryItemId) ?? 0) + totalQty).toFixed(4)),
				);
			}

			const techCards = await tx
				.select({
					id: procedureTechCards.id,
					serviceId: procedureTechCards.serviceId,
				})
				.from(procedureTechCards)
				.where(
					and(
						eq(procedureTechCards.organizationId, organizationId),
						inArray(procedureTechCards.serviceId, matchedServiceIds),
					),
				);

			if (techCards.length > 0) {
				const tcItems = await tx
					.select()
					.from(procedureTechCardItems)
					.where(
						inArray(
							procedureTechCardItems.techCardId,
							techCards.map((tc) => tc.id),
						),
					);
				const tcServiceById = new Map(techCards.map((tc) => [tc.id, tc.serviceId]));

				for (const item of tcItems) {
					const svcId = tcServiceById.get(item.techCardId);
					if (!svcId || !item.inventoryItemId) continue;
					const svcCode = serviceCodeMap.get(svcId) ?? svcId;
					const svcCount = codeCounts.get(svcCode) ?? codeCounts.get(svcId) ?? 1;
					const qtyPerSvc = Number(item.quantity);
					if (!Number.isFinite(qtyPerSvc) || qtyPerSvc <= 0) continue;

					const dedupKey = `${svcCode}::${item.inventoryItemId}`;
					if (coveredCodeItemKeys.has(dedupKey)) continue;
					coveredCodeItemKeys.add(dedupKey);
					const totalQty = Number((qtyPerSvc * svcCount).toFixed(4));
					requiredByItemId.set(
						item.inventoryItemId,
						Number(((requiredByItemId.get(item.inventoryItemId) ?? 0) + totalQty).toFixed(4)),
					);
				}
			}
		}
	}

	const itemIds = Array.from(requiredByItemId.keys()).sort();
	const lockedItems =
		itemIds.length > 0
			? await tx
					.select()
					.from(inventoryItems)
					.where(
						and(
							eq(inventoryItems.organizationId, organizationId),
							inArray(inventoryItems.id, itemIds),
						),
					)
					.orderBy(asc(inventoryItems.id))
					.for("update")
			: [];

	const itemById = new Map(lockedItems.map((row) => [row.id, row]));
	const deductions: TreatmentConsumableDeductionRecord[] = [];
	const warnings: TreatmentConsumableDeductionWarning[] = [];
	let isOverdraft = false;

	const safeVisitId = request.visit_id && isValidUuid(request.visit_id) ? request.visit_id : null;
	const safeDoctorId =
		request.doctor_id && isValidUuid(request.doctor_id) ? request.doctor_id : null;

	for (const itemId of itemIds) {
		const inv = itemById.get(itemId);
		const requiredQty = requiredByItemId.get(itemId) ?? 0;
		if (!inv || requiredQty <= 0) continue;

		const stockBefore = Number(inv.currentQty ?? inv.stockQuantity ?? 0);
		const fefoRes = await fefoStockService.deductFefo(tx, {
			organizationId,
			inventoryItemId: inv.id,
			requiredQty,
			visitId: safeVisitId,
			userId: safeDoctorId,
			allowOverdraft: true,
			transactionType: "treatment_consumable",
			notes: request.notes
				? `${request.notes} [ref:${refId}]`
				: `Списание по техкарте приёма [ref:${refId}]`,
		});

		const stockAfter = Number((stockBefore - fefoRes.deductedQty).toFixed(4));
		const deficit =
			stockBefore >= requiredQty
				? 0
				: Number((requiredQty - Math.max(0, stockBefore)).toFixed(4));
		const itemIsDeficit = deficit > 0 || stockAfter < 0 || fefoRes.isOverdraft;
		if (itemIsDeficit) isOverdraft = true;

		const costKopecks = resolveCostKopecks(
			inv.unitCostKopecks,
			inv.unitCostRub,
			inv.pricePerUnitKopecks,
			inv.pricePerUnit,
		);

		deductions.push({
			inventoryItemId: inv.id,
			itemName: inv.name,
			quantityRequested: requiredQty,
			quantityDeducted: fefoRes.deductedQty,
			stockBefore,
			stockAfter,
			deficit,
			isDeficit: itemIsDeficit,
			unit: inv.unit ?? "шт",
			unitCostRub: kopecksToRubles(Number(costKopecks)),
		});

		if (itemIsDeficit) {
			warnings.push({
				type: stockBefore <= 0 ? "out_of_stock" : "deficit",
				inventoryItemId: inv.id,
				itemName: inv.name,
				deficit: deficit > 0 ? deficit : Math.abs(stockAfter),
				message: `Мягкий овердрафт склада по позиции «${inv.name}»: остаток ${stockAfter} ${inv.unit ?? "шт"} (дефицит ${deficit > 0 ? deficit : Math.abs(stockAfter)}).`,
			});
		}
	}

	const inserted = await tx
		.insert(treatmentConsumableDeductions)
		.values({
			organizationId,
			treatmentReferenceId: refId,
			visitId: safeVisitId,
			doctorId: safeDoctorId,
			status: "completed",
			isOverdraft,
			deductions,
			warnings,
			notes: request.notes ?? null,
		})
		.onConflictDoNothing({
			target: [
				treatmentConsumableDeductions.organizationId,
				treatmentConsumableDeductions.treatmentReferenceId,
			],
		})
		.returning({ id: treatmentConsumableDeductions.id });

	if (inserted.length === 0) {
		const [raceExisting] = await tx
			.select()
			.from(treatmentConsumableDeductions)
			.where(
				and(
					eq(treatmentConsumableDeductions.organizationId, organizationId),
					eq(treatmentConsumableDeductions.treatmentReferenceId, refId),
				),
			)
			.limit(1);
		if (raceExisting) {
			return {
				success: true,
				treatmentReferenceId: refId,
				isOverdraft: raceExisting.isOverdraft,
				alreadyProcessed: true,
				deductions: raceExisting.deductions ?? [],
				warnings: [
					...(raceExisting.warnings ?? []),
					{
						type: "already_processed",
						message: `Списание по идентификатору ${refId} уже было выполнено ранее.`,
					},
				],
			};
		}
	}

	return {
		success: true,
		treatmentReferenceId: refId,
		isOverdraft,
		alreadyProcessed: false,
		deductions,
		warnings,
	};
}

export async function applyCanonicalProcedureDeduction(
	organizationId: string,
	request: TreatmentConsumableDeductionRequest,
	existingTx?: DbExecutor,
): Promise<TreatmentConsumableDeductionResponse> {
	if (existingTx) {
		return executeCanonicalApplyDeduction(existingTx, organizationId, request);
	}
	return withTenantCtx(organizationId, async (tx) =>
		executeCanonicalApplyDeduction(tx, organizationId, request),
	);
}
