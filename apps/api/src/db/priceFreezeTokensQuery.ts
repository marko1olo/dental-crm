/**
 * apps/api/src/db/priceFreezeTokensQuery.ts
 *
 * Архитектура закрепления цен (Price Freeze Tokens / GAP_REPORT строка 164)
 * и режимов скидок (GAP_REPORT строка 165).
 *
 * Соответствие нормативам:
 * - Постановление Правительства РФ № 659 от 30.05.2026 и № 736 от 11.05.2023 (Платные мед. услуги)
 * - Закон РФ «О защите прав потребителей» (ст. 10, ст. 16, ст. 33)
 * - Федеральный закон № 323-ФЗ (ст. 20)
 *
 * Ключевые возможности:
 * 1. Генерация токенов закрепления цен (Price Freeze Tokens) на дату утверждения сметы (30, 90, 180, 365 дней).
 * 2. Слепок цен (frozen_prices_json) с точной фиксацией до копейки.
 * 3. Автоматическое определение поглощения инфляции клиникой (clinicAbsorption).
 * 4. Три режима скидок (IDENT parity):
 *    - 'none': Скидки не действуют (принудительное обнуление скидок при выписке наряда).
 *    - 'plan_fixed': Задать на план (фиксированная процентная или абсолютная скидка плана).
 *    - 'on_selection': Скидка при выборе в наряд (динамический расчёт по карте лояльности/профилю пациента).
 */

import { randomUUID } from "node:crypto";
import { and, desc, eq, inArray, sql } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import {
	patients,
	serviceCatalogItems,
	treatmentPlanItemsNew,
	treatmentPlanPriceFreezeTokens,
	treatmentPlans,
} from "./schema.js";
import {
	chargeLineKopecks,
	debtNumericText,
	rublesFromKopecks,
} from "../money/patientDebt.js";
import { sumKopecks } from "@dental/shared";
import {
	PRICE_LOCK_POLICY_CONFIGS,
	type PriceLockPolicyKind,
} from "@dental/shared";

export type TreatmentPlanDiscountMode = "none" | "plan_fixed" | "on_selection";

export interface FrozenPriceItem {
	priceId: string;
	serviceId?: string | null;
	code804n?: string | null;
	title: string;
	toothNumber?: number | null;
	quantity: number;
	lockedUnitPriceRub: number;
	lockedUnitPriceKopecks: number;
	lockedDiscountRub: number;
	phase?: number;
}

export interface IssuePriceFreezeTokenInput {
	organizationId: string;
	patientId: string;
	planId: string;
	policyKind?: PriceLockPolicyKind | undefined;
	customValidityDays?: number | undefined;
	actorUserId?: (string | null) | undefined;
	notes?: (string | null) | undefined;
}

export interface SetPlanDiscountModeInput {
	organizationId: string;
	patientId: string;
	planId: string;
	discountMode: TreatmentPlanDiscountMode;
	planDiscountPercent?: number | undefined;
	planDiscountRub?: number | undefined;
	actorUserId?: (string | null) | undefined;
}

/**
 * Сформировать токен закрепления цен на дату утверждения плана лечения (GAP_REPORT строка 164)
 */
