import { and, eq, inArray, or, sql, type SQL } from "drizzle-orm";
import { evaluateClinicalRulesInDb } from "../../../../db/clinicalQuery.js";
import type { TenantDb } from "../../../../db/rls.js";
import { serviceCatalogItems, treatmentItems } from "../../../../db/schema.js";
import { chargeLineKopecks, rublesFromKopecks } from "../../../../money/patientDebt.js";
import { ledgerRowId } from "../../../odontogram/planHelpers.js";
import {
	LEDGER_ID_PREFIX_LENGTH,
	LEDGER_MAX_SLOT,
	LEDGER_STATUSES_OWNED_BY_PLAN,
	UUID_SHAPE,
} from "../../../odontogram/types.js";

export interface SyncPlanLedgerItemInput {
	priceId: string;
	name?: string | null | undefined;
	toothNumber?: number | null | undefined;
	quantity: number;
	price: number;
	discount: number;
	phase?: number | undefined;
	isAuto?: boolean | undefined;
	doctorId?: string | null | undefined;
}

export interface SyncPlanLedgerParams {
	organizationId: string;
	patientId: string;
	savedPlanId: string;
	items: SyncPlanLedgerItemInput[];
	patientSignature?: string | null | undefined;
	allowClinicalBlockerOverride?: boolean | undefined;
	clinicalBlockerOverrideReason?: string | null | undefined;
	logger?: { warn: (obj: unknown, msg: string) => void };
}

/**
 * syncUpsertPlanLedgerItems — Синхронизация книги лечения (treatment_items) при сохранении/ревизии плана.
 * Мандаты 8b, 8e: целостный финансовый контур, детерминированные слоты и учет клинических правил.
 */
