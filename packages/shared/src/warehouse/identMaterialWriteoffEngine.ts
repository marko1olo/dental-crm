/**
 * identMaterialWriteoffEngine.ts — 2-Level Material Write-off Architecture (IDENT Model).
 *
 * ДВУХУРОВНЕВАЯ МОДЕЛЬ СПИСАНИЯ МАТЕРИАЛОВ IDENT:
 * 1. Уровень 1 («Дешевые / общеклинические материалы» — cheap_overhead):
 *    Перчатки, маски, салфетки, слюноотсосы, спирт, крафт-пакеты.
 *    Списываются автоматически в производство при внутреннем перемещении со склада в процедурный кабинет (М-11).
 *    Врач у кресла НЕ тратит ни одной секунды на их учет, они не загромождают чекаут (Мандат 8e/8n).
 *
 * 2. Уровень 2 («Дорогостоящие клинические материалы» — expensive_clinical):
 *    Имплантаты, формирователи десны, мембраны, костные графты, ортодонтические дуги, светоотверждаемые нанокомпозиты.
 *    Списываются строго в момент выставления счета пациенту по нормам с поддержкой:
 *    - Флаг ВН (Возможность не использовать — canOmit): врач может исключить позицию из чека в 1 клик.
 *    - Флаг ВИ (Возможность изменения расхода — canAdjustQuantity): врач может указать точное количество (например, 2 дозы вместо 1).
 *
 * Расчеты ведутся строго в целочисленных копейках (Kopecks).
 * Мягкий овердрафт (allowOverdraft = true) по умолчанию защищает прием от блокировок.
 * Полное отсутствие эмодзи (Мандат 8d).
 */

import { z } from "zod";
import type { Kopecks } from "../money.js";
import { formatKopecksRu } from "../money.js";

// ─── 1. ZOD SCHEMAS & TYPES ───────────────────────────────────────────────────

export const materialWriteoffTierSchema = z.enum(["cheap_overhead", "expensive_clinical"]);
export type MaterialWriteoffTier = z.infer<typeof materialWriteoffTierSchema>;

export const identConsumableNormSchema = z.object({
	inventoryItemId: z.string().min(1, "ID позиции обязателен"),
	itemName: z.string().min(1, "Наименование обязательно"),
	tier: materialWriteoffTierSchema,
	defaultQuantity: z.number().positive("Норма расхода должна быть больше 0"),
	unit: z.string().min(1, "Единица измерения обязательна"),
	costPriceKopecks: z.number().int().nonnegative("Себестоимость должна быть неотрицательной"),

	/** Флаг ВН (Возможность Не использовать): разрешает врачу исключить материал */
	canOmit: z.boolean().default(false),

	/** Флаг ВИ (Возможность Изменения расхода): разрешает врачу скорректировать объем */
	canAdjustQuantity: z.boolean().default(false),

	/** Признак исключения врачом при приеме (актуален при canOmit = true) */
	isOmitted: z.boolean().optional(),

	/** Скорректированное фактическое количество (актуально при canAdjustQuantity = true) */
	actualQuantity: z.number().positive().optional(),
});
export type IdentConsumableNorm = z.infer<typeof identConsumableNormSchema>;

export interface IdentMaterialDeductionLine {
	readonly inventoryItemId: string;
	readonly itemName: string;
	readonly tier: MaterialWriteoffTier;
	readonly unit: string;
	readonly quantity: number;
	readonly unitCostKopecks: Kopecks;
	readonly totalCostKopecks: Kopecks;
	readonly currentStock: number;
	readonly resultingStock: number;
	readonly isOverdraft: boolean;
	readonly isOmitted: boolean;
	readonly wasAdjusted: boolean;
}

export interface IdentMaterialWriteoffResult {
	readonly visitId: string;
	readonly treatmentServiceId: string;
	readonly treatmentServiceTitle: string;
	/** Дешевые материалы (списаны в фоновые общеклинические расходы М-11) */
	readonly overheadItems: readonly IdentMaterialDeductionLine[];
	readonly overheadTotalCostKopecks: Kopecks;
	/** Дорогостоящие материалы (списаны под конкретную процедуру пациента) */
	readonly clinicalItems: readonly IdentMaterialDeductionLine[];
	readonly clinicalTotalCostKopecks: Kopecks;
	/** Итого прямых расходов материалов на процедуру для уменьшения базы ЗП врача (ст. 129 ТК РФ) */
	readonly totalDoctorDeductibleCostKopecks: Kopecks;
	readonly hasOverdraft: boolean;
	readonly timestampIso: string;
}

