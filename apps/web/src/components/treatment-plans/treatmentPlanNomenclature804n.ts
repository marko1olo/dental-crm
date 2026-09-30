/**
 * treatmentPlanNomenclature804n.ts — Номенклатура медицинских услуг Приказа Минздрава РФ № 804н
 * и анатомические предикаты зубов / эндодонтических каналов (FDI ISO 3950).
 */

import type { Order804nProcedureDefinition } from "./types";
import type { ToothData } from "../odontogram/ToothChart";

/**
 * Проверка принадлежности зуба к временному (молочному) прикусу по стандарту FDI ISO 3950.
 * Временные зубы: квадранты 5 (51-55), 6 (61-65), 7 (71-75), 8 (81-85).
 */
export function isDeciduousTooth(toothNumber: number): boolean {
	return (
		(toothNumber >= 51 && toothNumber <= 55) ||
		(toothNumber >= 61 && toothNumber <= 65) ||
		(toothNumber >= 71 && toothNumber <= 75) ||
		(toothNumber >= 81 && toothNumber <= 85)
	);
}

/**
 * Определение анатомического количества корневых каналов по стандарту FDI ISO 3950:
 * - Резцы и клыки (11..13, 21..23, 31..33, 41..43): 1 канал
 * - Верхние 1-е премоляры (14, 24): 2 канала (щечный B + небный P)
 * - Верхние 2-е премоляры (15, 25): 1 канал
 * - Нижние премоляры (34, 35, 44, 45): 1 канал
 * - Нижние моляры (36, 37, 46, 47, 38, 48): 3 канала (MB, ML, Distal) или 4 канала
 * - Верхние моляры (16, 17, 26, 27, 18, 28): 4 канала (MB1, MB2, DB, Palatal) или 3 канала
 * - Временные резцы/клыки (51..53, 61..63, 71..73, 81..83): 1 канал
 * - Временные моляры (54, 55, 64, 65): 3 канала; (74, 75, 84, 85): 2 канала
 */
export function getAnatomicalRootCanalCount(
	toothNumber: number,
	clinicalCanalCount?: number,
): number {
	if (
		typeof clinicalCanalCount === "number" &&
		Number.isFinite(clinicalCanalCount) &&
		clinicalCanalCount > 0
	) {
		return Math.min(4, Math.max(1, Math.round(clinicalCanalCount)));
	}

	const isDeciduous = isDeciduousTooth(toothNumber);
	const quadrant = Math.floor(toothNumber / 10);
	const pos = toothNumber % 10;
	const isUpper =
		quadrant === 1 || quadrant === 2 || quadrant === 5 || quadrant === 6;

	// Временный прикус
	if (isDeciduous) {
		if (pos <= 3) return 1;
		if (isUpper) return 3;
		return 2;
	}

	// Постоянный прикус
	// Резцы и клыки: 11..13, 21..23, 31..33, 41..43 -> 1 канал
	if (pos >= 1 && pos <= 3) {
		return 1;
	}

	// Премоляры:
	if (pos === 4) {
		// Верхний 1-й премоляр (14, 24) -> 2 канала (B, P)
		if (isUpper) return 2;
		// Нижний 1-й премоляр (34, 44) -> 1 канал
		return 1;
	}

	if (pos === 5) {
		// Верхний 2-й премоляр (15, 25) и нижний 2-й премоляр (35, 45) -> 1 канал
		return 1;
	}

	// Моляры: 6, 7, 8
	if (pos >= 6 && pos <= 8) {
		if (isUpper) {
			// Верхние моляры (16, 17, 26, 27, 18, 28): 4 канала (MB1, MB2, DB, Palatal)
			return 4;
		}
		// Нижние моляры (36, 37, 46, 47, 38, 48): 3 канала (MB, ML, Distal)
		return 3;
	}

	return 1;
}

/**
 * Извлечение клинического числа каналов из ToothData (учитывает clinicalData.canals).
 */
export function extractCanalCount(tooth: ToothData): number {
	const clinicalData = tooth.clinicalData as { canals?: unknown[] } | undefined;
	const overrideCount = Array.isArray(clinicalData?.canals) ? clinicalData.canals.length : undefined;
	return getAnatomicalRootCanalCount(tooth.toothNumber, overrideCount);
}

/**
 * Получить процедуру инструментальной обработки каналов (A16.07.030.001..004)
 */
