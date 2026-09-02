/**
 * apps/api/src/db/alternativeTreatmentPlansQuery.ts
 *
 * Движок альтернативных планов лечения (Feature #43 / ПП РФ №659 и ст. 20 323-ФЗ).
 *
 * Требования законодательства:
 * 1. Врач обязан проинформировать пациента о возможных вариантах и альтернативах
 *    медицинского вмешательства (ст. 20 323-ФЗ, Постановление Правительства РФ №659 от 30.05.2026).
 * 2. Альтернативные варианты группируются под единым plan_group_id.
 * 3. При согласовании одного из планов (Approved) остальные альтернативные планы
 *    в группе автоматически переводятся в статус Declined / Rejected с фиксацией причины отказа.
 * 4. В кассу и наряды разрешено передавать к оплате только позиции из утвержденного (Approved) плана.
 */

import { randomUUID } from "node:crypto";
import { and, asc, desc, eq, inArray, sql } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import {
	patients,
	serviceCatalogItems,
	treatmentItems,
	treatmentPlanItemsNew,
	treatmentPlans,
} from "./schema.js";
import {
	chargeLineKopecks,
	debtNumericText,
	rublesFromKopecks,
} from "../money/patientDebt.js";
import { sumKopecks } from "@dental/shared";
import { issuePriceFreezeToken } from "./priceFreezeTokensQuery.js";

export interface AlternativePlanItemInput {
	toothNumber?: number | null;
	priceId: string;
	name?: string | null;
	quantity: number;
	price: number;
	discount?: number;
	phase?: number;
	isAuto?: boolean;
}

export interface AlternativePlanVariantInput {
	name: string;
	alternativeTier?: string; // "optimum" | "economy" | "premium" | "compromise"
	items: AlternativePlanItemInput[];
	isInitiallyApproved?: boolean;
	notes?: string;
}

export interface CreateAlternativePlanGroupInput {
	organizationId: string;
	patientId: string;
	doctorId?: string | null;
	groupName: string;
	variants: AlternativePlanVariantInput[];
	actorUserId?: string | null;
}

export interface SelectPlanVariantInput {
	organizationId: string;
	patientId: string;
	planId: string;
	actorUserId?: string | null;
	reason?: string | null;
}

const LEDGER_ID_PREFIX_LENGTH = 32;
const LEDGER_MAX_SLOT = 0xffff;

function ledgerRowId(planId: string, slot: number): string {
	return `${planId.slice(0, LEDGER_ID_PREFIX_LENGTH)}${slot
		.toString(16)
		.padStart(4, "0")}`;
}

const UUID_SHAPE =
	/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Создать группу альтернативных планов лечения (ст. 20 323-ФЗ и ПП РФ №659)
 */
