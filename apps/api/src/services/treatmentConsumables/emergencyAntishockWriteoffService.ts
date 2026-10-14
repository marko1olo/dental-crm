/**
 * emergencyAntishockWriteoffService.ts — Layer 2: 1-Click statutory Antishock kit write-off (Order 786n / Mandate 8e).
 * Guarantees zero blocking of doctors or nurses, soft overdraft support, and real inventory transaction recording.
 */

import { and, eq, inArray } from "drizzle-orm";
import { inventoryItems, inventoryTransactions } from "../../db/schema.js";
import type { DbExecutor } from "./types.js";

export interface StatutoryAntishockKitWriteoffParams {
	organizationId: string;
	userId?: string | null;
	visitId?: string | null;
	scenarioId?: string | null;
	notes?: string | null;
}

export interface StatutoryAntishockKitWriteoffResult {
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
}

const STATUTORY_ANTISHOCK_DEFINITIONS = [
	{
		patterns: ["адреналин", "эпинефрин", "adrenaline", "epinephrine"],
		defaultName: "Адреналин 0.1% (Эпинефрин) 1 мг/мл",
		category: "Неотложная помощь",
		unit: "амп.",
		qty: 2,
		defaultCost: "95.00",
	},
	{
		patterns: ["преднизолон", "prednisolone"],
		defaultName: "Преднизолон 30 мг/мл (ампулы 1 мл)",
		category: "Неотложная помощь",
		unit: "амп.",
		qty: 3,
		defaultCost: "140.00",
	},
	{
		patterns: ["супрастин", "хлоропирамин", "suprastin"],
		defaultName: "Супрастин 2% (20 мг/мл, 1 мл)",
		category: "Неотложная помощь",
		unit: "амп.",
		qty: 2,
		defaultCost: "80.00",
	},
	{
		patterns: ["физраствор", "0.9% nacl", "натрия хлорид"],
		defaultName: "Натрия хлорид 0.9% 500 мл (физраствор)",
		category: "Неотложная помощь",
		unit: "фл.",
		qty: 1,
		defaultCost: "90.00",
	},
	{
		patterns: ["шприц", "syringe"],
		defaultName: "Шприцы стерильные одноразовые 2 мл / 5 мл",
		category: "Расходные материалы",
		unit: "шт.",
		qty: 4,
		defaultCost: "15.00",
	},
	{
		patterns: ["перчатк", "gloves"],
		defaultName: "Перчатки смотровые нитриловые (пара)",
		category: "Расходные материалы",
		unit: "пар",
		qty: 2,
		defaultCost: "35.00",
	},
	{
		patterns: ["салфетк", "спиртов", "alcohol wipe"],
		defaultName: "Салфетки спиртовые инъекционные",
		category: "Расходные материалы",
		unit: "шт.",
		qty: 6,
		defaultCost: "5.00",
	},
];

/**
 * 1-клик списание укладки «Антишок» / реанимационного набора по Приказу Минздрава РФ № 786н.
 * Включает мягкий овердрафт: не блокирует проведение реанимации при нехватке позиций в базе.
 */
export async function quickWriteoffEmergencyAntishock(
	tx: DbExecutor,
	params: StatutoryAntishockKitWriteoffParams,
): Promise<StatutoryAntishockKitWriteoffResult> {
	const { organizationId, userId, visitId, scenarioId, notes } = params;

	const allOrgItems = await tx
		.select()
		.from(inventoryItems)
		.where(eq(inventoryItems.organizationId, organizationId));

	const resolvedItems: Array<{
		item: typeof inventoryItems.$inferSelect;
		qty: number;
	}> = [];

	for (const def of STATUTORY_ANTISHOCK_DEFINITIONS) {
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
					criticalThreshold: "5",
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

		if (isOverdraft) {
			warnings.push(
				`Позиция "${inv.name}" ушла в мягкий овердрафт (остаток: ${newStock} ${inv.unit}). Реанимация не заблокирована.`,
			);
		}

		deductedItems.push({
			itemId: inv.id,
			itemName: inv.name,
			quantity: target.qty,
			unit: inv.unit,
			remainingStock: newStock,
			isOverdraft,
		});

		txRows.push({
			organizationId,
			visitId: visitId ?? null,
			itemId: inv.id,
			inventoryItemId: inv.id,
			quantityChanged: String(-target.qty),
			qty: String(-target.qty),
			unitCostRub: inv.unitCostRub ?? "0",
			transactionType: isOverdraft ? "emergency_overdraft" : "emergency_antishock",
			isOverdraft,
			userId: userId ?? null,
			notes: isOverdraft
				? `Мягкий овердрафт при реанимации «Антишок» (дефицит ${Math.abs(newStock)} ${inv.unit ?? "ед."})`
				: (notes ?? `Экстренное списание укладки «Антишок» (Приказ 786н, сценарий: ${scenarioId ?? "неотложная помощь"})`),
		});
	}

	if (txRows.length > 0) {
		await tx.insert(inventoryTransactions).values(txRows);
	}

	return {
		success: true,
		deductedItems,
		warnings,
		message: `Укладка экстренной помощи «Антишок» успешно списана (${deductedItems.length} поз.) по Приказу 786н`,
	};
}
