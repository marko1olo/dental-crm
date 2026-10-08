/**
 * quickWriteoffService.ts — Layer 2: 1-click nurse quick write-offs for standard kits and carpules.
 * Complies with SanPiN 3.3686-21 (Class B waste, zero-commission), soft overdraft.
 */

import { and, eq, inArray } from "drizzle-orm";
import {
	inventoryItems,
	inventoryTransactions,
} from "../../db/schema.js";
import {
	type DbExecutor,
	TreatmentConsumablesServiceError,
} from "./types.js";

/**
 * 1-клик быстрое списание базового набора приёма медсестрой/ассистентом:
 * перчатки (2 пары), маска (2 шт.), слюноотсос (1 шт.), нагрудник (1 шт.), валики (6 шт.).
 * Реализует мягкий овердрафт склада без комиссии из 3 человек.
 */
export async function quickWriteoffStandardKit(
	tx: DbExecutor,
	params: {
		organizationId: string;
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
	const { organizationId, userId = null, visitId = null, notes = null } = params;

	const kitDefinitions = [
		{
			patterns: ["перчатк", "gloves"],
			defaultName: "Перчатки нитриловые неопудренные (пара)",
			category: "ppe",
			unit: "пары",
			qty: 2,
			defaultCost: "35",
		},
		{
			patterns: ["маск", "mask"],
			defaultName: "Маска медицинская защитная трехслойная",
			category: "ppe",
			unit: "шт.",
			qty: 2,
			defaultCost: "15",
		},
		{
			patterns: ["слюноотсос", "saliva"],
			defaultName: "Слюноотсос одноразовый с гибким наконечником",
			category: "ppe",
			unit: "шт.",
			qty: 1,
			defaultCost: "12.5",
		},
		{
			patterns: ["нагрудник", "салфетка нагрудная", "салфетка под шею", "bib"],
			defaultName: "Нагрудник стоматологический (салфетка двухслойная)",
			category: "ppe",
			unit: "шт.",
			qty: 1,
			defaultCost: "18",
		},
		{
			patterns: ["валик", "ватные валики", "cotton"],
			defaultName: "Валики ватные стоматологические стерильные",
			category: "ppe",
			unit: "шт.",
			qty: 6,
			defaultCost: "3.5",
		},
	];

	// 1. Получаем существующую номенклатуру организации
	const allOrgItems = await tx
		.select()
		.from(inventoryItems)
		.where(eq(inventoryItems.organizationId, organizationId));

	const resolvedItems: Array<{
		item: typeof inventoryItems.$inferSelect;
		qty: number;
	}> = [];

	for (const def of kitDefinitions) {
		let matched = allOrgItems.find((inv) =>
			def.patterns.some((p) => inv.name.toLowerCase().includes(p.toLowerCase())),
		);

		// Если позиция отсутствует, мгновенно создаем (Zero-friction)
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

	// 2. Блокируем строки FOR UPDATE в сортированном порядке ID (deadlock-free)
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
			visitId,
			itemId: inv.id,
			inventoryItemId: inv.id,
			quantityChanged: String(-target.qty),
			qty: String(-target.qty),
			unitCostRub: inv.unitCostRub ?? "0",
			transactionType: isOverdraft ? "emergency_overdraft" : "nurse_quick_writeoff",
			isOverdraft,
			userId,
			notes: isOverdraft
				? `Списано под операцию, требуется оприходование (базовый набор приёма: дефицит ${Math.abs(newStock)} ${inv.unit ?? "ед."})`
				: (notes || "Списание базового набора приёма медсестрой (1 клик)"),
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
		message: "Базовый набор приёма списан (перчатки 2 пары, маска 2 шт., слюноотсос 1 шт., нагрудник 1 шт., валики 6 шт.).",
	};
}

/**
 * 1-клик списание пустых карпул анестетиков медсестрой (СанПиН 3.3686-21, отходы Класса Б, без ПКУ наркотиков).
 * Ликвидирует требование комиссии из 3 человек.
 * Реализует мягкий овердрафт склада без блокировки операций.
 */
export async function quickWriteoffCarpules(
	tx: DbExecutor,
	params: {
		organizationId: string;
		carpulesCount?: number | undefined;
		drugName?: string | undefined;
		userId?: string | null | undefined;
		visitId?: string | null | undefined;
		notes?: string | null | undefined;
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
	const {
		organizationId,
		carpulesCount = 1,
		drugName,
		userId = null,
		visitId = null,
		notes = null,
	} = params;

	const count = Math.max(1, Math.min(20, carpulesCount));

	// 1. Ищем позицию анестетика на складе
	const allOrgItems = await tx
		.select()
		.from(inventoryItems)
		.where(eq(inventoryItems.organizationId, organizationId));

	let matched = drugName
		? allOrgItems.find((i) => i.name.toLowerCase().includes(drugName.toLowerCase()))
		: undefined;

	if (!matched) {
		const searchWords = [
			"артикаин",
			"анестетик",
			"убистезин",
			"септонест",
			"скандонест",
			"ультракаин",
			"карпул",
		];
		matched = allOrgItems.find((i) =>
			searchWords.some((w) => i.name.toLowerCase().includes(w)),
		);
	}

	if (!matched) {
		const [created] = await tx
			.insert(inventoryItems)
			.values({
				organizationId,
				name: "Анестетик артикаиновый 4% (карпула 1.7 мл)",
				category: "anesthesia",
				unit: "карп.",
				stockQuantity: "0",
				currentQty: "0",
				criticalThreshold: "20",
				unitCostRub: "220",
			})
			.returning();
		matched = created;
	}

	if (!matched) {
		throw new TreatmentConsumablesServiceError(
			"Не удалось определить позицию анестетика на складе",
			500,
			"CarpuleItemNotFound",
		);
	}

	// 2. Блокируем строку FOR UPDATE
	const [locked] = await tx
		.select()
		.from(inventoryItems)
		.where(
			and(
				eq(inventoryItems.id, matched.id),
				eq(inventoryItems.organizationId, organizationId),
			),
		)
		.for("update");

	const currentStock = Number(locked?.stockQuantity ?? locked?.currentQty ?? 0);
	const baseStock = Number.isFinite(currentStock) ? currentStock : 0;
	const newStock = Number((baseStock - count).toFixed(4));
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
				eq(inventoryItems.id, matched.id),
				eq(inventoryItems.organizationId, organizationId),
			),
		);

	await tx.insert(inventoryTransactions).values({
		organizationId,
		visitId,
		itemId: matched.id,
		inventoryItemId: matched.id,
		quantityChanged: String(-count),
		qty: String(-count),
		unitCostRub: matched.unitCostRub ?? "0",
		transactionType: isOverdraft ? "emergency_overdraft" : "carpule_disposal",
		isOverdraft,
		userId,
		notes: isOverdraft
			? `Списано под операцию, требуется оприходование (списание пустых карпул анестетика медсестрой в 1 клик, без комиссии: дефицит ${Math.abs(newStock)} карп.)`
			: (notes || "Списание пустых карпул анестетика медсестрой в 1 клик (СанПиН 3.3686-21 Класс Б, без комиссии из 3 человек)"),
	});

	const warnings: string[] = [];
	if (isOverdraft) {
		warnings.push(
			`Внимание: списание пустых карпул в дефицит по «${matched.name}» (остаток: ${newStock} карп.). Списано под операцию, требуется оприходование.`,
		);
	}

	return {
		success: true,
		isOverdraft,
		...(isOverdraft ? { warning: "soft_overdraft" } : {}),
		deductedItems: [
			{
				itemId: matched.id,
				itemName: matched.name,
				quantity: count,
				unit: matched.unit ?? "карп.",
				remainingStock: newStock,
				isOverdraft,
			},
		],
		warnings,
		message: `Списано пустых карпул анестетика: ${count} шт. (СанПиН 3.3686-21 Класс Б, без комиссии из 3 человек).`,
	};
}