export function getEndoPreparationProcedure(canalsCount: number): Order804nProcedureDefinition {
	const clamped = Math.min(4, Math.max(1, Math.round(canalsCount)));
	const key = "EndoPrep" + clamped + "Canal" + (clamped > 1 ? "s" : "");
	return (
		ORDER_804N_DICTIONARY[key] ?? {
			code: "A16.07.030.00" + clamped,
			title: "Инструментальная и медикаментозная обработка корневых каналов (" + clamped + "-канальный зуб)",
			category: "Эндодонтия",
			defaultPriceRub: 3500 + (clamped - 1) * 2000,
			stageKind: "stage_1_therapy",
			stageNumber: 1,
			keywords: ["обработка каналов", "инструментальная"],
			materialsDefault: "Никель-титановые ротационные файлы, NaOCl 3%, EDTA 17%",
			uetDoctor: 2.0 + clamped * 0.5,
			uetNurse: 1.5 + clamped * 0.5,
		}
	);
}

/**
 * Получить процедуру пломбирования / обтурации корневых каналов (A16.07.008.001..004)
 */
export function getEndoObturationProcedure(canalsCount: number): Order804nProcedureDefinition {
	const clamped = Math.min(4, Math.max(1, Math.round(canalsCount)));
	const key = "EndoObturation" + clamped + "Canal" + (clamped > 1 ? "s" : "");
	return (
		ORDER_804N_DICTIONARY[key] ?? {
			code: "A16.07.008.00" + clamped,
			title: "Пломбирование корневых каналов зуба (" + clamped + "-канальный зуб)",
			category: "Эндодонтия",
			defaultPriceRub: 3000 + (clamped - 1) * 2000,
			stageKind: "stage_1_therapy",
			stageNumber: 1,
			keywords: ["пломбирование каналов", "обтурация"],
			materialsDefault: "Гуттаперчевые конусные штифты, биокерамический силер",
			uetDoctor: 2.0 + clamped * 0.5,
			uetNurse: 1.5 + clamped * 0.5,
		}
	);
}

/**
 * Получить пару процедур эндодонтии (обработка + обтурация) с расчетом общей цены.
 */
export function getEndodonticOrder804nPair(canalsCount: number): {
	readonly canalCount: number;
	readonly instrumentation: Order804nProcedureDefinition;
	readonly obturation: Order804nProcedureDefinition;
	readonly combinedPriceRub: number;
} {
	const prep = getEndoPreparationProcedure(canalsCount);
	const obt = getEndoObturationProcedure(canalsCount);
	return {
		canalCount: Math.min(4, Math.max(1, Math.round(canalsCount))),
		instrumentation: prep,
		obturation: obt,
		combinedPriceRub: prep.defaultPriceRub + obt.defaultPriceRub,
	};
}

/**
 * Проверка, является ли постоянный зуб моляром или премоляром (жевательная группа: 14..18, 24..28, 34..38, 44..48).
 */
export function isMolarOrPremolar(toothNumber: number): boolean {
	if (isDeciduousTooth(toothNumber)) return false;
	const pos = toothNumber % 10;
	return pos >= 4 && pos <= 8;
}

/**
 * Порядок анатомического расположения постоянных зубов на челюстях для поиска непрерывных рядов дефектов.
 */
export const UPPER_ARCH_TEETH = [18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28] as const;
export const LOWER_ARCH_TEETH = [48, 47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37, 38] as const;

/**
 * Официальная Номенклатура медицинских услуг (Приказ Минздрава России от 13.10.2017 № 804н)
 * с эталонной клинической структуризацией по 3 этапам комплексного плана.
 */
