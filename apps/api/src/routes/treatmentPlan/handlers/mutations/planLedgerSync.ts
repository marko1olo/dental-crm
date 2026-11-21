import { and, eq, inArray, ne, or, sql, type SQL } from "drizzle-orm";
import { rublesToKopecks } from "@dental/shared";
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
	treatmentPlanItemId?: string | null | undefined;
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
			treatmentPlanItemId: treatmentItems.treatmentPlanItemId,
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

	const ownedRowsById = new Map<string, (typeof ownedRows)[0]>(
		ownedRows.map((r) => [r.id.toLowerCase(), r]),
	);

	const existingByPlanItemId = new Map<string, (typeof ownedRows)[0]>();
	for (const row of ownedRows) {
		if (row.treatmentPlanItemId && row.status !== "cancelled") {
			existingByPlanItemId.set(row.treatmentPlanItemId.toLowerCase(), row);
		}
	}

	const usedRowIds = new Set<string>();

	if (items.length === 0) {
		// Аннулируем все незавершенные позиции пустого плана
		const obsoleteRows = ownedRows.filter(
			(row) => row.visitId === null && LEDGER_STATUSES_OWNED_BY_PLAN.has(row.status),
		);
		if (obsoleteRows.length > 0) {
			await tx
				.update(treatmentItems)
				.set({ status: "cancelled" })
				.where(
					and(
						eq(treatmentItems.organizationId, organizationId),
						inArray(treatmentItems.id, obsoleteRows.map((r) => r.id)),
					),
				);
		}
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
		enforceBlockers: false,
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
				overrideReason: clinicalBlockerOverrideReason ?? "Переопределение клинических ограничений",
			},
			`[Автономия врача] План лечения сохранен под ответственность врача: ${blockingRule.message}`,
		);
	}

	const ledgerStatus = patientSignature ? "approved" : "proposed";

	const toInsert: (typeof treatmentItems.$inferInsert)[] = [];
	let slot = 0;

	for (let index = 0; index < items.length; index++) {
		const item = items[index]!;
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

		let existingRow: (typeof ownedRows)[0] | undefined;
		let rowId: string | undefined;

		const planItemIdKey = item.treatmentPlanItemId ? item.treatmentPlanItemId.toLowerCase() : null;
		if (planItemIdKey) {
			const candidate = existingByPlanItemId.get(planItemIdKey);
			if (candidate && candidate.visitId === null && LEDGER_STATUSES_OWNED_BY_PLAN.has(candidate.status)) {
				existingRow = candidate;
				rowId = candidate.id;
			}
		}

		if (!rowId) {
			while (slot <= LEDGER_MAX_SLOT) {
				const candidateId = ledgerRowId(savedPlanId, slot);
				const candidateLower = candidateId.toLowerCase();
				const existingAtSlot = ownedRowsById.get(candidateLower);
				if (existingAtSlot && (existingAtSlot.visitId !== null || !LEDGER_STATUSES_OWNED_BY_PLAN.has(existingAtSlot.status))) {
					slot += 1;
					continue;
				}
				if (usedRowIds.has(candidateLower)) {
					slot += 1;
					continue;
				}
				rowId = candidateId;
				existingRow = existingAtSlot;
				slot += 1;
				break;
			}
		}

		if (!rowId) {
			throw new Error(
				`Позиции плана лечения некуда записать: свободных слотов книги лечения не осталось (позиция ${index + 1}).`,
			);
		}

		usedRowIds.add(rowId.toLowerCase());

		if (existingRow && existingRow.visitId === null && LEDGER_STATUSES_OWNED_BY_PLAN.has(existingRow.status)) {
			// Обновляем существующую незавершенную строку в книге лечения вместо слепого пересоздания / конфликта pkey
			await tx
				.update(treatmentItems)
				.set({
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
					priceKopecks: BigInt(rublesToKopecks(item.price)),
					unitPriceKopecks: BigInt(rublesToKopecks(item.price)),
					discountKopecks: BigInt(rublesToKopecks(item.discount || 0)),
					status: ledgerStatus as "proposed" | "approved",
					plannedDoctorUserId: item.doctorId ?? null,
					treatmentPlanItemId: item.treatmentPlanItemId ?? null,
				})
				.where(
					and(
						eq(treatmentItems.organizationId, organizationId),
						eq(treatmentItems.id, existingRow.id),
					),
				);
		} else {
			toInsert.push({
				id: rowId,
				organizationId,
				patientId,
				treatmentPlanId: savedPlanId,
				treatmentPlanItemId: item.treatmentPlanItemId ?? null,
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
				priceKopecks: BigInt(rublesToKopecks(item.price)),
				unitPriceKopecks: BigInt(rublesToKopecks(item.price)),
				discountKopecks: BigInt(rublesToKopecks(item.discount || 0)),
				status: ledgerStatus as "proposed" | "approved",
				plannedDoctorUserId: item.doctorId ?? null,
				notes: null,
			});
		}
	}

	if (toInsert.length > 0) {
		await tx.insert(treatmentItems).values(toInsert);
	}

	// DEF-PLAN-03 / Red Team: Ликвидация слепого DELETE в книге лечения.
	// Аннулируем (status: "cancelled") все строки плана, удаленные из сметы, с сохранением истории.
	const obsoleteRows = ownedRows.filter(
		(row) =>
			row.visitId === null &&
			LEDGER_STATUSES_OWNED_BY_PLAN.has(row.status) &&
			!usedRowIds.has(row.id.toLowerCase()),
	);

	if (obsoleteRows.length > 0) {
		const obsoleteIds = obsoleteRows.map((r) => r.id);
		await tx
			.update(treatmentItems)
			.set({
				status: "cancelled",
			})
			.where(
				and(
					eq(treatmentItems.organizationId, organizationId),
					inArray(treatmentItems.id, obsoleteIds),
				),
			);
	}
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