// ─── 2. CORE PROCESSING LOGIC ─────────────────────────────────────────────────

export interface ProcessIdentWriteoffParams {
	readonly visitId: string;
	readonly treatmentServiceId: string;
	readonly treatmentServiceTitle: string;
	readonly norms: readonly IdentConsumableNorm[];
	readonly currentStocks: Record<string, number>;
	readonly allowOverdraft?: boolean;
	readonly timestampIso?: string;
}

/**
 * Выполняет 2-уровневое списание материалов по каноническому стандарту IDENT.
 */
export function processIdentMaterialWriteoff(params: ProcessIdentWriteoffParams): IdentMaterialWriteoffResult {
	const {
		visitId,
		treatmentServiceId,
		treatmentServiceTitle,
		norms,
		currentStocks,
		allowOverdraft = true,
		timestampIso = new Date().toISOString(),
	} = params;

	const overheadItems: IdentMaterialDeductionLine[] = [];
	const clinicalItems: IdentMaterialDeductionLine[] = [];

	let overheadTotalCostKopecks = 0 as Kopecks;
	let clinicalTotalCostKopecks = 0 as Kopecks;
	let hasOverdraft = false;

	const runningStocks: Record<string, number> = { ...currentStocks };

	for (const norm of norms) {
		// Если материал дешевый/общеклинический — он всегда относится к фоновому списанию кабинета
		if (norm.tier === "cheap_overhead") {
			const qty = norm.defaultQuantity;
			const curStock = runningStocks[norm.inventoryItemId] ?? 0;
			const resStock = curStock - qty;
			const isOverdraft = resStock < 0;

			if (isOverdraft && !allowOverdraft) {
				throw new Error(
					`Складской отказ: недостаточно общеклинического материала "${norm.itemName}". В наличии: ${curStock}, требуется: ${qty}`,
				);
			}

			if (isOverdraft) hasOverdraft = true;
			runningStocks[norm.inventoryItemId] = resStock;

			const totalCost = Math.round(norm.costPriceKopecks * qty) as Kopecks;
			overheadTotalCostKopecks = (overheadTotalCostKopecks + totalCost) as Kopecks;

			overheadItems.push({
				inventoryItemId: norm.inventoryItemId,
				itemName: norm.itemName,
				tier: "cheap_overhead",
				unit: norm.unit,
				quantity: qty,
				unitCostKopecks: norm.costPriceKopecks as Kopecks,
				totalCostKopecks: totalCost,
				currentStock: curStock,
				resultingStock: resStock,
				isOverdraft,
				isOmitted: false,
				wasAdjusted: false,
			});
			continue;
		}

		// Дорогостоящий клинический материал (штучный учет)
		// Проверка флага ВН (Возможность Не использовать)
		const isOmitted = Boolean(norm.canOmit && norm.isOmitted);
		if (isOmitted) {
			clinicalItems.push({
				inventoryItemId: norm.inventoryItemId,
				itemName: norm.itemName,
				tier: "expensive_clinical",
				unit: norm.unit,
				quantity: 0,
				unitCostKopecks: norm.costPriceKopecks as Kopecks,
				totalCostKopecks: 0 as Kopecks,
				currentStock: runningStocks[norm.inventoryItemId] ?? 0,
				resultingStock: runningStocks[norm.inventoryItemId] ?? 0,
				isOverdraft: false,
				isOmitted: true,
				wasAdjusted: false,
			});
			continue;
		}

		// Проверка флага ВИ (Возможность Изменения расхода)
		let qty = norm.defaultQuantity;
		let wasAdjusted = false;
		if (norm.canAdjustQuantity && norm.actualQuantity !== undefined && norm.actualQuantity > 0) {
			qty = norm.actualQuantity;
			wasAdjusted = qty !== norm.defaultQuantity;
		}

		const curStock = runningStocks[norm.inventoryItemId] ?? 0;
		const resStock = curStock - qty;
		const isOverdraft = resStock < 0;

		if (isOverdraft && !allowOverdraft) {
			throw new Error(
				`Складской отказ: недостаточно клинического материала "${norm.itemName}". В наличии: ${curStock}, требуется: ${qty}`,
			);
		}

		if (isOverdraft) hasOverdraft = true;
		runningStocks[norm.inventoryItemId] = resStock;

		const totalCost = Math.round(norm.costPriceKopecks * qty) as Kopecks;
		clinicalTotalCostKopecks = (clinicalTotalCostKopecks + totalCost) as Kopecks;

		clinicalItems.push({
			inventoryItemId: norm.inventoryItemId,
			itemName: norm.itemName,
			tier: "expensive_clinical",
			unit: norm.unit,
			quantity: qty,
			unitCostKopecks: norm.costPriceKopecks as Kopecks,
			totalCostKopecks: totalCost,
			currentStock: curStock,
			resultingStock: resStock,
			isOverdraft,
			isOmitted: false,
			wasAdjusted,
		});
	}

	return {
		visitId,
		treatmentServiceId,
		treatmentServiceTitle,
		overheadItems,
		overheadTotalCostKopecks,
		clinicalItems,
		clinicalTotalCostKopecks,
		// Для ЗП врача вычитается только клиническая себестоимость (дорогостоящие позиции)
		totalDoctorDeductibleCostKopecks: clinicalTotalCostKopecks,
		hasOverdraft,
		timestampIso,
	};
}

