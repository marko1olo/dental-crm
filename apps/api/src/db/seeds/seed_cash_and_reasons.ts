/**
 * seed_cash_and_reasons.ts — Database Seed for 6 Cash Boxes and 12 Expense Reasons.
 * 
 * ВНЕДРЕНИЕ КАССОВЫХ СЧЕТОВ И СТАТЕЙ РАСХОДА (по спецификации StomX):
 * 1. 12 регламентированных статей расхода (из них 3 системно заблокированы: 1=Зарплата, 8=Подотчет, 11=Лаборатория).
 * 2. 6 счетов кассы по умолчанию для каждой организации:
 *    - main: Основная наличная касса (с ККМ 54-ФЗ)
 *    - extra: Дополнительная наличная касса филиала/кабинета
 *    - cashless: Безналичный эквайринг (POS-терминалы, СБП)
 *    - dms: Страховые компании (ДМС)
 *    - account: Расчетный счет юрлиц
 *    - expenses: Служебный счет подотчетных сумм
 */

import { and, eq } from "drizzle-orm";
import { loadAdditionalServerEnv } from "../../env/loadServerEnv.js";
import { db, pool } from "../client.js";
import { organizations } from "../schema/auth.js";
import {
	cashBoxes,
	cashExpenseReasons,
} from "../schema/finance_v2.js";

loadAdditionalServerEnv();

export const CANONICAL_EXPENSE_REASONS = [
	{ code: 1, name: "Зарплата", isLocked: true, type: "expense" },
	{ code: 2, name: "Налоги", isLocked: false, type: "expense" },
	{ code: 3, name: "Оплата канцелярии", isLocked: false, type: "expense" },
	{ code: 4, name: "Оплата комплектации и расходных материалов", isLocked: false, type: "expense" },
	{ code: 5, name: "Оплата материалов/работ", isLocked: false, type: "expense" },
	{ code: 6, name: "Оплата расходов по рекламе и маркетингу", isLocked: false, type: "expense" },
	{ code: 7, name: "Оплата расходов по услугам связи", isLocked: false, type: "expense" },
	{ code: 8, name: "Средства под отчет", isLocked: true, type: "expense" },
	{ code: 9, name: "Транспортные расходы", isLocked: false, type: "expense" },
	{ code: 10, name: "Хоз. Нужды", isLocked: false, type: "expense" },
	{ code: 11, name: "Оплата услуг лаборатории", isLocked: true, type: "expense" },
	{ code: 100, name: "Аренда помещения", isLocked: false, type: "expense" },
] as const;

export const CANONICAL_CASH_BOXES = [
	{
		name: "Основная",
		type: "main",
		isMain: true,
		isCashless: false,
		displayOrder: 1,
		kkmModel: "АТОЛ-55Ф",
		kkmActive: true,
	},
	{
		name: "Дополнительная",
		type: "extra",
		isMain: false,
		isCashless: false,
		displayOrder: 2,
		kkmModel: null,
		kkmActive: false,
	},
	{
		name: "Безналичный расчет",
		type: "cashless",
		isMain: false,
		isCashless: true,
		displayOrder: 3,
		kkmModel: "Сбербанк Эквайринг POS",
		kkmActive: true,
	},
	{
		name: "ДМС",
		type: "dms",
		isMain: false,
		isCashless: true,
		displayOrder: 4,
		kkmModel: null,
		kkmActive: false,
	},
	{
		name: "Расчетный счет",
		type: "account",
		isMain: false,
		isCashless: true,
		displayOrder: 5,
		kkmModel: null,
		kkmActive: false,
	},
	{
		name: "Расходы",
		type: "expenses",
		isMain: false,
		isCashless: false,
		displayOrder: 6,
		kkmModel: null,
		kkmActive: false,
	},
] as const;

/**
 * Обеспечивает наличие 6 счетов кассы для организации.
 */
export async function ensureOrganizationCashBoxes(
	// biome-ignore lint/suspicious/noExplicitAny: Drizzle transaction or db instance
	client: any,
	organizationId: string,
) {
	const existingBoxes = await client
		.select()
		.from(cashBoxes)
		.where(eq(cashBoxes.organizationId, organizationId));

	const existingTypes = new Set(existingBoxes.map((b: { type: string }) => b.type));
	const created: any[] = [];

	for (const boxDef of CANONICAL_CASH_BOXES) {
		if (!existingTypes.has(boxDef.type)) {
			const [newBox] = await client
				.insert(cashBoxes)
				.values({
					organizationId,
					name: boxDef.name,
					type: boxDef.type,
					balanceRub: 0,
					isMain: boxDef.isMain,
					isCashless: boxDef.isCashless,
					kkmModel: boxDef.kkmModel,
					kkmActive: boxDef.kkmActive,
					displayOrder: boxDef.displayOrder,
				})
				.returning();
			created.push(newBox);
		}
	}

	return {
		existingCount: existingBoxes.length,
		createdCount: created.length,
		boxes: [...existingBoxes, ...created],
	};
}

/**
 * Обеспечивает наличие 12 регламентированных статей расхода для организации.
 */
export async function ensureOrganizationExpenseReasons(
	// biome-ignore lint/suspicious/noExplicitAny: Drizzle transaction or db instance
	client: any,
	organizationId: string,
) {
	const existingReasons = await client
		.select()
		.from(cashExpenseReasons)
		.where(eq(cashExpenseReasons.organizationId, organizationId));

	const existingCodes = new Set(existingReasons.map((r: { code: number }) => r.code));
	const created: any[] = [];

	for (const r of CANONICAL_EXPENSE_REASONS) {
		if (!existingCodes.has(r.code)) {
			const [newReason] = await client
				.insert(cashExpenseReasons)
				.values({
					organizationId,
					code: r.code,
					name: r.name,
					isLocked: r.isLocked,
					type: r.type,
				})
				.returning();
			created.push(newReason);
		}
	}

	return {
		existingCount: existingReasons.length,
		createdCount: created.length,
		reasons: [...existingReasons, ...created],
	};
}

/**
 * Главная процедура сидирования кассовых счетов и статей расходов.
 */
export async function seedCashAndReasons(targetOrgId?: string) {
	console.log("=== [SEED] Starting Cash Boxes & Expense Reasons Seeding ===");

	const orgs = targetOrgId
		? await db.select({ id: organizations.id, name: organizations.name }).from(organizations).where(eq(organizations.id, targetOrgId))
		: await db.select({ id: organizations.id, name: organizations.name }).from(organizations);

	if (orgs.length === 0) {
		console.log("[SEED] No organizations found to seed cash accounts.");
		return;
	}

	for (const org of orgs) {
		console.log(`[SEED] Seeding Organization: ${org.name} (${org.id})`);

		const boxesResult = await ensureOrganizationCashBoxes(db, org.id);
		console.log(`  -> Cash boxes: ${boxesResult.existingCount} existed, ${boxesResult.createdCount} created.`);

		const reasonsResult = await ensureOrganizationExpenseReasons(db, org.id);
		console.log(`  -> Expense reasons: ${reasonsResult.existingCount} existed, ${reasonsResult.createdCount} created.`);
	}

	console.log("=== [SEED] Successfully completed Cash Boxes & Expense Reasons Seeding ===");
}

// Self-executing runner if script is invoked directly
if (process.argv[1]?.endsWith("seed_cash_and_reasons.ts") || process.argv[1]?.endsWith("seed_cash_and_reasons.js")) {
	seedCashAndReasons()
		.then(() => pool.end())
		.catch((err) => {
			console.error("[SEED ERROR]", err);
			pool.end().finally(() => process.exit(1));
		});
}
