import { formatQuantityRu, calculateServiceConsumables, toConsumableItemLink, toTreatmentConsumableLink } from "./consumableLinkManager.js";
import { processConsumablesStockDeduction } from "./consumableSoftOverdraft.js";
import { executeBatchConsumablesDeduction } from "./consumableAutoDeduction.js";
import { CLASS_B_WEIGHT_ESTIMATES, calculateClassBWasteWeightKg } from "./consumableClassBWaste.js";
import {
	consumableCategorySchema, consumableUnitSchema, consumableItemLinkSchema, renderedServiceItemSchema,
	consumableDeductionRequestSchema, consumableDeductedItemSchema, consumableDeductionResultSchema,
	CONSUMABLE_CATEGORY_LABELS, CONSUMABLE_UNIT_LABELS,
	type TreatmentDeductionResult, type ConsumableDeductionResult,
} from "./consumableTypes.js";

const formatDateTimeRu = (s: string) => {
	const d = new Date(s);
	if (Number.isNaN(d.getTime())) return s;
	const p = (n: number) => String(n).padStart(2, "0");
	return `${p(d.getDate())}.${p(d.getMonth() + 1)}.${d.getFullYear()} ${p(d.getHours())}:${p(d.getMinutes())}`;
};

export function formatConsumablesDeductionReceipt(
	result: TreatmentDeductionResult, doctorName?: string, patientName?: string,
): string {
	const hSep = "=".repeat(78);
	const sSep = "-".repeat(78);
	const overdraftLabel = result.hasOverdraft
		? "ВНИМАНИЕ: Зафиксирован отрицательный остаток (мягкий овердрафт склада)"
		: "В пределах складского остатка (норма)";
	const items = result.items.length === 0
		? ["  (Расходные материалы не привязаны к данной услуге. Списание не производилось)"]
		: result.items.flatMap((item, idx) => [
				`${String(idx + 1).padStart(2, " ")}. ${item.inventoryItemName}`,
				`    ID позиции: ${item.inventoryItemId} | Списано: ${formatQuantityRu(item.deductedQuantity, item.unit)} | До списания: ${formatQuantityRu(item.currentStock, item.unit)} | После списания: ${formatQuantityRu(item.resultingStock, item.unit)} | Статус: ${item.isOverdraft ? "[ОВЕРДРАФТ]" : "[НОРМА]"}`,
			]);

	return [
		hSep, "АКТ АВТОМАТИЧЕСКОГО СПИСАНИЯ РАСХОДНЫХ МАТЕРИАЛОВ",
		"Стоматологическая клиника DENTE / Складской учет расходных материалов", hSep,
		`Дата и время списания:  ${formatDateTimeRu(result.deductionTimestamp)}`,
		`Идентификатор услуги:   ${result.treatmentReferenceId}`,
		`Код услуги каталога:    ${result.catalogItemId}`,
		`Лечащий врач:           ${doctorName || "Не указан"}`,
		`Пациент:                ${patientName || "Не указан"}`,
		`Статус склада:          ${overdraftLabel}`, sSep,
		"СПЕЦИФИКАЦИЯ СПИСАННЫХ РАСХОДНЫХ МАТЕРИАЛОВ:", ...items, sSep,
		`Всего позиций: ${result.items.length}`,
		`Наличие дефицита / овердрафта: ${result.hasOverdraft ? "ДА (требуется пополнение запасов)" : "НЕТ"}`,
		"", "ОТВЕТСТВЕННЫЕ ЛИЦА:",
		"Отпустил (медсестра / склад):  _________________ / ________________________",
		`Списано в приеме (врач):       _________________ / ${doctorName || "________________________"}`, hSep,
	].join("\n");
}

export interface ConsumablesA4ReportMeta {
	clinicName?: string | undefined; patientFullName?: string | undefined; doctorFullName?: string | undefined;
	visitDate?: string | undefined; cardRecordNumber?: string | undefined; actNumber?: string | undefined;
}