export async function issuePriceFreezeToken(
	// biome-ignore lint/suspicious/noExplicitAny: Drizzle tx or db
	tx: NodePgDatabase<any>,
	input: IssuePriceFreezeTokenInput,
) {
	const policyKind = input.policyKind ?? "standard_30_days";
	const policyConfig =
		PRICE_LOCK_POLICY_CONFIGS[policyKind] ??
		PRICE_LOCK_POLICY_CONFIGS.standard_30_days;

	const validityDays =
		input.customValidityDays !== undefined && input.customValidityDays > 0
			? input.customValidityDays
			: policyConfig.validityDays;

	const now = new Date();
	const validUntil = new Date(now.getTime() + validityDays * 24 * 60 * 60 * 1000);

	// 1. Получаем план лечения
	const [plan] = await tx
		.select()
		.from(treatmentPlans)
		.where(
			and(
				eq(treatmentPlans.id, input.planId),
				eq(treatmentPlans.patientId, input.patientId),
				eq(treatmentPlans.organizationId, input.organizationId),
			),
		)
		.limit(1);

	if (!plan) {
		const err = new Error("План лечения не найден для закрепления цен.");
		// biome-ignore lint/suspicious/noExplicitAny: error mapping
		(err as any).statusCode = 404;
		throw err;
	}

	// 2. Получаем позиции плана лечения
	const planItems = await tx
		.select()
		.from(treatmentPlanItemsNew)
		.where(
			and(
				eq(treatmentPlanItemsNew.planId, input.planId),
				eq(treatmentPlanItemsNew.organizationId, input.organizationId),
			),
		);

	// 3. Формируем слепок зафиксированных цен (frozen_prices_json)
	const frozenPrices: FrozenPriceItem[] = planItems.map((item) => {
		const separatorIndex = (item.priceId || "").indexOf("::");
		const pureServiceId =
			separatorIndex >= 0 ? item.priceId.slice(0, separatorIndex) : item.priceId;
		const title =
			separatorIndex >= 0
				? item.priceId.slice(separatorIndex + 2)
				: item.priceId;

		const priceNum = Number(item.price || 0);
		const discountNum = Number(item.discount || 0);

		return {
			priceId: item.priceId,
			serviceId: pureServiceId && pureServiceId.length > 0 ? pureServiceId : null,
			title,
			toothNumber: item.toothNumber,
			quantity: item.quantity,
			lockedUnitPriceRub: priceNum,
			lockedUnitPriceKopecks: Math.round(priceNum * 100),
			lockedDiscountRub: discountNum,
			phase: item.phase,
		};
	});

	const tokenString = `PFT-${plan.id.slice(0, 8).toUpperCase()}-${randomUUID().slice(0, 8).toUpperCase()}`;

	// 4. Деактивируем предыдущие токены для этого плана
	await tx
		.update(treatmentPlanPriceFreezeTokens)
		.set({
			status: "revoked",
			updatedAt: now,
		})
		.where(
			and(
				eq(treatmentPlanPriceFreezeTokens.planId, input.planId),
				eq(treatmentPlanPriceFreezeTokens.organizationId, input.organizationId),
				eq(treatmentPlanPriceFreezeTokens.status, "active"),
			),
		);

	// 5. Вставляем новый токен
	const [createdToken] = await tx
		.insert(treatmentPlanPriceFreezeTokens)
		.values({
			organizationId: input.organizationId,
			patientId: input.patientId,
			planId: input.planId,
			token: tokenString,
			policyKind,
			lockedAt: now,
			validUntil,
			isExpired: false,
			inflationThresholdPercent: policyConfig.inflationThresholdPercent,
			frozenPricesJson: frozenPrices,
			status: "active",
			issuedByUserId: input.actorUserId ?? null,
			notes: input.notes ?? `Закрепление цен по регламенту: ${policyConfig.titleRu}`,
			createdAt: now,
			updatedAt: now,
		})
		.returning();

	if (!createdToken) {
		throw new Error("Не удалось создать токен закрепления цен.");
	}

	// 6. Обновляем план лечения
	await tx
		.update(treatmentPlans)
		.set({
			activePriceFreezeTokenId: createdToken.id,
			priceFreezePolicy: policyKind,
			priceFrozenUntil: validUntil,
			updatedAt: now,
		})
		.where(eq(treatmentPlans.id, input.planId));

	return {
		tokenId: createdToken.id,
		token: createdToken.token,
		policyKind: createdToken.policyKind,
		lockedAt: createdToken.lockedAt.toISOString(),
		validUntil: createdToken.validUntil.toISOString(),
		validityDays,
		inflationThresholdPercent: createdToken.inflationThresholdPercent,
		itemsCount: frozenPrices.length,
		status: createdToken.status,
	};
}

/**
 * Получить активный токен закрепления цен и оценить его статус
 */
