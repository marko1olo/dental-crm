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
 * 1-клик списание пустых карпул анестетиков и карпульных игл медсестрой (СанПиН 3.3686-21, отходы Класса Б, без ПКУ наркотиков).
 * Ликвидирует требование комиссии из 3 человек.
 * Реализует мягкий овердрафт склада без блокировки операций.
 */
export async function quickWriteoffCarpules(
	tx: DbExecutor,
	params: {
		organizationId: string;
		carpulesCount?: number | undefined;
		needlesCount?: number | undefined;
		drugName?: string | undefined;
		needleName?: string | undefined;
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
		needlesCount,
		drugName,
		needleName,
		userId = null,
		visitId = null,
		notes = null,
	} = params;

	const count = Math.max(1, Math.min(20, carpulesCount));
	const needleQty =
		needlesCount !== undefined
			? Math.max(0, needlesCount)
			: Math.max(1, Math.ceil(count / 2));

	// 1. Получаем существующую номенклатуру организации
	const allOrgItems = await tx
		.select()
		.from(inventoryItems)
		.where(eq(inventoryItems.organizationId, organizationId));

	// Анестетик
	let matchedDrug = drugName
		? allOrgItems.find((i) => i.name.toLowerCase().includes(drugName.toLowerCase()))
		: undefined;

	if (!matchedDrug) {
		const searchWords = [
			"артикаин",
			"анестетик",
			"убистезин",
			"септонест",
			"скандонест",
			"ультракаин",
			"карпул",
		];
		matchedDrug = allOrgItems.find((i) =>
			searchWords.some((w) => i.name.toLowerCase().includes(w)),
		);
	}

	if (!matchedDrug) {
		const [createdDrug] = await tx
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
		matchedDrug = createdDrug;
		if (createdDrug) allOrgItems.push(createdDrug);
	}

	if (!matchedDrug) {
		throw new TreatmentConsumablesServiceError(
			"Не удалось определить позицию анестетика на складе",
			500,
			"CarpuleItemNotFound",
		);
	}

	// Иглы карпульные (G27/G30)
	let matchedNeedle: typeof inventoryItems.$inferSelect | undefined;
	if (needleQty > 0) {
		matchedNeedle = needleName
			? allOrgItems.find((i) => i.name.toLowerCase().includes(needleName.toLowerCase()))
			: undefined;

		if (!matchedNeedle) {
			const needleWords = ["игл", "needle", "g30", "g27"];
			matchedNeedle = allOrgItems.find((i) =>
				needleWords.some((w) => i.name.toLowerCase().includes(w)),
			);
		}

		if (!matchedNeedle) {
			const [createdNeedle] = await tx
				.insert(inventoryItems)
				.values({
					organizationId,
					name: "Иглы карпульные стоматологические стерильные (0.3x21 мм G30 / 0.4x35 мм G27)",
					category: "consumables",
					unit: "шт.",
					stockQuantity: "0",
					currentQty: "0",
					criticalThreshold: "50",
					unitCostRub: "25",
				})
				.returning();
			matchedNeedle = createdNeedle;
			if (createdNeedle) allOrgItems.push(createdNeedle);
		}
	}

	// 2. Блокируем строки FOR UPDATE в детерминированном порядке ID (deadlock-free)
	const itemsToDeduct: Array<{
		item: typeof inventoryItems.$inferSelect;
		qty: number;
		type: string;
		label: string;
	}> = [
		{
			item: matchedDrug,
			qty: count,
			type: "carpule_disposal",
			label: "карпул анестетика",
		},
	];
	if (matchedNeedle && needleQty > 0) {
		itemsToDeduct.push({
			item: matchedNeedle,
			qty: needleQty,
			type: "needle_disposal",
			label: "карпульных игл",
		});
	}

	const sortedIds = itemsToDeduct.map((it) => it.item.id).sort();
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
	let hasAnyOverdraft = false;

	for (const { item, qty, type, label } of itemsToDeduct) {
		const locked = lockedMap.get(item.id) ?? item;
		const currentStock = Number(locked.stockQuantity ?? locked.currentQty ?? 0);
		const baseStock = Number.isFinite(currentStock) ? currentStock : 0;
		const newStock = Number((baseStock - qty).toFixed(4));
		const isOverdraft = newStock < 0;
		if (isOverdraft) hasAnyOverdraft = true;

		await tx
			.update(inventoryItems)
			.set({
				stockQuantity: String(newStock),
				currentQty: String(newStock),
				updatedAt: new Date(),
			})
			.where(
				and(
					eq(inventoryItems.id, locked.id),
					eq(inventoryItems.organizationId, organizationId),
				),
			);

		txRows.push({
			organizationId,
			visitId,
			itemId: locked.id,
			inventoryItemId: locked.id,
			quantityChanged: String(-qty),
			qty: String(-qty),
			unitCostRub: locked.unitCostRub ?? "0",
			transactionType: isOverdraft ? "emergency_overdraft" : type,
			isOverdraft,
			userId,
			notes: isOverdraft
				? `Списано под операцию, требуется оприходование (списание ${label} в 1 клик, без комиссии: дефицит ${Math.abs(newStock)} ${locked.unit ?? "ед."})`
				: (notes ||
					`Списание ${label} медсестрой в 1 клик (СанПиН 3.3686-21 Класс Б, без комиссии из 3 человек)`),
		});

		if (isOverdraft) {
			warnings.push(
				`Внимание: списание в дефицит по «${locked.name}» (остаток: ${newStock} ${locked.unit ?? "ед."}). Списано под операцию, требуется оприходование.`,
			);
		}

		deductedItems.push({
			itemId: locked.id,
			itemName: locked.name,
			quantity: qty,
			unit: locked.unit ?? "ед.",
			remainingStock: newStock,
			isOverdraft,
		});
	}

	if (txRows.length > 0) {
		await tx.insert(inventoryTransactions).values(txRows);
	}

	const message =
		needleQty > 0
			? `Списано пустых карпул анестетика: ${count} шт., карпульных игл: ${needleQty} шт. (СанПиН 3.3686-21 Класс Б, без комиссии из 3 человек).`
			: `Списано пустых карпул анестетика: ${count} шт. (СанПиН 3.3686-21 Класс Б, без комиссии из 3 человек).`;

	return {
		success: true,
		isOverdraft: hasAnyOverdraft,
		...(hasAnyOverdraft ? { warning: "soft_overdraft" } : {}),
		deductedItems,
		warnings,
		message,
	};
}

