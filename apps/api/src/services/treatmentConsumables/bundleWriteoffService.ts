/**
 * bundleWriteoffService.ts — Layer 2: 1-click clinical shift and visit bundle write-offs.
 * Supports therapy, orthopedics, surgery, implant, and sinus_gbr bundles with soft overdraft.
 */

import { and, eq, inArray } from "drizzle-orm";
import {
	inventoryItems,
	inventoryTransactions,
} from "../../db/schema.js";
import type { DbExecutor } from "./types.js";

/**
 * 1-клик пакетное списание стандартного расхода смены медсестрой/ассистентом:
 * Комплект Терапия, Комплект Ортопедия, Комплект Хирургия.
 * Ликвидирует ручное прокликивание 40 позиций (перчатки, маски, салфетки, слюноотсосы, стаканчики).
 * Реализует мягкий овердрафт склада без блокировки работы.
 */
export async function quickWriteoffShiftBundle(
	tx: DbExecutor,
	params: {
		organizationId: string;
		bundleType?: "therapy" | "orthopedics" | "surgery";
		userId?: string | null;
		visitId?: string | null;
		notes?: string | null;
	},
): Promise<{
	success: boolean;
	isOverdraft?: boolean;
	warning?: string | undefined;
	deductedItems: Array<{
		itemId: string;
		itemName: string;
		quantity: number;
		unit: string;
		remainingStock: number;
		isOverdraft: boolean;
	}>;
	warnings: string[];
	message: string;
}> {
	const { organizationId, bundleType = "therapy", userId, visitId, notes } = params;

	const bundleDefinitions: Record<
		"therapy" | "orthopedics" | "surgery",
		Array<{
			patterns: string[];
			defaultName: string;
			category: string;
			unit: string;
			qty: number;
			defaultCost: string;
		}>
	> = {
		therapy: [
			{ patterns: ["перчатк"], defaultName: "Перчатки смотровые нитриловые (пара)", category: "Расходные материалы", unit: "пар", qty: 10, defaultCost: "35.00" },
			{ patterns: ["маск"], defaultName: "Маски трехслойные медицинские", category: "Расходные материалы", unit: "шт.", qty: 10, defaultCost: "8.00" },
			{ patterns: ["салфетк", "нагрудн"], defaultName: "Салфетки стоматологические нагрудные", category: "Расходные материалы", unit: "шт.", qty: 10, defaultCost: "6.00" },
			{ patterns: ["слюноотсос"], defaultName: "Слюноотсосы одноразовые", category: "Расходные материалы", unit: "шт.", qty: 10, defaultCost: "7.00" },
			{ patterns: ["стаканчик"], defaultName: "Стаканчики пластиковые одноразовые", category: "Расходные материалы", unit: "шт.", qty: 10, defaultCost: "4.00" },
			{ patterns: ["валик"], defaultName: "Валики ватные стоматологические", category: "Расходные материалы", unit: "шт.", qty: 50, defaultCost: "1.20" },
			{ patterns: ["микроаппликатор", "браш"], defaultName: "Микроаппликаторы (браши)", category: "Расходные материалы", unit: "шт.", qty: 20, defaultCost: "3.50" },
			{ patterns: ["игла карпульн", "иглы карпульн"], defaultName: "Иглы карпульные 0.3x21 мм", category: "Расходные материалы", unit: "шт.", qty: 5, defaultCost: "18.00" },
			{ patterns: ["артикаин", "ультракаин", "убистезин"], defaultName: "Артикаин 1:100 000 (карпула 1.7 мл)", category: "Анестетики", unit: "карп.", qty: 5, defaultCost: "120.00" },
		],
		orthopedics: [
			{ patterns: ["перчатк"], defaultName: "Перчатки смотровые нитриловые (пара)", category: "Расходные материалы", unit: "пар", qty: 8, defaultCost: "35.00" },
			{ patterns: ["маск"], defaultName: "Маски трехслойные медицинские", category: "Расходные материалы", unit: "шт.", qty: 8, defaultCost: "8.00" },
			{ patterns: ["салфетк", "нагрудн"], defaultName: "Салфетки стоматологические нагрудные", category: "Расходные материалы", unit: "шт.", qty: 8, defaultCost: "6.00" },
			{ patterns: ["слюноотсос"], defaultName: "Слюноотсосы одноразовые", category: "Расходные материалы", unit: "шт.", qty: 8, defaultCost: "7.00" },
			{ patterns: ["стаканчик"], defaultName: "Стаканчики пластиковые одноразовые", category: "Расходные материалы", unit: "шт.", qty: 8, defaultCost: "4.00" },
			{ patterns: ["канюл", "смесительн"], defaultName: "Канюли смесительные для А-силикона", category: "Расходные материалы", unit: "шт.", qty: 8, defaultCost: "45.00" },
			{ patterns: ["ложк", "слепочн"], defaultName: "Ложки слепочные перфорированные (комплект)", category: "Расходные материалы", unit: "шт.", qty: 4, defaultCost: "60.00" },
			{ patterns: ["ретракцион", "нить"], defaultName: "Нить ретракционная Ultrapak #00", category: "Расходные материалы", unit: "уп.", qty: 1, defaultCost: "850.00" },
		],
		surgery: [
			{ patterns: ["стерильн", "хирургическ", "перчатк"], defaultName: "Перчатки стерильные хирургические (пара)", category: "Расходные материалы", unit: "пар", qty: 6, defaultCost: "75.00" },
			{ patterns: ["маск"], defaultName: "Маски трехслойные медицинские", category: "Расходные материалы", unit: "шт.", qty: 6, defaultCost: "8.00" },
			{ patterns: ["марлев", "салфетк"], defaultName: "Салфетки марлевые стерильные 16x14 см", category: "Перевязочные средства", unit: "шт.", qty: 20, defaultCost: "5.00" },
			{ patterns: ["простын", "покрыти"], defaultName: "Простыни хирургические стерильные", category: "Расходные материалы", unit: "шт.", qty: 6, defaultCost: "95.00" },
			{ patterns: ["скальпел"], defaultName: "Скальпель хирургический одноразовый №15", category: "Хирургический инструментарий", unit: "шт.", qty: 3, defaultCost: "65.00" },
			{ patterns: ["шовн", "нить"], defaultName: "Шовный материал полигликолид 4-0 с иглой", category: "Шовный материал", unit: "шт.", qty: 3, defaultCost: "220.00" },
			{ patterns: ["артикаин", "ультракаин", "убистезин"], defaultName: "Артикаин 1:100 000 (карпула 1.7 мл)", category: "Анестетики", unit: "карп.", qty: 6, defaultCost: "120.00" },
			{ patterns: ["игла карпульн", "иглы карпульн"], defaultName: "Иглы карпульные 0.4x35 мм", category: "Расходные материалы", unit: "шт.", qty: 6, defaultCost: "20.00" },
		],
	};

	const activeDefinitions = bundleDefinitions[bundleType] || bundleDefinitions.therapy;
	const bundleNameRu =
		bundleType === "orthopedics"
			? "Ортопедия"
			: bundleType === "surgery"
				? "Хирургия"
				: "Терапия";

	const allOrgItems = await tx
		.select()
		.from(inventoryItems)
		.where(eq(inventoryItems.organizationId, organizationId));

	const resolvedItems: Array<{
		item: typeof inventoryItems.$inferSelect;
		qty: number;
	}> = [];

	for (const def of activeDefinitions) {
		let matched = allOrgItems.find((inv) =>
			def.patterns.some((p) => inv.name.toLowerCase().includes(p.toLowerCase())),
		);

		if (!matched) {
			const [created] = await tx
				.insert(inventoryItems)
				.values({
					organizationId,
					name: def.defaultName,
					category: def.category,
					unit: def.unit,
					stockQuantity: "0",
					currentQty: "0",
					criticalThreshold: "10",
					unitCostRub: def.defaultCost,
				})
				.returning();
			if (created) {
				matched = created;
				allOrgItems.push(created);
			}
		}

		if (matched) {
			resolvedItems.push({ item: matched, qty: def.qty });
		}
	}

	const sortedIds = resolvedItems.map((r) => r.item.id).sort();
	const lockedRows = await tx
		.select()
		.from(inventoryItems)
		.where(
			and(
				inArray(inventoryItems.id, sortedIds),
				eq(inventoryItems.organizationId, organizationId),
			),
		)
		.for("update");

	const lockedMap = new Map(lockedRows.map((r) => [r.id, r]));
	const deductedItems: Array<{
		itemId: string;
		itemName: string;
		quantity: number;
		unit: string;
		remainingStock: number;
		isOverdraft: boolean;
	}> = [];
	const warnings: string[] = [];
	const txRows: Array<typeof inventoryTransactions.$inferInsert> = [];

	for (const target of resolvedItems) {
		const inv = lockedMap.get(target.item.id);
		if (!inv) continue;

		const currentStock = Number(inv.stockQuantity ?? inv.currentQty ?? 0);
		const baseStock = Number.isFinite(currentStock) ? currentStock : 0;
		const newStock = Number((baseStock - target.qty).toFixed(4));
		const isOverdraft = newStock < 0;

		await tx
			.update(inventoryItems)
			.set({
				stockQuantity: String(newStock),
				currentQty: String(newStock),
				updatedAt: new Date(),
			})
			.where(
				and(
					eq(inventoryItems.id, inv.id),
					eq(inventoryItems.organizationId, organizationId),
				),
			);

		txRows.push({
			organizationId,
			visitId: visitId ?? null,
			itemId: inv.id,
			inventoryItemId: inv.id,
			quantityChanged: String(-target.qty),
			qty: String(-target.qty),
			unitCostRub: inv.unitCostRub ?? "0",
			transactionType: isOverdraft ? "emergency_overdraft" : "nurse_shift_bundle",
			isOverdraft,
			userId,
			notes: isOverdraft
				? `Списано под операцию, требуется оприходование (расход смены «${bundleNameRu}»: дефицит ${Math.abs(newStock)} ${inv.unit ?? "ед."})`
				: (notes || `Стандартный расход смены «${bundleNameRu}» медсестрой (1 клик, без комиссии)`),
		});

		if (isOverdraft) {
			warnings.push(
				`Позиция «${inv.name}»: списано под операцию, требуется оприходование (остаток: ${newStock} ${inv.unit ?? "ед."}).`,
			);
		}

		deductedItems.push({
			itemId: inv.id,
			itemName: inv.name,
			quantity: target.qty,
			unit: inv.unit ?? "шт.",
			remainingStock: newStock,
			isOverdraft,
		});
	}

	if (txRows.length > 0) {
		await tx.insert(inventoryTransactions).values(txRows);
	}

	const anyOverdraft = deductedItems.some((i) => i.isOverdraft);
	return {
		success: true,
		isOverdraft: anyOverdraft,
		...(anyOverdraft ? { warning: "soft_overdraft" } : {}),
		deductedItems,
		warnings,
		message: `Стандартный расход смены «${bundleNameRu}» успешно списан (${deductedItems.length} позиций без комиссии).`,
	};
}

