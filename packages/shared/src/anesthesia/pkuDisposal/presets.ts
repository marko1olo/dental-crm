/**
 * @dental/shared/anesthesia/pkuDisposal/presets.ts
 * 1-Click Anesthesia Carpule Disposal & Shift Batch Presets (Mandate 8b, <= 120 lines)
 */

import type { AnesthesiaPkuPresetDefinition, AnesthesiaPkuPresetKey, AnestheticDrugId } from "../types.js";

const DEFAULT_CONTAINER = "Желтый непрокалываемый контейнер с иглосъемником Класса Б";

function p(
	presetId: AnesthesiaPkuPresetKey, titleRu: string, shortLabelRu: string, subtitleRu: string,
	drugId: AnestheticDrugId, drugTradeNameRu: string, activeSubstanceRu: string, carpulesCount: number,
	standardSeriesNumber: string, standardBatchNumber: string, notesRu: string,
	disposalReason: "used_in_procedure" | "damaged_broken" | "shift_batch_deduction" = "used_in_procedure",
): AnesthesiaPkuPresetDefinition {
	return {
		presetId, titleRu, shortLabelRu, subtitleRu, drugId, drugTradeNameRu, activeSubstanceRu,
		carpulesCount, standardSeriesNumber, standardBatchNumber, expirationOffsetYears: 2,
		disposalReason, wasteClass: "class_b_hazardous", disinfectionMethod: "waste_sharps_container_class_b",
		wasteCollectionContainerRu: DEFAULT_CONTAINER, isSoftOverdraftSupported: true,
		assistantSignatureConfirmed: true, notesRu,
	};
}

export const ANESTHESIA_PKU_PRESETS: Record<AnesthesiaPkuPresetKey, AnesthesiaPkuPresetDefinition> = {
	ultracain_ds_forte_1: p(
		"ultracain_ds_forte_1", "1 карпула Ультракаин Д-С Форте (1:100 000)", "1 карп. Ультракаин Форте (1:100k)",
		"Серия ART-2026 • Срок +2 г. • Отходы Класса Б • Пакетное списание", "articaine_4_epi_100k",
		"Ультракаин Д-С форте", "Артикаина гидрохлорид 4% + Эпинефрин 1:100 000", 1, "ART-2026", "84019",
		"Пакетное списание 1 карпулы Ультракаин Д-С Форте (1:100 000). Утилизация в желтый контейнер Класса Б по СанПиН 3.3686-21. Списано в 1 клик медсестрой без комиссии из 3 человек (мягкий овердрафт склада).",
	),
	septanest_100_1: p(
		"septanest_100_1", "1 карпула Септанест (1:100 000)", "1 карп. Септанест (1:100k)",
		"Серия SP-2026 • Срок +2 г. • Отходы Класса Б • Пакетное списание", "articaine_4_epi_100k",
		"Септанест 1:100 000", "Артикаина гидрохлорид 4% + Адреналин 1:100 000", 1, "SP-2026", "73104",
		"Пакетное списание 1 карпулы Септанест (1:100 000). Сбор в контейнер Класса Б по СанПиН 3.3686-21. Списано в 1 клик медсестрой без комиссии из 3 человек.",
	),
	scandonest_3_1: p(
		"scandonest_3_1", "1 карпула Скандонест 3% (без вазоконстриктора, для сердечников)", "1 карп. Скандонест 3% (Кардио)",
		"Без адреналина • Серия SC-2026 • Отходы Класса Б • Кардио", "mepivacaine_3_plain",
		"Скандонест 3%", "Мепивакаина гидрохлорид 3% (без вазоконстриктора)", 1, "SC-2026", "51208",
		"Пакетное списание 1 карпулы Скандонест 3% (без вазоконстриктора, кардио). Сбор в контейнер Класса Б по СанПиН 3.3686-21. Списано медсестрой в 1 клик без комиссии из 3 человек.",
	),
	damaged_broken_1: p(
		"damaged_broken_1", "Списать бой / повреждение карпулы в 1 клик", "Списать бой / повреждение карпулы",
		"Механический бой • Осколки в контейнер • Класс Б", "articaine_4_epi_100k",
		"Ультракаин Д-С форте", "Артикаина гидрохлорид 4% + Эпинефрин 1:100 000", 1, "ART-2026", "84019",
		"Акт списания боя / повреждения карпулы анестетика оформлен медсестрой в 1 клик. Осколки помещены в желтый непрокалываемый контейнер Класса Б по СанПиН 3.3686-21 (без комиссии из 3 человек).",
		"damaged_broken",
	),
	articaine_100k_needle_30g_kit: p(
		"articaine_100k_needle_30g_kit", "Списана 1 карпула Артикаин 1:100 000 + игла 30G", "Пакет: 1 карп. Артикаин + игла 30G",
		"Пакетное списание: карпула 1.7 мл + игла карпульная 30G (Класс Б)", "articaine_4_epi_100k",
		"Артикаин 1:100 000 (с иглой 30G)", "Артикаина гидрохлорид 4% + Эпинефрин 1:100 000 + игла одноразовая 30G", 1, "ART-2026", "84019",
		"Пакетное списание: 1 карпула Артикаин 1:100 000 (1.7 мл) + 1 игла карпульная одноразовая 30G. Сбор в желтый контейнер Класса Б по СанПиН 3.3686-21. Списано в 1 клик медсестрой без комиссии из 3 человек.",
	),
	shift_batch_ultracain_ds: p(
		"shift_batch_ultracain_ds", "Пакетное списание за смену: Ультракаин Д-С (10 карпул)", "Смена: 10 карп. Ультракаин",
		"10 карпул • Пакетный расход за день/смену • Мягкий овердрафт", "articaine_4_epi_200k",
		"Ультракаин Д-С 1:200 000", "Артикаина гидрохлорид 4% + Эпинефрин 1:200 000", 10, "ART-2026", "84019",
		"Пакетное списание израсходованных карпул за смену (10 шт.). Отходы Класса Б. Списано медсестрой в 1 клик с мягким овердрафтом склада (СанПиН 3.3686-21, без комиссии из 3 человек).",
		"shift_batch_deduction",
	),
	shift_batch_scandonest: p(
		"shift_batch_scandonest", "Пакетное списание за смену: Скандонест 3% (5 карпул)", "Смена: 5 карп. Скандонест",
		"5 карпул • Кардио-препарат без адреналина • Мягкий овердрафт", "mepivacaine_3_plain",
		"Скандонест 3%", "Мепивакаина гидрохлорид 3% (без вазоконстриктора)", 5, "SC-2026", "51208",
		"Пакетное списание израсходованных карпул за смену (5 шт., кардио). Отходы Класса Б. Списано в 1 клик медсестрой без комиссии из 3 человек.",
		"shift_batch_deduction",
	),
};
