import { and, eq, inArray, ne, or, sql, type SQL } from "drizzle-orm";
import { evaluateClinicalRulesInDb } from "../../../../db/clinicalQuery.js";
import type { TenantDb } from "../../../../db/rls.js";
import { serviceCatalogItems, treatmentItems, treatmentPlans } from "../../../../db/schema.js";
import { chargeLineKopecks, rublesFromKopecks } from "../../../../money/patientDebt.js";
import { ledgerRowId } from "../../../odontogram/planHelpers.js";
import {
	LEDGER_ID_PREFIX_LENGTH,
	LEDGER_MAX_SLOT,
	LEDGER_STATUSES_OWNED_BY_PLAN,
	UUID_SHAPE,
} from "../../../odontogram/types.js";

export interface SyncPlanLedgerItemInput {
	priceId?: string | null | undefined;
	name?: string | null | undefined;
	toothNumber?: number | null | undefined;
	quantity: number;
	price: number;
	discount: number;
	unitPriceKopecks?: number | undefined;
	totalPriceKopecks?: number | undefined;
	phase?: number | undefined;
	isAuto?: boolean | undefined;
	isCustom?: boolean | undefined;
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
				or(
					eq(treatmentItems.treatmentPlanId, savedPlanId),
					sql`lower(left(${treatmentItems.id}::text, ${sql.raw(String(LEDGER_ID_PREFIX_LENGTH))})) = ${ledgerPrefix}`,
				),
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
				.filter((priceId): priceId is string => Boolean(priceId && UUID_SHAPE.test(priceId))),
		),
	];
	const codeCandidates = [
		...new Set(
			items
				.map((item) => item.priceId)
				.filter((id): id is string => Boolean(id && !UUID_SHAPE.test(id) && id.length > 0)),
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
		logger?.warn(
			{
				patientId,
				planId: savedPlanId,
				blockingRule: blockingRule.message,
				overrideReason: clinicalBlockerOverrideReason ?? "Автономия врача (Мандат 8e)",
			},
			`[Автономия врача] План лечения сохранен под ответственность врача: ${blockingRule.message}`,
		);
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
			(item.priceId ? serviceLookup.get(item.priceId.toLowerCase()) : null) ||
			(item.name ? serviceLookup.get(item.name.trim().toLowerCase()) : null) ||
			(item.priceId && knownServiceIds.has(item.priceId) ? item.priceId : null);

		return {
			id,
			organizationId,
			patientId,
			treatmentPlanId: savedPlanId,
			visitId: null,
			serviceId: resolvedServiceId,
			toothCode:
				item.toothNumber === null || item.toothNumber === undefined
					? null
					: String(item.toothNumber),
			title: item.name?.trim() || item.priceId || "Индивидуальная услуга",
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

export interface CancelRejectedPlanTierLedgerParams {
	organizationId: string;
	patientId: string;
	approvedPlanId: string;
	planGroupId?: string | null | undefined;
}

/**
 * cancelRejectedPlanTierLedgerItems — При смене тарифа или утверждении альтернативного плана
 * аннулирует (status: "cancelled") все незавершенные позиции отвергнутых вариантов из той же группы планов.
 * Мандаты 8b, 8e: целостность книги лечения (treatment_items) и предотвращение задвоения услуг.
 */
export async function cancelRejectedPlanTierLedgerItems(
	tx: TenantDb,
	params: CancelRejectedPlanTierLedgerParams,
): Promise<number> {
	const { organizationId, patientId, approvedPlanId } = params;

	let planGroupId = params.planGroupId;
	if (!planGroupId) {
		const [currentPlan] = await tx
			.select({ planGroupId: treatmentPlans.planGroupId })
			.from(treatmentPlans)
			.where(
				and(
					eq(treatmentPlans.id, approvedPlanId),
					eq(treatmentPlans.organizationId, organizationId),
				),
			)
			.limit(1);
		planGroupId = currentPlan?.planGroupId ?? null;
	}

	if (!planGroupId) {
		return 0;
	}

	// 1. Находим все отвергнутые планы в той же группе
	const siblingPlans = await tx
		.select({ id: treatmentPlans.id })
		.from(treatmentPlans)
		.where(
			and(
				eq(treatmentPlans.organizationId, organizationId),
				eq(treatmentPlans.patientId, patientId),
				eq(treatmentPlans.planGroupId, planGroupId),
				ne(treatmentPlans.id, approvedPlanId),
			),
		);

	if (siblingPlans.length === 0) {
		return 0;
	}

	const siblingIds = siblingPlans.map((p) => p.id);

	// 2. Помечаем отвергнутые альтернативные планы как Rejected
	await tx
		.update(treatmentPlans)
		.set({
			alternativeStatus: "declined",
			status: "Rejected",
			updatedAt: new Date(),
		})
		.where(
			and(
				eq(treatmentPlans.organizationId, organizationId),
				inArray(treatmentPlans.id, siblingIds),
			),
		);

	// 3. Аннулируем все незавершенные позиции отвергнутых тарифов в treatment_items
	const ledgerPrefixes = siblingIds.map((id) => id.slice(0, LEDGER_ID_PREFIX_LENGTH).toLowerCase());

	const updated = await tx
		.update(treatmentItems)
		.set({
			status: "cancelled",
		})
		.where(
			and(
				eq(treatmentItems.organizationId, organizationId),
				eq(treatmentItems.patientId, patientId),
				inArray(treatmentItems.status, ["proposed", "approved"]),
				sql`${treatmentItems.visitId} IS NULL`,
				or(
					inArray(treatmentItems.treatmentPlanId, siblingIds),
					...ledgerPrefixes.map(
						(prefix) =>
							sql`lower(left(${treatmentItems.id}::text, ${sql.raw(String(LEDGER_ID_PREFIX_LENGTH))})) = ${prefix}`,
					),
				),
			),
		)
		.returning({ id: treatmentItems.id });

	return updated.length;
}