export async function syncUpsertPlanLedgerItems(
	tx: TenantDb,
	params: SyncPlanLedgerParams,
): Promise<void> {
	const {
		organizationId,
		patientId,
		savedPlanId,
		items,
		patientSignature,
		allowClinicalBlockerOverride,
		clinicalBlockerOverrideReason,
		logger,
	} = params;

	const ledgerPrefix = savedPlanId.slice(0, LEDGER_ID_PREFIX_LENGTH).toLowerCase();
	const ownedRows = await tx
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
				sql`lower(left(${treatmentItems.id}::text, ${sql.raw(String(LEDGER_ID_PREFIX_LENGTH))})) = ${ledgerPrefix}`,
			),
		);

	const rewritableIds = ownedRows
		.filter(
			(row) =>
				row.visitId === null &&
				LEDGER_STATUSES_OWNED_BY_PLAN.has(row.status),
		)
		.map((row) => row.id);

	if (rewritableIds.length > 0) {
		await tx
			.delete(treatmentItems)
			.where(
				and(
					eq(treatmentItems.organizationId, organizationId),
					inArray(treatmentItems.id, rewritableIds),
				),
			);
	}

	const keptSlots = new Set(
		ownedRows
			.filter((row) => !rewritableIds.includes(row.id))
			.map((row) => row.id.toLowerCase()),
	);

	if (items.length === 0) {
		return;
	}

	const priceIdCandidates = [
		...new Set(
			items
				.map((item) => item.priceId)
				.filter((priceId) => UUID_SHAPE.test(priceId)),
		),
	];
	const codeCandidates = [
		...new Set(
			items
				.map((item) => item.priceId)
				.filter((id) => !UUID_SHAPE.test(id) && id && id.length > 0),
		),
	];
	const titleCandidates = [
		...new Set(
			items
				.map((item) => item.name?.trim())
				.filter((t): t is string => Boolean(t && t.length > 0)),
		),
	];

	const orConditions: SQL<unknown>[] = [];
	if (priceIdCandidates.length > 0) {
		orConditions.push(inArray(serviceCatalogItems.id, priceIdCandidates));
	}
	if (codeCandidates.length > 0) {
		orConditions.push(inArray(serviceCatalogItems.code, codeCandidates));
		orConditions.push(inArray(serviceCatalogItems.order804nCode, codeCandidates));
	}
	if (titleCandidates.length > 0) {
		orConditions.push(inArray(serviceCatalogItems.title, titleCandidates));
	}

	const matchedServices = orConditions.length > 0
		? await tx
				.select({
					id: serviceCatalogItems.id,
					code: serviceCatalogItems.code,
					order804nCode: serviceCatalogItems.order804nCode,
					title: serviceCatalogItems.title,
				})
				.from(serviceCatalogItems)
				.where(
					and(
						eq(serviceCatalogItems.organizationId, organizationId),
						or(...orConditions),
					),
				)
		: [];

	const serviceLookup = new Map<string, string>();
	for (const svc of matchedServices) {
		serviceLookup.set(svc.id.toLowerCase(), svc.id);
		if (svc.code) serviceLookup.set(svc.code.toLowerCase(), svc.id);
		if (svc.order804nCode) serviceLookup.set(svc.order804nCode.toLowerCase(), svc.id);
		if (svc.title) serviceLookup.set(svc.title.toLowerCase().trim(), svc.id);
	}

	const knownServiceIds = new Set<string>(matchedServices.map((row) => row.id));

	const completedItems = await tx
		.select({ serviceId: treatmentItems.serviceId })
		.from(treatmentItems)
		.where(
			and(
				eq(treatmentItems.organizationId, organizationId),
				eq(treatmentItems.patientId, patientId),
				eq(treatmentItems.status, "completed"),
			),
		);

	const evaluation = await evaluateClinicalRulesInDb(organizationId, {
		patientId,
		serviceIds: Array.from(knownServiceIds),
		completedServiceIds: completedItems
			.map((r) => r.serviceId)
			.filter(Boolean) as string[],
		enforceBlockers: true,
	});

	const blockingRule = evaluation.evaluations.find(
		(e) => !e.resolved && e.severity === "blocker",
	);
	if (blockingRule) {
		if (allowClinicalBlockerOverride) {
			logger?.warn(
				{
					patientId,
					planId: savedPlanId,
					blockingRule: blockingRule.message,
					overrideReason: clinicalBlockerOverrideReason ?? null,
				},
				`[Автономия врача] План лечения сохранен под ответственность врача: ${blockingRule.message}`,
			);
		} else {
			const err = new Error(
				`Отказ: план содержит противопоказание. ${blockingRule.message}`,
			);
			Object.assign(err, { statusCode: 400 });
			throw err;
		}
	}

	const ledgerStatus = patientSignature ? "approved" : "proposed";

	let slot = 0;
	const ledgerValues = items.map((item, index) => {
		while (
			slot <= LEDGER_MAX_SLOT &&
			keptSlots.has(ledgerRowId(savedPlanId, slot).toLowerCase())
		) {
			slot += 1;
		}
		if (slot > LEDGER_MAX_SLOT) {
			throw new Error(
				`Позиции плана лечения некуда записать: свободных слотов книги лечения не осталось (позиция ${index + 1}).`,
			);
		}
		const id = ledgerRowId(savedPlanId, slot);
		slot += 1;

		const lineTotalRub = rublesFromKopecks(
			chargeLineKopecks({
				patientId,
				status: ledgerStatus,
				unitPriceRub: item.price,
				quantity: item.quantity,
				discountRub: item.discount,
			}),
		);
		const unitPriceRub = rublesFromKopecks(
			chargeLineKopecks({
				patientId,
				status: ledgerStatus,
				unitPriceRub: item.price,
				quantity: 1,
				discountRub: 0,
			}),
		);
		const resolvedServiceId =
			serviceLookup.get(item.priceId?.toLowerCase()) ||
			(item.name ? serviceLookup.get(item.name.trim().toLowerCase()) : null) ||
			(knownServiceIds.has(item.priceId) ? item.priceId : null);

		return {
			id,
			organizationId,
			patientId,
			visitId: null,
			serviceId: resolvedServiceId,
			toothCode:
				item.toothNumber === null || item.toothNumber === undefined
					? null
					: String(item.toothNumber),
			title: item.name?.trim() || item.priceId,
			quantity: String(item.quantity),
			priceRub: lineTotalRub,
			unitPriceRub,
			discountRub: rublesFromKopecks(
				chargeLineKopecks({
					patientId,
					status: ledgerStatus,
					unitPriceRub: item.discount,
					quantity: 1,
					discountRub: 0,
				}),
			),
			status: ledgerStatus as "proposed" | "approved",
			plannedDoctorUserId: item.doctorId ?? null,
			notes: null,
		};
	});

	await tx.insert(treatmentItems).values(ledgerValues);
}
