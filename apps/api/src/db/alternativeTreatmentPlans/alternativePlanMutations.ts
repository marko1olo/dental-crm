/**
 * apps/api/src/db/alternativeTreatmentPlans/alternativePlanMutations.ts
 *
 * Мутации альтернативных планов лечения:
 * - Создание группы альтернатив (createAlternativePlanGroup)
 * - Утверждение одного варианта и перевод остальных в отклонённые (selectAndApprovePlanVariant)
 * - Автоматический выпуск токена фиксации цен (issuePriceFreezeToken)
 * - Запись юридически значимого аудита (audit_events)
 *
 * Законодательная база: ст. 20 и 84 Федерального закона № 323-ФЗ, ст. 149 НК РФ, Постановление Правительства РФ № 736 от 11.05.2023.
 */

import { randomUUID } from "node:crypto";
import { and, asc, eq, sql } from "drizzle-orm";
import type { TenantDb } from "../client.js";
import {
	auditEvents,
	treatmentItems,
	treatmentPlanItemsNew,
	treatmentPlans,
} from "../schema.js";
import {
	chargeLineKopecks,
	rublesFromKopecks,
} from "../../money/patientDebt.js";
import { issuePriceFreezeToken } from "../priceFreezeTokensQuery.js";
import {
	type CreateAlternativePlanGroupInput,
	type SelectPlanVariantInput,
	LEDGER_ID_PREFIX_LENGTH,
	UUID_SHAPE,
	calculateVariantFinancialSummary,
	ledgerRowId,
} from "./alternativePlanCalculations.js";

interface HttpError extends Error {
	statusCode?: number;
}

function createHttpError(message: string, statusCode: number): HttpError {
	const err = new Error(message) as HttpError;
	err.statusCode = statusCode;
	return err;
}

/**
 * Создать группу альтернативных планов лечения (ст. 20 и 84 Федерального закона № 323-ФЗ, ПП РФ № 736 от 11.05.2023)
 */
export async function createAlternativePlanGroup(
	tx: TenantDb,
	input: CreateAlternativePlanGroupInput,
) {
	if (!input.variants || input.variants.length < 2) {
		throw createHttpError(
			"Группа альтернативных планов должна содержать минимум 2 варианта лечения (ст. 20 323-ФЗ).",
			400,
		);
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

		const { totalPriceText, totalPriceRub } = calculateVariantFinancialSummary(
			input.patientId,
			isApproved,
			variant.items,
		);

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
					priceId: item.priceId,
					name: item.name ?? null,
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
				notes: `Автоматическое закрепление цен при создании утвержденного плана «${variant.name}» (ст. 84 323-ФЗ, ПП РФ № 736)`,
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
	tx: TenantDb,
	input: SelectPlanVariantInput,
) {
	const now = new Date();

	// 1. Сначала считываем метаданные целевого плана, чтобы узнать planGroupId
	const [planRow] = await tx
		.select({
			id: treatmentPlans.id,
			planGroupId: treatmentPlans.planGroupId,
			name: treatmentPlans.name,
		})
		.from(treatmentPlans)
		.where(
			and(
				eq(treatmentPlans.id, input.planId),
				eq(treatmentPlans.patientId, input.patientId),
				eq(treatmentPlans.organizationId, input.organizationId),
			),
		)
		.limit(1);

	if (!planRow) {
		throw createHttpError("План лечения не найден.", 404);
	}

	const planGroupId = planRow.planGroupId;
	const declinedPlanIds: string[] = [];
	let targetPlan: typeof treatmentPlans.$inferSelect;
	let siblingPlans: (typeof treatmentPlans.$inferSelect)[] = [];

	// 2. Блокируем строки строго в детерминированном порядке (ORDER BY id ASC),
	// чтобы исключить взаимную блокировку PostgreSQL (Deadlock 40P01) при конкурентном утверждении альтернатив
	if (planGroupId) {
		siblingPlans = await tx
			.select()
			.from(treatmentPlans)
			.where(
				and(
					eq(treatmentPlans.planGroupId, planGroupId),
					eq(treatmentPlans.organizationId, input.organizationId),
				),
			)
			.orderBy(asc(treatmentPlans.id))
			.for("update");

		const found = siblingPlans.find((p) => p.id === input.planId);
		if (!found) {
			throw createHttpError("План лечения не найден в группе альтернатив.", 404);
		}
		targetPlan = found;

		const reasonForDeclined =
			input.reason ||
			`Отклонен в пользу утвержденного варианта: «${targetPlan.name}» (ст. 20 и 84 323-ФЗ, ПП РФ № 736)`;

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
	} else {
		const [single] = await tx
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

		if (!single) {
			throw createHttpError("План лечения не найден.", 404);
		}
		targetPlan = single;
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
				item.name ||
				(separatorIndex >= 0
					? item.priceId.slice(separatorIndex + 2)
					: item.priceId);

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
		notes: `Закрепление цен на дату утверждения плана «${targetPlan.name}» (ст. 84 323-ФЗ, ПП РФ № 736)`,
	});

	// 6. Юридически значимый журнал аудита (audit_events) для фиксации факта утверждения варианта
	await tx.insert(auditEvents).values({
		id: randomUUID(),
		organizationId: input.organizationId,
		actorUserId: input.actorUserId ?? null,
		entityType: "treatment_plan",
		entityId: targetPlan.id,
		action: "approve_variant",
		reason:
			input.reason ||
			`Утвержден вариант плана лечения: «${targetPlan.name}» (ст. 20 и 84 323-ФЗ, ст. 149 НК РФ, ПП РФ № 736)`,
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