/**
 * 1-клик списание набора расходников стерилизации лотков/инструментов ЦСО:
 * крафт-пакет (1 шт.), индикатор 5 класса (1 шт.), перчатки (2 пары), дезсалфетка (1 шт.) на каждый лоток.
 * Реализует мягкий овердрафт склада без блокировки работы ЦСО (Мандаты 8e и 8n).
 */
export async function quickWriteoffSterilizationKit(
	tx: DbExecutor,
	params: {
		organizationId: string;
		count?: number | undefined;
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
	const { organizationId, count = 1, userId = null, visitId = null, notes = null } = params;
	const kitMultiplier = Math.max(1, Math.min(100, count));

	const kitDefinitions = [
		{
			patterns: ["крафт-пакет", "крафт пакет", "пакет для стерилизации", "pouch", "kraft"],
			defaultName: "Крафт-пакеты самоклеящиеся 100х200 мм",
			category: "consumable",
			unit: "шт.",
			qty: 1 * kitMultiplier,
			defaultCost: "12",
		},
		{
			patterns: ["индикатор 5", "индикатор стерилизации", "медис", "интест", "индикатор"],
			defaultName: "Индикаторы стерилизации 5 класс (Винар МедИС / ИнТест)",
			category: "consumable",
			unit: "шт.",
			qty: 1 * kitMultiplier,
			defaultCost: "8",
		},
		{
			patterns: ["перчатк", "gloves"],
			defaultName: "Перчатки нитриловые смотровые (пара)",
			category: "ppe",
			unit: "пары",
			qty: 2 * kitMultiplier,
			defaultCost: "35",
		},
		{
			patterns: ["салфетка дезинфицирующая", "салфетки дезинфицирующие", "дез салфетк", "аламинол", "дезинфекц"],
			defaultName: "Салфетки дезинфицирующие спиртовые для поверхностей",
			category: "consumable",
			unit: "шт.",
			qty: 1 * kitMultiplier,
			defaultCost: "6",
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

		// Если позиция отсутствует, мгновенно создаем (Zero-friction / Zero Dead-Ends)
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
	let hasAnyOverdraft = false;

	for (const target of resolvedItems) {
		const inv = lockedMap.get(target.item.id);
		if (!inv) continue;

		const currentStock = Number(inv.stockQuantity ?? inv.currentQty ?? 0);
		const baseStock = Number.isFinite(currentStock) ? currentStock : 0;
		const newStock = Number((baseStock - target.qty).toFixed(4));
		const isOverdraft = newStock < 0;
		if (isOverdraft) hasAnyOverdraft = true;

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
			transactionType: isOverdraft ? "emergency_overdraft" : "sterilization_kit_writeoff",
			isOverdraft,
			userId,
			notes: isOverdraft
				? `Списано под операцию, требуется оприходование (набор стерилизации ЦСО x${kitMultiplier}: дефицит ${Math.abs(newStock)} ${inv.unit ?? "ед."})`
				: (notes || `Списание комплекта стерилизации ЦСО (лотков: ${kitMultiplier} шт.)`),
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
		isOverdraft: hasAnyOverdraft,
		...(hasAnyOverdraft ? { warning: "soft_overdraft" } : {}),
		deductedItems,
		warnings,
		message: `Комплект стерилизации ЦСО списан (обработано лотков/наборов: ${kitMultiplier} шт.).`,
	};
}