export async function createAlternativePlanGroup(
	// biome-ignore lint/suspicious/noExplicitAny: Drizzle transaction or db instance
	tx: NodePgDatabase<any>,
	input: CreateAlternativePlanGroupInput,
) {
	if (!input.variants || input.variants.length < 2) {
		const err = new Error(
			"Группа альтернативных планов должна содержать минимум 2 варианта лечения (ст. 20 323-ФЗ).",
		);
		// biome-ignore lint/suspicious/noExplicitAny: error mapping
		(err as any).statusCode = 400;
		throw err;
	}

	const planGroupId = randomUUID();
	const now = new Date();
	const createdPlans: Array<{
		id: string;
		name: string;
		alternativeTier?: string | null;
		status: string;
		totalPriceRub: number;
	}> = [];

	// Проверяем, назначен ли один из вариантов как первоначально утвержденный
	const approvedVariantIndex = input.variants.findIndex(
		(v) => v.isInitiallyApproved,
	);

	for (let i = 0; i < input.variants.length; i++) {
		const variant = input.variants[i]!;
		const isApproved = approvedVariantIndex === i;
		const status = isApproved ? "Approved" : "Draft";
		const alternativeStatus = isApproved ? "approved" : "proposed";

		const lineKopecks = variant.items.map((item) =>
			chargeLineKopecks({
				patientId: input.patientId,
				status: isApproved ? "approved" : "proposed",
				unitPriceRub: item.price,
				quantity: item.quantity,
				discountRub: item.discount ?? 0,
			}),
		);
		const totalPriceKopecks = sumKopecks(lineKopecks);
		const totalPriceText = debtNumericText(totalPriceKopecks);
		const totalPriceRub = rublesFromKopecks(totalPriceKopecks);

		const [createdPlan] = await tx
			.insert(treatmentPlans)
			.values({
				organizationId: input.organizationId,
				patientId: input.patientId,
				doctorId: input.doctorId ?? null,
				title: variant.name,
				name: variant.name,
				status,
				totalPrice: totalPriceText,
				totalPriceRub: String(totalPriceRub),
				planGroupId,
				groupName: input.groupName,
				isAlternative: true,
				alternativeTier: variant.alternativeTier ?? null,
				alternativeStatus,
				approvedAt: isApproved ? now : null,
				version: 1,
				isSynced: false,
				updatedAt: now,
				createdAt: now,
			})
			.returning({ id: treatmentPlans.id });

		if (!createdPlan) {
			throw new Error("Не удалось создать вариант альтернативного плана лечения.");
		}

		if (variant.items.length > 0) {
			await tx.insert(treatmentPlanItemsNew).values(
				variant.items.map((item) => ({
					organizationId: input.organizationId,
					planId: createdPlan.id,
					toothNumber: item.toothNumber ?? null,
					priceId: item.name
						? `${item.priceId}::${item.name}`
						: item.priceId,
					quantity: item.quantity,
					price: item.price.toString(),
					discount: (item.discount ?? 0).toString(),
					phase: item.phase ?? 1,
					isBundle: Boolean(item.isAuto),
				})),
			);
		}

		// Если этот вариант утвержден, записываем позиции в активную книгу лечения (treatmentItems)
		if (isApproved && variant.items.length > 0) {
			let slot = 0;
			const ledgerValues = variant.items.map((item) => {
				const id = ledgerRowId(createdPlan.id, slot);
				slot += 1;
				const lineTotalRub = rublesFromKopecks(
					chargeLineKopecks({
						patientId: input.patientId,
						status: "approved",
						unitPriceRub: item.price,
						quantity: item.quantity,
						discountRub: item.discount ?? 0,
					}),
				);
				const unitPriceRub = rublesFromKopecks(
					chargeLineKopecks({
						patientId: input.patientId,
						status: "approved",
						unitPriceRub: item.price,
						quantity: 1,
						discountRub: 0,
					}),
				);
				return {
					id,
					organizationId: input.organizationId,
					patientId: input.patientId,
					visitId: null,
					serviceId: UUID_SHAPE.test(item.priceId) ? item.priceId : null,
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
							patientId: input.patientId,
							status: "approved",
							unitPriceRub: item.discount ?? 0,
							quantity: 1,
							discountRub: 0,
						}),
					),
					status: "approved" as const,
					notes: `Альтернативный план: ${variant.name}`,
				};
			});
			await tx.insert(treatmentItems).values(ledgerValues);
		}

		if (isApproved) {
			await issuePriceFreezeToken(tx, {
				organizationId: input.organizationId,
				patientId: input.patientId,
				planId: createdPlan.id,
				policyKind: "standard_30_days",
				actorUserId: input.actorUserId ?? null,
				notes: `Автоматическое закрепление цен при создании утвержденного плана «${variant.name}» (ПП РФ №659)`,
			});
		}

		createdPlans.push({
			id: createdPlan.id,
			name: variant.name,
			alternativeTier: variant.alternativeTier ?? null,
			status,
			totalPriceRub,
		});
	}

	return {
		planGroupId,
		groupName: input.groupName,
		variantsCount: createdPlans.length,
		plans: createdPlans,
	};
}