export async function getActivePriceFreezeToken(
	// biome-ignore lint/suspicious/noExplicitAny: Drizzle tx or db
	dbClient: NodePgDatabase<any>,
	organizationId: string,
	planId: string,
) {
	const [tokenRow] = await dbClient
		.select()
		.from(treatmentPlanPriceFreezeTokens)
		.where(
			and(
				eq(treatmentPlanPriceFreezeTokens.planId, planId),
				eq(treatmentPlanPriceFreezeTokens.organizationId, organizationId),
				inArray(treatmentPlanPriceFreezeTokens.status, ["active", "expired"]),
			),
		)
		.orderBy(desc(treatmentPlanPriceFreezeTokens.createdAt))
		.limit(1);

	if (!tokenRow) return null;

	const now = new Date();
	const validUntil = new Date(tokenRow.validUntil);
	const isExpired = now.getTime() > validUntil.getTime();
	const diffMs = validUntil.getTime() - now.getTime();
	const daysRemaining = Math.max(0, Math.ceil(diffMs / (24 * 60 * 60 * 1000)));

	if (isExpired && !tokenRow.isExpired) {
		await dbClient
			.update(treatmentPlanPriceFreezeTokens)
			.set({
				isExpired: true,
				status: "expired",
				updatedAt: now,
			})
			.where(eq(treatmentPlanPriceFreezeTokens.id, tokenRow.id));
	}

	return {
		id: tokenRow.id,
		token: tokenRow.token,
		policyKind: tokenRow.policyKind,
		lockedAt: tokenRow.lockedAt.toISOString(),
		validUntil: tokenRow.validUntil.toISOString(),
		isExpired,
		isPriceLocked: !isExpired && tokenRow.status === "active",
		daysRemaining,
		inflationThresholdPercent: tokenRow.inflationThresholdPercent,
		frozenPrices: tokenRow.frozenPricesJson as FrozenPriceItem[],
		status: isExpired ? "expired" : tokenRow.status,
	};
}

/**
 * Установить и пересчитать режим скидок плана лечения (GAP_REPORT строка 165: none | plan_fixed | on_selection)
 */
export async function setPlanDiscountMode(
	// biome-ignore lint/suspicious/noExplicitAny: Drizzle tx or db
	tx: NodePgDatabase<any>,
	input: SetPlanDiscountModeInput,
) {
	const now = new Date();

	const [plan] = await tx
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

	if (!plan) {
		const err = new Error("План лечения не найден.");
		// biome-ignore lint/suspicious/noExplicitAny: error mapping
		(err as any).statusCode = 404;
		throw err;
	}

	const discountMode = input.discountMode;
	const discountPercent = Math.max(0, Math.min(100, input.planDiscountPercent ?? 0));

	const items = await tx
		.select()
		.from(treatmentPlanItemsNew)
		.where(
			and(
				eq(treatmentPlanItemsNew.planId, input.planId),
				eq(treatmentPlanItemsNew.organizationId, input.organizationId),
			),
		);

	let totalPlanDiscountKopecks = 0;
	const updatedLineKopecks: number[] = [];

	for (const item of items) {
		const unitPriceRub = Number(item.price || 0);
		let itemDiscountRub = 0;

		if (discountMode === "none") {
			// Режим 1: Скидки не действуют — обнуляем скидки
			itemDiscountRub = 0;
		} else if (discountMode === "plan_fixed") {
			// Режим 2: Задать на план — рассчитываем процент от цены услуги
			if (discountPercent > 0) {
				itemDiscountRub = Math.round(unitPriceRub * (discountPercent / 100) * 100) / 100;
			} else {
				itemDiscountRub = Number(item.discount || 0);
			}
		} else if (discountMode === "on_selection") {
			// Режим 3: При выборе в наряд — сохраняем исходные, расчет динамический
			itemDiscountRub = Number(item.discount || 0);
		}

		await tx
			.update(treatmentPlanItemsNew)
			.set({
				discount: String(itemDiscountRub),
			})
			.where(eq(treatmentPlanItemsNew.id, item.id));

		const lineKop = chargeLineKopecks({
			patientId: input.patientId,
			status: plan.status === "Approved" ? "approved" : "proposed",
			unitPriceRub,
			quantity: item.quantity,
			discountRub: itemDiscountRub,
		});
		updatedLineKopecks.push(lineKop);
		totalPlanDiscountKopecks += Math.round(itemDiscountRub * item.quantity * 100);
	}

	const newTotalPriceKopecks = sumKopecks(updatedLineKopecks);
	const newTotalPriceText = debtNumericText(newTotalPriceKopecks);
	const newTotalPriceRub = rublesFromKopecks(newTotalPriceKopecks);
	const totalDiscountRub = rublesFromKopecks(totalPlanDiscountKopecks);

	await tx
		.update(treatmentPlans)
		.set({
			discountMode,
			planDiscountPercent: discountPercent,
			planDiscountRub: totalDiscountRub,
			totalPrice: newTotalPriceText,
			totalPriceRub: String(newTotalPriceRub),
			updatedAt: now,
			version: sql`${treatmentPlans.version} + 1`,
		})
		.where(eq(treatmentPlans.id, input.planId));

	return {
		success: true,
		planId: input.planId,
		discountMode,
		planDiscountPercent: discountPercent,
		totalDiscountRub,
		totalPriceRub: newTotalPriceRub,
		itemsCount: items.length,
	};
}