export const ORDER_804N_DICTIONARY: Record<string, Order804nProcedureDefinition> = {
	// ==========================================
	// ЭТАП 1: ТЕРАПИЯ, ЭНДОДОНТИЯ, ПАРОДОНТОЛОГИЯ, ДЕТСКАЯ СТОМАТОЛОГИЯ И НЕОТЛОЖНАЯ САНАЦИЯ
	// ==========================================
	DiagnosticsCT: {
		code: "A06.07.004",
		title: "Компьютерная томография челюстно-лицевой области (КЛКТ 3D)",
		category: "Диагностика",
		defaultPriceRub: 3500,
		stageKind: "stage_1_therapy",
		stageNumber: 1,
		keywords: ["кт", "томограф", "сним", "кнкт", "диагност", "клкт"],
		materialsDefault: "Цифровой 3D-томограф высокой резолюции",
		uetDoctor: 1.5,
		uetNurse: 1.5,
	},
	HygieneComplex: {
		code: "A16.07.050",
		title: "Профессиональная гигиена полости рта и зубов (Air-Flow + УЗ-скейлинг + реминерализация)",
		category: "Гигиена",
		defaultPriceRub: 5500,
		stageKind: "stage_1_therapy",
		stageNumber: 1,
		keywords: ["гигиен", "air-flow", "чистк", "скейлинг", "отложени", "профгигиен"],
		materialsDefault: "Глициновый порошок Air-Flow Plus, фторлак Clinpro White Varnish, оптрагейт",
		uetDoctor: 2.0,
		uetNurse: 2.0,
	},
	PeriodontalScalingSRP: {
		code: "A16.07.051",
		title: "Скейлинг и сглаживание поверхности корня при заболеваниях пародонта (SRP / Вектор-терапия)",
		category: "Пародонтология",
		defaultPriceRub: 2500,
		stageKind: "stage_1_therapy",
		stageNumber: 1,
		keywords: ["скейлинг", "srp", "пародонт", "вектор", "корен", "десн", "карман"],
		materialsDefault: "Ультразвуковые микронасадки EMS Perio Slim, полировочный флюид Vector Polish",
		uetDoctor: 2.0,
		uetNurse: 1.5,
	},
	PeriodontalClosedCurettage: {
		code: "A16.07.039",
		title: "Закрытый кюретаж пародонтального кармана в области зуба",
		category: "Пародонтология",
		defaultPriceRub: 1800,
		stageKind: "stage_1_therapy",
		stageNumber: 1,
		keywords: ["кюретаж", "закрытый", "пародонтит", "карман"],
		materialsDefault: "Зоноспецифические кюреты Грейси Hu-Friedy, антисептический гель Curasept",
		uetDoctor: 1.5,
		uetNurse: 1.0,
	},
	PeriodontalSplinting: {
		code: "A16.07.019",
		title: "Временное шинирование зубов при заболеваниях пародонта (стекловолоконная лента)",
		category: "Пародонтология",
		defaultPriceRub: 4500,
		stageKind: "stage_1_therapy",
		stageNumber: 1,
		keywords: ["шинирован", "ribbond", "подвижност", "стекловолокн"],
		materialsDefault: "Стекловолоконная лента Ribbond Ultra, наногибридный текучий композит GrandioSO",
		uetDoctor: 2.5,
		uetNurse: 2.0,
	},
	CofferdamIsolation: {
		code: "A16.07.093",
		title: "Наложение коффердама (раббердама) для абсолютной изоляции рабочего поля",
		category: "Терапия",
		defaultPriceRub: 1200,
		stageKind: "stage_1_therapy",
		stageNumber: 1,
		keywords: ["коффердам", "раббердам", "изоляц", "optidam"],
		materialsDefault: "Латексный платок Sanctuary / Nic Tone, кламп Sanctuary, жидкий коффердам",
		uetDoctor: 0.5,
		uetNurse: 0.5,
	},
	CariesTherapyEconomy: {
		code: "A16.07.002",
		title: "Восстановление зуба пломбой (базовый композит светового отверждения Gradia / Charisma)",
		category: "Терапия",
		defaultPriceRub: 3500,
		stageKind: "stage_1_therapy",
		stageNumber: 1,
		keywords: ["базовый композит", "пломба эконом", "gradia", "charisma", "кариес эконом"],
		materialsDefault: "Светоотверждаемый микрогибридный композит GC Gradia Direct / Heraeus Charisma",
		uetDoctor: 2.0,
		uetNurse: 1.5,
	},
	CariesTherapy: {
		code: "A16.07.002.001",
		title: "Восстановление зуба пломбой (лечение кариеса нанокомпозитом)",
		category: "Терапия",
		defaultPriceRub: 4800,
		stageKind: "stage_1_therapy",
		stageNumber: 1,
		keywords: ["кариес", "пломб", "композит", "реставрац", "эмаль"],
		materialsDefault: "Светоотверждаемый наногибридный композит (Estelite / Filtek Ultimate)",
		uetDoctor: 2.5,
		uetNurse: 2.0,
	},
	BuildupFiberPost: {
		code: "A16.07.003.001",
		title: "Восстановление зуба под коронку (билдап композитом со стекловолоконным штифтом / культевая вкладка)",
		category: "Терапия",
		defaultPriceRub: 5500,
		stageKind: "stage_1_therapy",
		stageNumber: 1,
		keywords: ["билдап", "культ", "стекловолокн", "штифт", "build-up", "под коронку"],
		materialsDefault: "Стекловолоконный штифт RelyX Fiber Post, композит двойного отверждения LuxaCore Z",
		uetDoctor: 2.0,
		uetNurse: 1.5,
	},

	// Эндодонтия 804н — Инструментальная и медикаментозная обработка корневых каналов (A16.07.030.001..004)
	EndoPrep1Canal: {
		code: "A16.07.030.001",
		title: "Инструментальная и медикаментозная обработка корневого канала (1-канальный зуб)",
		category: "Эндодонтия",
		defaultPriceRub: 3500,
		stageKind: "stage_1_therapy",
		stageNumber: 1,
		keywords: ["обработка канала", "1 канал", "инструментальная", "эндо", "prep"],
		materialsDefault: "Никель-титановые ротационные файлы WaveOne Gold, NaOCl 3%, EDTA 17%",
		uetDoctor: 2.0,
		uetNurse: 1.5,
	},
	EndoPrep2Canals: {
		code: "A16.07.030.002",
		title: "Инструментальная и медикаментозная обработка корневых каналов (2-канальный зуб)",
		category: "Эндодонтия",
		defaultPriceRub: 5500,
		stageKind: "stage_1_therapy",
		stageNumber: 1,
		keywords: ["обработка каналов", "2 канала", "инструментальная", "эндо", "prep"],
		materialsDefault: "Никель-титановые ротационные файлы WaveOne Gold, NaOCl 3%, EDTA 17%",
		uetDoctor: 2.5,
		uetNurse: 2.0,
	},
	EndoPrep3Canals: {
		code: "A16.07.030.003",
		title: "Инструментальная и медикаментозная обработка корневых каналов (3-канальный зуб)",
		category: "Эндодонтия",
		defaultPriceRub: 7500,
		stageKind: "stage_1_therapy",
		stageNumber: 1,
		keywords: ["обработка каналов", "3 канала", "инструментальная", "эндо", "prep"],
		materialsDefault: "Никель-титановые ротационные файлы ProTaper Gold, NaOCl 3%, гель EDTA 17%",
		uetDoctor: 3.5,
		uetNurse: 2.5,
	},
	EndoPrep4Canals: {
		code: "A16.07.030.004",
		title: "Инструментальная и медикаментозная обработка корневых каналов (4-канальный зуб)",
		category: "Эндодонтия",
		defaultPriceRub: 9500,
		stageKind: "stage_1_therapy",
		stageNumber: 1,
		keywords: ["обработка каналов", "4 канала", "инструментальная", "эндо", "prep"],
		materialsDefault: "Никель-титановые ротационные файлы ProTaper Gold / WaveOne, NaOCl 3%, EDTA 17%",
		uetDoctor: 4.0,
		uetNurse: 3.0,
	},

	// Эндодонтия 804н — Пломбирование / обтурация корневых каналов (A16.07.008.001..004)
	EndoObturation1Canal: {
		code: "A16.07.008.001",
		title: "Пломбирование корневого канала зуба гуттаперчей / биокерамикой (1 канал)",
		category: "Эндодонтия",
		defaultPriceRub: 3000,
		stageKind: "stage_1_therapy",
		stageNumber: 1,
		keywords: ["пломбирование канала", "1 канал", "обтурация", "гуттаперча"],
		materialsDefault: "Гуттаперчевые конусные штифты 0.04/0.06, биокерамический силер TotalFill / AH Plus",
		uetDoctor: 2.0,
		uetNurse: 1.5,
	},
	EndoObturation2Canals: {
		code: "A16.07.008.002",
		title: "Пломбирование корневых каналов зуба (2-канальный зуб)",
		category: "Эндодонтия",
		defaultPriceRub: 5000,
		stageKind: "stage_1_therapy",
		stageNumber: 1,
		keywords: ["пломбирование каналов", "2 канала", "обтурация", "гуттаперча"],
		materialsDefault: "Гуттаперчевые конусные штифты 0.04/0.06, биокерамический силер TotalFill / AH Plus",
		uetDoctor: 2.5,
		uetNurse: 2.0,
	},
	EndoObturation3Canals: {
		code: "A16.07.008.003",
		title: "Пломбирование корневых каналов зуба (3-канальный зуб)",
		category: "Эндодонтия",
		defaultPriceRub: 7000,
		stageKind: "stage_1_therapy",
		stageNumber: 1,
		keywords: ["пломбирование каналов", "3 канала", "обтурация", "гуттаперча"],
		materialsDefault: "Гуттаперчевые конусные штифты 0.04/0.06, биокерамический силер TotalFill / AH Plus",
		uetDoctor: 3.5,
		uetNurse: 2.5,
	},
	EndoObturation4Canals: {
		code: "A16.07.008.004",
		title: "Пломбирование корневых каналов зуба (4-канальный зуб)",
		category: "Эндодонтия",
		defaultPriceRub: 9000,
		stageKind: "stage_1_therapy",
		stageNumber: 1,
		keywords: ["пломбирование каналов", "4 канала", "обтурация", "гуттаперча"],
		materialsDefault: "Гуттаперчевые конусные штифты 0.04/0.06, биокерамический силер TotalFill / AH Plus",
		uetDoctor: 4.0,
		uetNurse: 3.0,
	},

	// Дополнительные процедуры эндодонтии
	EndoMedicationCaOH2: {
		code: "A16.07.091",
		title: "Временное пломбирование лекарственным препаратом корневого канала (Ca(OH)2)",
		category: "Эндодонтия",
		defaultPriceRub: 2000,
		stageKind: "stage_1_therapy",
		stageNumber: 1,
		keywords: ["кальций", "гидроксид кальция", "ultracal", "временное пломбирование канала"],
		materialsDefault: "Препарат на основе гидроксида кальция UltraCal XS, стерильные бумажные штифты",
		uetDoctor: 1.5,
		uetNurse: 1.0,
	},
	EndoUnsealing: {
		code: "A16.07.082",
		title: "Распломбирование корневого канала зуба",
		category: "Эндодонтия",
		defaultPriceRub: 2500,
		stageKind: "stage_1_therapy",
		stageNumber: 1,
		keywords: ["распломбирование", "перелечивание", "извлечение штифта", "эндосольв"],
		materialsDefault: "Растворитель гуттаперчи D-Solv, ретритмент-файлы ProTaper D1-D3",
		uetDoctor: 2.5,
		uetNurse: 2.0,
	},
	PulpitisEndo: {
		code: "A16.07.008.002",
		title: "Эндодонтическое лечение пульпита (инструментальная обработка и 3D-обтурация каналов)",
		category: "Эндодонтия",
		defaultPriceRub: 13500,
		stageKind: "stage_1_therapy",
		stageNumber: 1,
		keywords: ["пульпит", "эндо", "канал", "обтурац", "депульп"],
		materialsDefault: "Никель-титановые ротационные файлы WaveOne Gold, гуттаперча с биокерамическим силером",
		uetDoctor: 4.5,
		uetNurse: 3.5,
	},
	PeriodontitisTherapy: {
		code: "A16.07.009.001",
		title: "Лечение апикального периодонтита (распломбирование, дезинфекция и герметизация)",
		category: "Эндодонтия",
		defaultPriceRub: 16500,
		stageKind: "stage_1_therapy",
		stageNumber: 1,
		keywords: ["периодонтит", "дезинфекц", "гранулем", "кист"],
		materialsDefault: "Препарат на основе гидроксида кальция UltraCal, термопластифицированная гуттаперча",
		uetDoctor: 5.0,
		uetNurse: 4.0,
	},

	// Детская стоматология (Временные зубы 51..85)
	PediatricCariesTherapy: {
		code: "A16.07.002.001",
		title: "Восстановление временного зуба пломбой (лечение кариеса молочного зуба)",
		category: "Детская терапия",
		defaultPriceRub: 3200,
		stageKind: "stage_1_therapy",
		stageNumber: 1,
		keywords: ["детск кариес", "молочн зуб", "временн зуб", "twinky", "fuji"],
		materialsDefault: "Цветной компомер Twinky Star / стеклоиономер Fuji IX GP, аппликационная анестезия",
		uetDoctor: 2.0,
		uetNurse: 1.5,
	},
	PediatricPulpitisPulpotomy: {
		code: "A16.07.008.001",
		title: "Пульпотомия (ампутация пульпы) временного зуба с биоактивной герметизацией",
		category: "Детская терапия",
		defaultPriceRub: 5800,
		stageKind: "stage_1_therapy",
		stageNumber: 1,
		keywords: ["пульпотом", "детск пульпит", "ампутац пульпы", "biodentine"],
		materialsDefault: "Биоактивный заменитель дентина Septodont Biodentine / МТА, цинк-оксид-эвгенол",
		uetDoctor: 3.0,
		uetNurse: 2.0,
	},
	PediatricFissureSealing: {
		code: "A16.07.057",
		title: "Запечатывание фиссуры зуба герметиком (герметизация фиссур у детей)",
		category: "Профилактика",
		defaultPriceRub: 2200,
		stageKind: "stage_1_therapy",
		stageNumber: 1,
		keywords: ["герметизац", "фиссур", "силан", "clinpro"],
		materialsDefault: "Светоотверждаемый герметик с цветовой индикацией 3M Clinpro Sealant",
		uetDoctor: 1.5,
		uetNurse: 1.0,
	},

	// ==========================================
	// ЭТАП 2: ХИРУРГИЧЕСКИЙ ЭТАП (Интервал остеоинтеграции 3–6 месяцев)
	// ==========================================
	SimpleExtraction: {
		code: "A16.07.001.001",
		title: "Атравматичное удаление зуба / корня с консервацией лунки",
		category: "Хирургия",
		defaultPriceRub: 3800,
		stageKind: "stage_2_surgery",
		stageNumber: 2,
		keywords: ["удален", "экстракц", "корен", "лунк"],
		materialsDefault: "Коллагеновый конус Parasorb Som / Alveostim, шовный материал PTFE",
		uetDoctor: 2.0,
		uetNurse: 2.0,
	},
	ComplexExtraction: {
		code: "A16.07.001.002",
		title: "Сложное хирургическое удаление ретенированного зуба / корня",
		category: "Хирургия",
		defaultPriceRub: 7500,
		stageKind: "stage_2_surgery",
		stageNumber: 2,
		keywords: ["сложное удален", "ретинирован", "дистопирован", "8-к"],
		materialsDefault: "Пьезохирургический протокол Mectron, гемостатическая губка",
		uetDoctor: 3.5,
		uetNurse: 3.0,
	},
	PediatricExtraction: {
		code: "A16.07.001",
		title: "Удаление временного зуба с аппликационной / инфильтрационной анестезией",
		category: "Детская хирургия",
		defaultPriceRub: 1800,
		stageKind: "stage_2_surgery",
		stageNumber: 2,
		keywords: ["удаление молочн", "удаление временн", "детск удален", "смена зубов"],
		materialsDefault: "Аппликационный обезболивающий гель, стерильный гемостатик",
		uetDoctor: 1.5,
		uetNurse: 1.5,
	},
	BoneGraftingSinusLift: {
		code: "A16.07.041",
		title: "Костная пластика челюстно-лицевой области (направленная костная регенерация / синус-лифтинг)",
		category: "Хирургия",
		defaultPriceRub: 28000,
		stageKind: "stage_2_surgery",
		stageNumber: 2,
		keywords: ["костн", "пластик", "синус", "лифтинг", "аугментац", "bio-oss", "нкр"],
		materialsDefault: "Ксеногенный костный материал Geistlich Bio-Oss + коллагеновая мембрана Bio-Gide",
		uetDoctor: 5.0,
		uetNurse: 4.0,
	},
	SurgicalNavigationGuide: {
		code: "A16.07.054",
		title: "Изготовление и фиксация навигационного 3D хирургического шаблона",
		category: "Хирургия",
		defaultPriceRub: 12000,
		stageKind: "stage_2_surgery",
		stageNumber: 2,
		keywords: ["шаблон", "навигацион", "3d-шаблон", "пилотн"],
		materialsDefault: "Биосовместимый 3D-фотополимер Formlabs Dental SG, титановые гильзы",
		uetDoctor: 2.0,
		uetNurse: 1.5,
	},
	AllOn4SurgicalGuide: {
		code: "A16.07.054",
		title: "Изготовление хирургического навигационного 3D-шаблона для протокола All-on-4 / All-on-6",
		category: "Хирургия",
		defaultPriceRub: 22000,
		stageKind: "stage_2_surgery",
		stageNumber: 2,
		keywords: ["шаблон all-on-4", "шаблон all-on-6", "навигационный шаблон тотальный"],
		materialsDefault: "Биосовместимый 3D-фотополимер Formlabs Dental SG, титановые гильзы",
		uetDoctor: 3.0,
		uetNurse: 2.0,
	},
	DentalImplantation: {
		code: "A16.07.054.001",
		title: "Внутрикостная дентальная имплантация + формирователь десны (Osstem TS-III / Dentium SuperLine)",
		category: "Хирургия",
		defaultPriceRub: 42000,
		stageKind: "stage_2_surgery",
		stageNumber: 2,
		keywords: ["имплант", "внутрикостн", "остеоинтеграц", "osstem", "dentium"],
		materialsDefault: "Титановый имплантат с биоактивной гидрофильной поверхностью SLA (Osstem TS-III / Dentium)",
		uetDoctor: 4.5,
		uetNurse: 4.0,
	},
	DentalImplantationPremium: {
		code: "A16.07.054.001",
		title: "Дентальная имплантация премиум-системы Straumann Roxolid SLActive / Nobel Biocare",
		category: "Хирургия",
		defaultPriceRub: 68000,
		stageKind: "stage_2_surgery",
		stageNumber: 2,
		keywords: ["straumann", "roxolid", "slactive", "nobel", "nobelactive", "премиум имплант"],
		materialsDefault: "Швейцарский титано-циркониевый сплав Roxolid с гидрофильной наноструктурированной поверхностью SLActive",
		uetDoctor: 5.0,
		uetNurse: 4.5,
	},
	AllOn4Implantation: {
		code: "A16.07.054.001",
		title: "Дентальная имплантация по протоколу All-on-4 (установка 4 внутрикостных имплантатов)",
		category: "Хирургия",
		defaultPriceRub: 168000,
		stageKind: "stage_2_surgery",
		stageNumber: 2,
		keywords: ["all-on-4", "все на 4", "all on 4", "тотальная имплантация 4"],
		materialsDefault: "4 дентальных имплантата с гидрофильной SLA-поверхностью (Osstem TS-III / Dentium)",
		uetDoctor: 6.0,
		uetNurse: 5.0,
	},
	AllOn6Implantation: {
		code: "A16.07.054.001",
		title: "Дентальная имплантация по протоколу All-on-6 (установка 6 внутрикостных имплантатов)",
		category: "Хирургия",
		defaultPriceRub: 248000,
		stageKind: "stage_2_surgery",
		stageNumber: 2,
		keywords: ["all-on-6", "все на 6", "all on 6", "тотальная имплантация 6"],
		materialsDefault: "6 дентальных имплантатов со швейцарской поверхностью Straumann SLActive / NobelActive",
		uetDoctor: 7.0,
		uetNurse: 6.0,
	},
	MultiUnitAbutment: {
		code: "A16.07.006.002",
		title: "Установка мультиюнит-абатмента (Multi-Unit) для винтовой фиксации",
		category: "Хирургия",
		defaultPriceRub: 14000,
		stageKind: "stage_2_surgery",
		stageNumber: 2,
		keywords: ["мультиюнит", "multi-unit", "мульти-юнит", "абатмент multiunit"],
		materialsDefault: "Титановый мультиюнит-абатмент (17° / 30° / прямой) с винтом фиксации",
		uetDoctor: 2.0,
		uetNurse: 1.5,
	},

	// ==========================================
	// ЭТАП 3: ОРТОПЕДИЧЕСКИЙ ЭТАП
	// ==========================================
	IntraoralScanning3D: {
		code: "A02.07.010",
		title: "Оптическое внутриротовое 3D-сканирование зубного ряда и регистрация окклюзии (CAD/CAM)",
		category: "Ортопедия",
		defaultPriceRub: 6500,
		stageKind: "stage_3_orthopedics",
		stageNumber: 3,
		keywords: ["3d-сканирование", "сканирование", "цифровой слепок", "itero", "trios", "3shape"],
		materialsDefault: "Цифровой интраоральный 3D-сканер 3Shape TRIOS / Medit i700",
		uetDoctor: 1.5,
		uetNurse: 1.0,
	},
	TemporaryCrownCadCam: {
		code: "A16.07.004.004",
		title: "Изготовление и фиксация временной фрезерованной коронки PMMA (CAD/CAM)",
		category: "Ортопедия",
		defaultPriceRub: 4500,
		stageKind: "stage_3_orthopedics",
		stageNumber: 3,
		keywords: ["временная коронка", "pmma", "пмма", "провизорная"],
		materialsDefault: "Высокопрочный фрезерованный многослойный полимер PMMA",
		uetDoctor: 2.0,
		uetNurse: 1.5,
	},
	InlayOnlay: {
		code: "A16.07.003",
		title: "Восстановление зуба керамической вкладкой / накладкой (Inlay/Onlay)",
		category: "Ортопедия",
		defaultPriceRub: 19500,
		stageKind: "stage_3_orthopedics",
		stageNumber: 3,
		keywords: ["вкладк", "накладк", "inlay", "onlay", "overlay"],
		materialsDefault: "Прессованная полевошпатная керамика IPS e.max Press",
		uetDoctor: 3.5,
		uetNurse: 2.5,
	},
	CrownMetalCeramic: {
		code: "A16.07.004",
		title: "Восстановление зуба металлокерамической коронкой (базовая ортопедия)",
		category: "Ортопедия",
		defaultPriceRub: 14000,
		stageKind: "stage_3_orthopedics",
		stageNumber: 3,
		keywords: ["металлокерамика", "мк коронка", "коронка металлокерамическая", "кобальт-хром"],
		materialsDefault: "КХС каркас с послойным нанесением керамической массы Duceram Plus / Vita VM13",
		uetDoctor: 3.5,
		uetNurse: 2.5,
	},
	CrownZirconia: {
		code: "A16.07.004.001",
		title: "Восстановление зуба коронкой из диоксида циркония (Prettau / Multi-Layer)",
		category: "Ортопедия",
		defaultPriceRub: 26000,
		stageKind: "stage_3_orthopedics",
		stageNumber: 3,
		keywords: ["цирконий", "диоксид", "коронк", "prettau", "zirconia"],
		materialsDefault: "Высокотранслюцентный многослойный диоксид циркония Katana Zirconia HTML",
		uetDoctor: 4.0,
		uetNurse: 3.0,
	},
	CrownEmaxCeramic: {
		code: "A16.07.004.002",
		title: "Восстановление зуба керамической коронкой / виниром E.max",
		category: "Ортопедия",
		defaultPriceRub: 38000,
		stageKind: "stage_3_orthopedics",
		stageNumber: 3,
		keywords: ["e.max", "emax", "керамик", "винир", "коронк"],
		materialsDefault: "Дисиликат лития IPS e.max CAD/Press с индивидуальным нанесением",
		uetDoctor: 4.5,
		uetNurse: 3.0,
	},
	PediatricCrownSSC: {
		code: "A16.07.004.003",
		title: "Восстановление временного зуба стандартной защитной металлической / циркониевой коронкой",
		category: "Детская ортопедия",
		defaultPriceRub: 4900,
		stageKind: "stage_3_orthopedics",
		stageNumber: 3,
		keywords: ["детск коронк", "стальн коронк", "коронка на молочн", "nusmile", "3m ssc"],
		materialsDefault: "Стальная анатомическая коронка 3M ESPE Stainless Steel Crown / цирконий NuSmile",
		uetDoctor: 2.5,
		uetNurse: 2.0,
	},
	BridgeProsthesisEconomy: {
		code: "A16.07.005",
		title: "Восстановление целостности зубного ряда несъемным металлокерамическим мостовидным протезом",
		category: "Ортопедия",
		defaultPriceRub: 28000,
		stageKind: "stage_3_orthopedics",
		stageNumber: 3,
		keywords: ["мост металлокерамика", "мостовидный металлокерамический", "мост эконом"],
		materialsDefault: "Металлокерамический мостовидный протез на фрезерованном каркасе Co-Cr",
		uetDoctor: 4.5,
		uetNurse: 3.0,
	},
	BridgeProsthesis: {
		code: "A16.07.005",
		title: "Восстановление целостности зубного ряда несъемным мостовидным протезом из диоксида циркония",
		category: "Ортопедия",
		defaultPriceRub: 52000,
		stageKind: "stage_3_orthopedics",
		stageNumber: 3,
		keywords: ["мост", "мостовидн", "протез"],
		materialsDefault: "Фрезерованный каркас из диоксида циркония с анатомической облицовкой",
		uetDoctor: 5.0,
		uetNurse: 3.5,
	},
	ClaspProsthesisEconomy: {
		code: "A16.07.036",
		title: "Протезирование частичными съемными бюгельными / пластиночными протезами",
		category: "Ортопедия",
		defaultPriceRub: 32000,
		stageKind: "stage_3_orthopedics",
		stageNumber: 3,
		keywords: ["бюгельный", "бюгель", "кламмер", "съемный протез", "бюгельный протез"],
		materialsDefault: "Литой дуговой бюгельный каркас с ацеталовыми/металлическими кламмерами и гарнитуром зубов Ivoclar",
		uetDoctor: 4.0,
		uetNurse: 2.5,
	},
	ImplantCrownProsthetics: {
		code: "A16.07.006",
		title: "Протезирование на имплантате (стандартный абатмент + циркониевая коронка с винтовой фиксацией)",
		category: "Ортопедия",
		defaultPriceRub: 34000,
		stageKind: "stage_3_orthopedics",
		stageNumber: 3,
		keywords: ["абатмент", "коронка на имплант", "протезирование на имплант", "винтовая"],
		materialsDefault: "Титановый стандартный абатмент + циркониевая коронка с винтовой фиксацией",
		uetDoctor: 4.5,
		uetNurse: 3.5,
	},
	ImplantCrownPremium: {
		code: "A16.07.006",
		title: "Протезирование на имплантате (индивидуальный циркониевый абатмент Ti-Base + коронка IPS e.max / Katana UTML)",
		category: "Ортопедия",
		defaultPriceRub: 48000,
		stageKind: "stage_3_orthopedics",
		stageNumber: 3,
		keywords: ["индивидуальный абатмент", "ti-base", "e.max на импланте", "katana на импланте", "премиум коронка на импланте"],
		materialsDefault: "Индивидуально фрезерованный циркониевый абатмент на титановом основании Ti-Base + коронка IPS e.max",
		uetDoctor: 5.0,
		uetNurse: 3.5,
	},
	AllOn4Prosthesis: {
		code: "A16.07.035",
		title: "Несъемный армированный акриловый / композитный протез с винтовой фиксацией All-on-4",
		category: "Ортопедия",
		defaultPriceRub: 140000,
		stageKind: "stage_3_orthopedics",
		stageNumber: 3,
		keywords: ["протез all-on-4", "балочный all-on-4", "несъемный протез все на 4"],
		materialsDefault: "Фрезерованная титановая балка + армированный композит / акрил Ivoclar Ivocap",
		uetDoctor: 6.0,
		uetNurse: 4.5,
	},
	AllOn6Prosthesis: {
		code: "A16.07.035",
		title: "Несъемный высокоэстетичный циркониевый / металлокомпозитный протез All-on-6 на титановой балке",
		category: "Ортопедия",
		defaultPriceRub: 210000,
		stageKind: "stage_3_orthopedics",
		stageNumber: 3,
		keywords: ["протез all-on-6", "циркониевый all-on-6", "балочный all-on-6", "несъемный протез все на 6"],
		materialsDefault: "Индивидуальная титановая фрезерованная балка + мостовидная дуга из диоксида циркония Katana",
		uetDoctor: 7.0,
		uetNurse: 5.5,
	},
};
