import type { ParsedKraftBarcode } from "@dental/shared";
import type {
	StandardTrayDefinition,
	StandardTrayType,
} from "./types.js";

export const STANDARD_TRAY_OPTIONS: readonly StandardTrayDefinition[] = [
	{
		id: "therapy",
		toolSetCode: "set_therapeutic_tray",
		labelRu:
			"Стандартный смотровой лоток терапевта (зеркало, зонд, пинцет, гладилка)",
		shortLabelRu: "Лоток терапевта",
		descriptionRu:
			"Базовый набор терапевтического приема в самоклеящемся крафт-пакете (50 сут.)",
	},
	{
		id: "surgery",
		toolSetCode: "set_surgery_basic",
		labelRu: "Хирургический набор экстракционный (элеваторы, щипцы, кюрета)",
		shortLabelRu: "Лоток хирурга",
		descriptionRu:
			"Хирургический экстракционный набор в двойной стерильной упаковке (60 сут.)",
	},
	{
		id: "endo",
		toolSetCode: "set_endo_instruments",
		labelRu: "Эндодонтический набор (файлы Ni-Ti, спредер, плаггер)",
		shortLabelRu: "Эндо-набор",
		descriptionRu:
			"Стерильный эндодонтический лоток с химическим интегратором 5 класса (134°C)",
	},
];

export function createStandardSterileTrayBarcode(
	trayType: StandardTrayType = "therapy",
	packDate: Date = new Date(),
	operatorName = "Смирнова А.В. (медсестра ЦСО)",
): ParsedKraftBarcode {
	const packDateIso = packDate.toISOString().slice(0, 10);
	const daysLifespan = trayType === "surgery" ? 60 : 50;
	const expDate = new Date(
		packDate.getTime() + daysLifespan * 24 * 3600 * 1000,
	);
	const expDateIso = expDate.toISOString().slice(0, 10);
	const fallbackTray: StandardTrayDefinition = STANDARD_TRAY_OPTIONS[0] ?? {
		id: "therapy",
		toolSetCode: "set_therapeutic_tray",
		labelRu: "Стандартный смотровой лоток терапевта",
		shortLabelRu: "Лоток терапевта",
		descriptionRu: "Базовый набор",
	};
	const trayDef =
		STANDARD_TRAY_OPTIONS.find((t) => t.id === trayType) ?? fallbackTray;

	const dateDigits = packDateIso.replace(/-/g, "");
	const rawInput = `KB-${dateDigits}-01#1|АК-01|CYC1|${packDateIso}|${expDateIso}|NURSE-01|${trayDef.toolSetCode}`;

	const formattedProtocolRecord043 = `Инструменты стерильны. Крафт-пакет №${rawInput} (Стерилизация инструментария: АК-01, цикл №1 от ${packDateIso}, годен до ${expDateIso}, ${trayDef.labelRu}), индикатор 5 класса (ИнтеТЕСТ 134°C) — норма. ${operatorName} [СанПиН 3.3686-21] вскрыт при пациенте.`;

	const packageMaterialId =
		trayType === "surgery"
			? "paper_self_seal_double"
			: "paper_self_seal_single";
	const packageSizeId =
		trayType === "surgery"
			? "size_150x250"
			: trayType === "endo"
				? "size_75x150"
				: "size_100x200";

	return {
		rawInput,
		barcodeType: "datamatrix_2d",
		isValid: true,
		isExpired: false,
		isExpiringSoon: false,
		daysRemaining: daysLifespan,
		daysLifespan,
		batchId: `KB-${dateDigits}-01`,
		serialNumber: 1,
		autoclaveId: "АК-01 (Melag 23B+)",
		cycleNumber: 1,
		packDateIso,
		expDateIso,
		operatorId: "NURSE-01",
		operatorName,
		toolSetId: trayDef.toolSetCode,
		toolSetNameRu: trayDef.labelRu,
		packageMaterialId,
		packageSizeId,
		indicatorId: "vinar_intetest_5",
		indicatorClassRu: "Химический интегратор 5 класса (пар 134°C / норма)",
		indicatorPassed: true,
		sanpinClauseRu: "Правила хранения стерильных изделий",
		formattedProtocolRecord043,
		formattedSterilizationDiaryRecord: formattedProtocolRecord043,
	};
}