/**
 * 1-клик списание стандартного набора клинического приёма:
 * - «Терапевтический прием»: карпула анестетика + игла + перчатки + слюноотсос + валики + нагрудник
 * - «Хирургический прием»: карпула анестетика + игла + скальпель + шовный материал + гемостатическая губка
 * Реализует автономию врача и медсестры (Мандат 8e п. 10), исключает созыв комиссий и ручной ввод.
 * Поддерживает мягкий овердрафт при задержке накладных поставщика.
 */
export async function quickWriteoffVisitBundle(
	tx: DbExecutor,
	params: {
		organizationId: string;
		visitType?: "therapy" | "surgery" | "implant" | "sinus_gbr" | undefined;
		userId?: string | null | undefined;
		visitId?: string | null | undefined;
		notes?: string | null | undefined;
	},
): Promise<{
	success: boolean;
	deductedItems: Array<{
		itemId: string;
		itemName: string;
		quantity: number;
		unit: string;
		remainingStock: number;
		isOverdraft: boolean;
	}>;
	warnings: string[];
	message: string;
}> {
	const { organizationId, visitType = "therapy", userId, visitId, notes } = params;

	const visitDefinitions: Record<
		"therapy" | "surgery" | "implant" | "sinus_gbr",
		Array<{
			patterns: string[];
			defaultName: string;
			category: string;
			unit: string;
			qty: number;
			defaultCost: string;
		}>
	> = {
		therapy: [
			{ patterns: ["артикаин", "ультракаин", "убистезин", "анестетик", "anesthetic"], defaultName: "Артикаин 1:100 000 (карпула 1.7 мл)", category: "Анестетики", unit: "карп.", qty: 1, defaultCost: "120.00" },
			{ patterns: ["игла карпульн", "иглы карпульн", "needle"], defaultName: "Иглы карпульные 0.3x21 мм", category: "Расходные материалы", unit: "шт.", qty: 1, defaultCost: "18.00" },
			{ patterns: ["перчатк", "gloves"], defaultName: "Перчатки смотровые нитриловые (пара)", category: "Расходные материалы", unit: "пар", qty: 2, defaultCost: "35.00" },
			{ patterns: ["слюноотсос", "saliva"], defaultName: "Слюноотсосы одноразовые", category: "Расходные материалы", unit: "шт.", qty: 1, defaultCost: "7.00" },
			{ patterns: ["валик", "cotton"], defaultName: "Валики ватные стоматологические", category: "Расходные материалы", unit: "шт.", qty: 6, defaultCost: "1.50" },
			{ patterns: ["нагрудн", "салфетк", "bib"], defaultName: "Салфетки стоматологические нагрудные", category: "Расходные материалы", unit: "шт.", qty: 1, defaultCost: "6.00" },
		],
		surgery: [
			{ patterns: ["артикаин", "ультракаин", "убистезин", "анестетик", "anesthetic"], defaultName: "Артикаин 1:100 000 (карпула 1.7 мл)", category: "Анестетики", unit: "карп.", qty: 1, defaultCost: "120.00" },
			{ patterns: ["игла карпульн", "иглы карпульн", "needle"], defaultName: "Иглы карпульные 0.4x35 мм", category: "Расходные материалы", unit: "шт.", qty: 1, defaultCost: "20.00" },
			{ patterns: ["скальпел", "scalpel"], defaultName: "Скальпель хирургический одноразовый №15", category: "Хирургический инструментарий", unit: "шт.", qty: 1, defaultCost: "65.00" },
			{ patterns: ["шовн", "нить", "suture"], defaultName: "Шовный материал полигликолид 4-0 с иглой", category: "Шовный материал", unit: "шт.", qty: 1, defaultCost: "220.00" },
			{ patterns: ["гемостат", "губк", "альвостаз", "sponge"], defaultName: "Губка гемостатическая коллагеновая", category: "Хирургический инструментарий", unit: "шт.", qty: 1, defaultCost: "85.00" },
		],
		implant: [
			{ patterns: ["имплантат", "implant", "дентальный"], defaultName: "Дентальный имплантат титановый", category: "Имплантология", unit: "шт.", qty: 1, defaultCost: "14000.00" },
			{ patterns: ["формировател", "винт-заглушк", "healing cap"], defaultName: "Формирователь десны / винт-заглушка", category: "Имплантология", unit: "шт.", qty: 1, defaultCost: "2500.00" },
			{ patterns: ["пролен", "prolene", "шовн"], defaultName: "Шовный материал Prolene 4-0", category: "Шовный материал", unit: "шт.", qty: 1, defaultCost: "350.00" },
			{ patterns: ["артикаин", "анестетик"], defaultName: "Артикаин 1:100 000 (карпула 1.7 мл)", category: "Анестетики", unit: "карп.", qty: 2, defaultCost: "120.00" },
			{ patterns: ["физраствор", "0.9% nacl", "натрия хлорид"], defaultName: "Стерильный физиологический раствор 0.9% 500 мл", category: "Хирургический инструментарий", unit: "фл.", qty: 1, defaultCost: "90.00" },
		],
		sinus_gbr: [
			{ patterns: ["костн", "графт", "био-осс", "bio-oss", "ксенографт"], defaultName: "Остеопластический материал ксенографт 0.5 г", category: "Костная пластика", unit: "шт.", qty: 1, defaultCost: "12500.00" },
			{ patterns: ["мембран", "коллаген", "bio-gide", "membrane"], defaultName: "Мембрана коллагеновая барьерная 25x25 мм", category: "Костная пластика", unit: "шт.", qty: 1, defaultCost: "14500.00" },
			{ patterns: ["пины", "пин титановый", "titanium pin"], defaultName: "Пины титановые для фиксации мембран", category: "Костная пластика", unit: "шт.", qty: 2, defaultCost: "1200.00" },
			{ patterns: ["шовн", "пга", "vicryl"], defaultName: "Шовный материал ПГА 4-0 с иглой", category: "Шовный материал", unit: "шт.", qty: 1, defaultCost: "220.00" },
			{ patterns: ["артикаин", "анестетик"], defaultName: "Артикаин 1:100 000 (карпула 1.7 мл)", category: "Анестетики", unit: "карп.", qty: 2, defaultCost: "120.00" },
		],
	};

	const activeDefinitions = visitDefinitions[visitType] || visitDefinitions.therapy;
	const visitNameRu =
		visitType === "surgery"
			? "Хирургический прием"
			: visitType === "implant"
				? "Дентальная имплантация"
				: visitType === "sinus_gbr"
					? "Синус-лифтинг и НКР"
					: "Терапевтический прием";

	const allOrgItems = await tx
		.select()
		.from(inventoryItems)
		.where(eq(inventoryItems.organizationId, organizationId));

	const resolvedItems: Array<{
		item: typeof inventoryItems.$inferSelect;
		qty: number;
	}> = [];

	for (const def of activeDefinitions) {
		let matched = allOrgItems.find((inv) =>
			def.patterns.some((p) => inv.name.toLowerCase().includes(p.toLowerCase())),
		);

		if (!matched) {
			const [created] = await tx
				.insert(inventoryItems)
				.values({
					organizationId,
					name: def.defaultName,
					category: def.category,
					unit: def.unit,
					stockQuantity: "0",
					currentQty: "0",
					criticalThreshold: "10",
					unitCostRub: def.defaultCost,
				})
				.returning();
			if (created) {
				matched = created;
				allOrgItems.push(created);
			}
		}

		if (matched) {
			resolvedItems.push({ item: matched, qty: def.qty });
		}
	}

	const sortedIds = resolvedItems.map((r) => r.item.id).sort();
	const lockedRows = await tx
		.select()
		.from(inventoryItems)
		.where(
			and(
				inArray(inventoryItems.id, sortedIds),
				eq(inventoryItems.organizationId, organizationId),
			),
		)
		.for("update");

	const lockedMap = new Map(lockedRows.map((r) => [r.id, r]));
	const deductedItems: Array<{
		itemId: string;
		itemName: string;
		quantity: number;
		unit: string;
		remainingStock: number;
		isOverdraft: boolean;
	}> = [];
	const warnings: string[] = [];
	const txRows: Array<typeof inventoryTransactions.$inferInsert> = [];

	for (const target of resolvedItems) {
		const inv = lockedMap.get(target.item.id);
		if (!inv) continue;

		const currentStock = Number(inv.stockQuantity ?? inv.currentQty ?? 0);
		const baseStock = Number.isFinite(currentStock) ? currentStock : 0;
		const newStock = Number((baseStock - target.qty).toFixed(4));
		const isOverdraft = newStock < 0;

		await tx
			.update(inventoryItems)
			.set({
				stockQuantity: String(newStock),
				currentQty: String(newStock),
				updatedAt: new Date(),
			})
			.where(
				and(
					eq(inventoryItems.id, inv.id),
					eq(inventoryItems.organizationId, organizationId),
				),
			);

		txRows.push({
			organizationId,
			visitId: visitId ?? null,
			itemId: inv.id,
			inventoryItemId: inv.id,
			quantityChanged: String(-target.qty),
			qty: String(-target.qty),
			unitCostRub: inv.unitCostRub ?? "0",
			transactionType: isOverdraft ? "emergency_overdraft" : "nurse_visit_bundle",
			isOverdraft,
			userId,
			notes: isOverdraft
				? `Списано под операцию, требуется оприходование (набор «${visitNameRu}»: дефицит ${Math.abs(newStock)} ${inv.unit ?? "ед."})`
				: (notes || `1-клик списание набора «${visitNameRu}» (без комиссии)`),
		});

		if (isOverdraft) {
			warnings.push(
				`Позиция «${inv.name}»: списано под операцию, требуется оприходование (остаток: ${newStock} ${inv.unit ?? "ед."}).`,
			);
		}

		deductedItems.push({
			itemId: inv.id,
			itemName: inv.name,
			quantity: target.qty,
			unit: inv.unit ?? "шт.",
			remainingStock: newStock,
			isOverdraft,
		});
	}

	if (txRows.length > 0) {
		await tx.insert(inventoryTransactions).values(txRows);
	}

	return {
		success: true,
		deductedItems,
		warnings,
		message: `Набор «${visitNameRu}» успешно списан (${deductedItems.length} позиций без комиссии).`,
	};
}