/**
 * Генерирует официальный акт списания 2-уровневых материалов (Мандат 8d: ноль эмодзи).
 */
export function formatIdentMaterialWriteoffAct(
	result: IdentMaterialWriteoffResult,
	doctorName: string = "Не указан",
	patientName: string = "Не указан",
): string {
	const headerSep = "=".repeat(78);
	const lineSep = "-".repeat(78);

	const lines: string[] = [
		headerSep,
		"АКТ 2-УРОВНЕВОГО СПИСАНИЯ МАТЕРИАЛОВ (СТАНДАРТ IDENT)",
		"Стоматологическая клиника DENTE",
		headerSep,
		`Визит / Прием:          ${result.visitId}`,
		`Услуга:                 ${result.treatmentServiceTitle} (ID: ${result.treatmentServiceId})`,
		`Лечащий врач:           ${doctorName}`,
		`Пациент:                ${patientName}`,
		`Дата списания:          ${new Date(result.timestampIso).toLocaleString("ru-RU")}`,
		`Состояние склада:       ${result.hasOverdraft ? "ВНИМАНИЕ: Отрицательный остаток (мягкий овердрафт)" : "Норма"}`,
		lineSep,
		"1. ДОРОГОСТОЯЩИЕ КЛИНИЧЕСКИЕ МАТЕРИАЛЫ (УЧЕТ В ЧЕКЕ / ВЫЧЕТ ИЗ ЗП ВРАЧА):",
	];

	if (result.clinicalItems.length === 0) {
		lines.push("   (Дорогостоящие материалы по регламенту отсутствуют)");
	} else {
		for (const item of result.clinicalItems) {
			if (item.isOmitted) {
				lines.push(`   - ${item.itemName}: [НЕ ИСПОЛЬЗОВАН ВРАЧОМ / ФЛАГ ВН] (0 ${item.unit})`);
			} else {
				const adjNote = item.wasAdjusted ? " [СКОРРЕКТИРОВАН ВРАЧОМ / ФЛАГ ВИ]" : "";
				lines.push(
					`   - ${item.itemName}: ${item.quantity} ${item.unit} x ${formatKopecksRu(item.unitCostKopecks)} = ${formatKopecksRu(item.totalCostKopecks)}${adjNote}`,
				);
			}
		}
		lines.push(`   Итого клинических материалов: ${formatKopecksRu(result.clinicalTotalCostKopecks)}`);
	}

	lines.push(lineSep);
	lines.push("2. ОБЩЕКЛИНИЧЕСКИЕ НАКЛАДНЫЕ МАТЕРИАЛЫ (ПОКРЫВАЮТСЯ КЛИНИКОЙ М-11):");

	if (result.overheadItems.length === 0) {
		lines.push("   (Общеклинические материалы не списывались)");
	} else {
		for (const item of result.overheadItems) {
			lines.push(
				`   - ${item.itemName}: ${item.quantity} ${item.unit} x ${formatKopecksRu(item.unitCostKopecks)} = ${formatKopecksRu(item.totalCostKopecks)}`,
			);
		}
		lines.push(`   Итого общеклинических расходов клиники: ${formatKopecksRu(result.overheadTotalCostKopecks)}`);
	}

	lines.push(headerSep);
	lines.push(`КЛИНИЧЕСКИЕ РАСХОДЫ ДЛЯ ФОРМУЛЫ ЗП ВРАЧА: ${formatKopecksRu(result.totalDoctorDeductibleCostKopecks)}`);
	lines.push(headerSep);
	lines.push("Подпись материально ответственного лица: ______________ / Старшая медсестра");
	lines.push("Подпись лечащего врача:                 ______________ / Врач-стоматолог");

	return lines.join("\n");
}