/**
 * Выбрать и утвердить конкретный план из группы как основной (Approved).
 * Все остальные планы в группе переводятся в статус Declined / Alternative.
 */
export async function selectAndApprovePlanVariant(
	// biome-ignore lint/suspicious/noExplicitAny: Drizzle transaction or db instance
	tx: NodePgDatabase<any>,
	input: SelectPlanVariantInput,
) {
	const now = new Date();

	// 1. Блокируем целевой план
	const [targetPlan] = await tx
		.select()
		.from(treatmentPlans)
		.where(
			and(
				eq(treatmentPlans.id, input.planId),
				eq(treatmentPlans.patientId, input.patientId),
				eq(treatmentPlans.organizationId, input.organizationId),
			),
		)
		.for("update")
		.limit(1);

	if (!targetPlan) {
		const err = new Error("План лечения не найден.");
		// biome-ignore lint/suspicious/noExplicitAny: error mapping
		(err as any).statusCode = 404;
		throw err;
	}

	const planGroupId = targetPlan.planGroupId;
	const declinedPlanIds: string[] = [];

	// 2. Если план входит в группу альтернатив, обрабатываем всю группу
	if (planGroupId) {
		// Блокируем все планы группы
		const siblingPlans = await tx
			.select()
			.from(treatmentPlans)
			.where(
				and(
					eq(treatmentPlans.planGroupId, planGroupId),
					eq(treatmentPlans.organizationId, input.organizationId),
				),
			)
			.for("update");

		const reasonForDeclined =
			input.reason ||
			`Отклонен в пользу утвержденного варианта: «${targetPlan.name}» (ст. 20 323-ФЗ / ПП РФ №659)`;

		for (const sibling of siblingPlans) {
			if (sibling.id === targetPlan.id) continue;

			// Переводим альтернативу в статус Rejected / declined
			await tx
				.update(treatmentPlans)
				.set({
					status: "Rejected",
					alternativeStatus: "declined",
					declinedReason: reasonForDeclined,
					approvedAt: null,
					updatedAt: now,
					version: sql`${treatmentPlans.version} + 1`,
				})
				.where(eq(treatmentPlans.id, sibling.id));

			declinedPlanIds.push(sibling.id);

			// Удаляем/отменяем незавершенные позиции отклоненных планов из treatmentItems
			const siblingPrefix = sibling.id.slice(0, LEDGER_ID_PREFIX_LENGTH).toLowerCase();
			await tx
				.delete(treatmentItems)
				.where(
					and(
						eq(treatmentItems.organizationId, input.organizationId),
						eq(treatmentItems.patientId, input.patientId),
						sql`lower(left(${treatmentItems.id}::text, ${sql.raw(String(LEDGER_ID_PREFIX_LENGTH))})) = ${siblingPrefix}`,
						sql`${treatmentItems.visitId} IS NULL`,
					),
				);
		}
	}

	// 3. Утверждаем целевой план
	await tx
		.update(treatmentPlans)
		.set({
			status: "Approved",
			alternativeStatus: "approved",
			declinedReason: null,
			approvedAt: now,
			updatedAt: now,
			version: sql`${treatmentPlans.version} + 1`,
		})
		.where(eq(treatmentPlans.id, targetPlan.id));

	// 4. Синхронизируем позиции утвержденного плана в treatmentItems
	const planItems = await tx
		.select()
		.from(treatmentPlanItemsNew)
		.where(
			and(
				eq(treatmentPlanItemsNew.planId, targetPlan.id),
				eq(treatmentPlanItemsNew.organizationId, input.organizationId),
			),
		);

	const targetPrefix = targetPlan.id.slice(0, LEDGER_ID_PREFIX_LENGTH).toLowerCase();
	await tx
		.delete(treatmentItems)
		.where(
			and(
				eq(treatmentItems.organizationId, input.organizationId),
				eq(treatmentItems.patientId, input.patientId),
				sql`lower(left(${treatmentItems.id}::text, ${sql.raw(String(LEDGER_ID_PREFIX_LENGTH))})) = ${targetPrefix}`,
				sql`${treatmentItems.visitId} IS NULL`,
			),
		);

	if (planItems.length > 0) {
		let slot = 0;
		const ledgerValues = planItems.map((item) => {
			const id = ledgerRowId(targetPlan.id, slot);
			slot += 1;
			const priceNum = Number(item.price || 0);
			const discountNum = Number(item.discount || 0);
			const lineTotalRub = rublesFromKopecks(
				chargeLineKopecks({
					patientId: input.patientId,
					status: "approved",
					unitPriceRub: priceNum,
					quantity: item.quantity,
					discountRub: discountNum,
				}),
			);
			const unitPriceRub = rublesFromKopecks(
				chargeLineKopecks({
					patientId: input.patientId,
					status: "approved",
					unitPriceRub: priceNum,
					quantity: 1,
					discountRub: 0,
				}),
			);

			const separatorIndex = (item.priceId || "").indexOf("::");
			const pureServiceId =
				separatorIndex >= 0 ? item.priceId.slice(0, separatorIndex) : item.priceId;
			const title =
				separatorIndex >= 0
					? item.priceId.slice(separatorIndex + 2)
					: item.priceId;

			return {
				id,
				organizationId: input.organizationId,
				patientId: input.patientId,
				visitId: null,
				serviceId: pureServiceId && pureServiceId.length > 0 ? pureServiceId : null,
				toothCode:
					item.toothNumber === null || item.toothNumber === undefined
						? null
						: String(item.toothNumber),
				title,
				quantity: String(item.quantity),
				priceRub: lineTotalRub,
				unitPriceRub,
				discountRub: rublesFromKopecks(
					chargeLineKopecks({
						patientId: input.patientId,
						status: "approved",
						unitPriceRub: discountNum,
						quantity: 1,
						discountRub: 0,
					}),
				),
				status: "approved" as const,
				notes: `Утвержденный план лечения: ${targetPlan.name}`,
			};
		});
		await tx.insert(treatmentItems).values(ledgerValues);
	}

	// 5. Автоматически выпускаем токен закрепления цен на дату утверждения плана (Price Freeze Token / GAP_REPORT строка 164)
	const freezeToken = await issuePriceFreezeToken(tx, {
		organizationId: input.organizationId,
		patientId: input.patientId,
		planId: targetPlan.id,
		policyKind: "standard_30_days",
		actorUserId: input.actorUserId ?? null,
		notes: `Закрепление цен на дату утверждения плана «${targetPlan.name}» (ПП РФ №659)`,
	});

	return {
		success: true,
		approvedPlanId: targetPlan.id,
		planGroupId: planGroupId ?? null,
		approvedPlanName: targetPlan.name,
		totalPriceRub: Number(targetPlan.totalPriceRub || targetPlan.totalPrice || 0),
		declinedPlanIds,
		priceFreezeToken: freezeToken,
	};
}

/**
 * Получить группы альтернативных планов для пациента
 */
export async function getAlternativePlanGroupsForPatient(
	// biome-ignore lint/suspicious/noExplicitAny: Drizzle transaction or db instance
	dbClient: NodePgDatabase<any>,
	organizationId: string,
	patientId: string,
) {
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

	const groupsMap = new Map<string, {
		groupId: string;
		groupName: string;
		approvedPlanId: string | null;
		plans: Array<{
			id: string;
			name: string;
			tier: string | null;
			status: string;
			alternativeStatus: string;
			totalPriceRub: number;
			declinedReason: string | null;
			itemsCount: number;
		}>;
	}>();

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