export function formatConsumablesWriteOffA4Report(
	result: ConsumableDeductionResult, meta?: ConsumablesA4ReportMeta,
): string {
	const clinic = meta?.clinicName ?? "ООО «ДЕНТЕ» СТОМАТОЛОГИЧЕСКАЯ КЛИНИКА";
	const patient = meta?.patientFullName ?? `Пациент ID: ${result.patientId}`;
	const doctor = meta?.doctorFullName ?? `Врач ID: ${result.doctorId}`;
	const date = meta?.visitDate ?? new Date().toISOString().slice(0, 10);
	const card = meta?.cardRecordNumber ?? "б/н";
	const actNum = meta?.actNumber ?? `АКТ-МАТ-${result.visitId.slice(-6).toUpperCase()}`;
	const div = "=".repeat(78);
	const subDiv = "-".repeat(78);

	const items = result.items.length === 0
		? ["   (Списанные материалы отсутствуют — услуги без нормативного расхода)"]
		: result.items.flatMap((item, i) => {
				const tooth = item.toothNumber ? ` [Зуб ${item.toothNumber}]` : "";
				const code = item.service804nCode ? ` (${item.service804nCode})` : "";
				const flag = item.isOverdraft ? " [!] ОВЕРДРАФТ" : "";
				return [
					`   ${i + 1}. ${item.itemName}${tooth}${code}${flag}`,
					`      Списано: ${item.deductedQty} ${item.unit ?? "шт."} | Себестоимость: ${item.totalCostPriceRub} | Остаток склада: ${item.remainingQty} ${item.unit ?? "шт."}`,
				];
			});

	const overdraftBlock = result.hasOverdraft ? [
		"   [!] ВНИМАНИЕ: Зафиксирован мягкий овердрафт складских позиций.",
		...result.softOverdrafts.map((w) => `       - ${w}`),
		"   Клинический приоритет: проведение лечения и оказание медицинской помощи пациенту не блокируются.",
		"   Уведомление направлено в отдел снабжения для планового пополнения.",
	] : [
		"   [OK] Складской баланс в норме, дефицит материалов отсутствует.",
		"   Нормы СанПиН по учету анестетиков и дезинфектантов соблюдены.",
	];

	return [
		div, "МИНИСТЕРСТВО ЗДРАВООХРАНЕНИЯ РОССИЙСКОЙ ФЕДЕРАЦИИ",
		"МЕДИЦИНСКАЯ КАРТА СТОМАТОЛОГИЧЕСКОГО БОЛЬНОГО: ФОРМА N 043/У",
		"УЧЕТ МЕДИЦИНСКИХ ИЗДЕЛИЙ, МАТЕРИАЛОВ И ДЕЗИНФЕКТАНТОВ ПО САНПИН",
		`АКТ СПИСАНИЯ РАСХОДНЫХ МАТЕРИАЛОВ N ${actNum}`, div,
		`Организация: ${clinic}`, `Пациент: ${patient} | Карта 043/у: ${card}`,
		`Лечащий врач: ${doctor} | Визит: ${result.visitId}`, `Дата списания: ${date}`, subDiv,
		"1. ВЕДОМОСТЬ СПИСАННЫХ МАТЕРИАЛОВ ПО ОКАЗАННЫМ МЕДИЦИНСКИМ УСЛУГАМ:", ...items, subDiv,
		"2. ИТОГОВЫЕ ПОКАЗАТЕЛИ СЕБЕСТОИМОСТИ МАТЕРИАЛОВ ВИЗИТА:",
		`   Всего списано позиций номенклатуры: ${result.totalDeductedItems}`,
		`   Общая себестоимость списанных материалов: ${result.totalCostPriceRub}`, subDiv,
		"3. СКЛАДСКОЙ КОНТРОЛЬ И САНПИН РЕГЛАМЕНТ:", ...overdraftBlock, subDiv,
		"Подписи ответственных лиц:", `Врач-стоматолог: ____________________ / ${doctor} /`,
		"Старшая медицинская сестра / зав. складом: ____________________ /                        /", div,
	].join("\n");
}

export const treatmentConsumablesEngine = {
	calculateServiceConsumables, executeBatchConsumablesDeduction, formatConsumablesWriteOffA4Report,
	consumableCategorySchema, consumableUnitSchema, consumableItemLinkSchema, renderedServiceItemSchema,
	consumableDeductionRequestSchema, consumableDeductedItemSchema, consumableDeductionResultSchema,
	CONSUMABLE_CATEGORY_LABELS, CONSUMABLE_UNIT_LABELS, CLASS_B_WEIGHT_ESTIMATES, calculateClassBWasteWeightKg,
	processConsumablesStockDeduction, toConsumableItemLink, toTreatmentConsumableLink,
} as const;
