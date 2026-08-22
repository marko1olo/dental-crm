/**
 * treatmentPlanStagesEngine.ts — чистый клинико-финансовый движок планов лечения DENTE CRM.
 *
 * Выполняет:
 * 1. 1-Click генерацию 3 клинических этапов по одонтограмме с номенклатурой Приказа Минздрава РФ № 804н:
 *    - Этап 1: Неотложная помощь и терапевтическая санация (кариес, пульпиты, периодонтиты, пародонтология SRP A16.07.051, профгигиена A16.07.050, детская терапия, КЛКТ).
 *    - Этап 2: Хирургический этап (удаление корней/молочных зубов A16.07.001, костная пластика A16.07.041, синус-лифтинг, навигационный шаблон, имплантация A16.07.054.001).
 *    - Этап 3: Ортопедический этап (коронки E.max / диоксид циркония A16.07.004.001, мостовидные протезы, вкладки, протезирование на имплантатах A16.07.006, детские коронки A16.07.004.003).
 * 2. Генерацию 3 вариантов плана лечения («Эконом», «Стандарт», «Оптимальный») для презентации пациенту.
 * 3. Расчёт 13% налогового вычета НДФЛ (Код 01 / Код 02) и рассрочки 0% (3, 6, 12, 24 мес.) в копейках.
 * 4. Сопоставление с реальным каталогом услуг клиники (ServiceCatalogItem).
 */

import {
	type Kopecks,
	multiplyKopecks,
	parseKopecks,
	percentageOfKopecks,
	splitKopecks,
	sumKopecks,
} from "@dental/shared";
import type {
	LoyaltyBonusDeduction,
	NdflDeductionResult,
	Order804nProcedureDefinition,
	TierInstallmentPlan,
	TreatmentPlanItem,
	TreatmentPlanStage,
	TreatmentPlanStageKind,
	TreatmentPlanTier,
	TreatmentPlanTierId,
} from "./types";
import type { ToothData, ToothState } from "../odontogram/ToothChart";

export interface CatalogServiceLookupItem {
	readonly id: string;
	readonly title: string;
	readonly category: string;
	readonly basePath?: string;
	readonly basePriceRub: number;
	readonly active?: boolean;
}

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
 * Получить процедуру инструментальной обработки каналов (A16.07.030.001..004)
 */
export function getEndoPreparationProcedure(canalsCount: number): Order804nProcedureDefinition {
	const clamped = Math.min(4, Math.max(1, Math.round(canalsCount)));
	const key = `EndoPrep${clamped}Canal${clamped > 1 ? "s" : ""}`;
	return (
		ORDER_804N_DICTIONARY[key] ?? {
			code: `A16.07.030.00${clamped}`,
			title: `Инструментальная и медикаментозная обработка корневых каналов (${clamped}-канальный зуб)`,
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
	const key = `EndoObturation${clamped}Canal${clamped > 1 ? "s" : ""}`;
	return (
		ORDER_804N_DICTIONARY[key] ?? {
			code: `A16.07.008.00${clamped}`,
			title: `Пломбирование корневых каналов зуба (${clamped}-канальный зуб)`,
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
 * Официальная Номенклатура медицинских услуг (Приказ Минздрава России от 13.10.2017 № 804н)
 * с эталонной клинической структуризацией по 3 этапам комплексного плана.
 */
export const ORDER_804N_DICTIONARY: Record<string, Order804nProcedureDefinition> = {
	// ==========================================
	// ЭТАП 1: ТЕРАПИЯ, ПАРОДОНТОЛОГИЯ, ДЕТСКАЯ СТОМАТОЛОГИЯ И НЕОТЛОЖНАЯ САНАЦИЯ
	// ==========================================
	DiagnosticsCT: {
		code: "A06.07.004",
		title: "Компьютерная томография челюстно-лицевой области (КЛКТ 3D)",
		category: "Диагностика",
		defaultPriceRub: 3500,
		stageKind: "stage_1_therapy",
		stageNumber: 1,
		keywords: ["кт", "томограф", "сним", "кнкт", "диагност"],
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

	// Комплексные пакеты пульпита и периодонтита
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

	// Детская стоматология (Временные зубы)
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
	// ЭТАП 2: ХИРУРГИЧЕСКИЙ ЭТАП
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
		materialsDefault: "Биосовместимый 3D-фотополимер Formlabs Dental SG",
		uetDoctor: 2.0,
		uetNurse: 1.5,
	},
	DentalImplantation: {
		code: "A16.07.054.001",
		title: "Внутрикостная дентальная имплантация + формирователь десны",
		category: "Хирургия",
		defaultPriceRub: 42000,
		stageKind: "stage_2_surgery",
		stageNumber: 2,
		keywords: ["имплант", "внутрикостн", "остеоинтеграц", "osstem", "straumann"],
		materialsDefault: "Титановый имплантат с биоактивной гидрофильной поверхностью SLA/SLActive",
		uetDoctor: 4.5,
		uetNurse: 4.0,
	},

	// ==========================================
	// ЭТАП 3: ОРТОПЕДИЧЕСКИЙ ЭТАП
	// ==========================================
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
	BridgeProsthesis: {
		code: "A16.07.005",
		title: "Восстановление целостности зубного ряда несъемным мостовидным протезом",
		category: "Ортопедия",
		defaultPriceRub: 52000,
		stageKind: "stage_3_orthopedics",
		stageNumber: 3,
		keywords: ["мост", "мостовидн", "протез"],
		materialsDefault: "Фрезерованный каркас из диоксида циркония с анатомической облицовкой",
		uetDoctor: 5.0,
		uetNurse: 3.5,
	},
	ImplantCrownProsthetics: {
		code: "A16.07.006",
		title: "Протезирование на имплантате (индивидуальный циркониевый абатмент + коронка с винтовой фиксацией)",
		category: "Ортопедия",
		defaultPriceRub: 34000,
		stageKind: "stage_3_orthopedics",
		stageNumber: 3,
		keywords: ["абатмент", "коронка на имплант", "протезирование на имплант", "винтовая"],
		materialsDefault: "Индивидуальный титано-циркониевый Ti-Base абатмент + коронка с винтовой фиксацией",
		uetDoctor: 4.5,
		uetNurse: 3.5,
	},
};

/**
 * Поиск услуги в прейскуранте клиники по ключевым словам и категории.
 */
export function matchCatalogService(
	catalog: readonly CatalogServiceLookupItem[] | undefined,
	category: string,
	keywords: readonly string[],
	fallbackPriceRub: number,
	order804nCode?: string,
): { priceRub: number; title: string; priceId: string | null; fromCatalog: boolean } {
	if (!catalog || catalog.length === 0) {
		return {
			priceRub: fallbackPriceRub,
			title: "",
			priceId: null,
			fromCatalog: false,
		};
	}

	const normalizedKeywords = keywords.map((k) =>
		k.toLowerCase().replace(/ё/g, "е"),
	);

	// 1. Точное совпадение по Order 804n коду (если есть в прайсе)
	if (order804nCode) {
		const byCode = catalog.find(
			(s) =>
				s.active !== false &&
				(s.title.includes(order804nCode) ||
					(s as unknown as { order804nCode?: string }).order804nCode ===
						order804nCode),
		);
		if (
			byCode &&
			typeof byCode.basePriceRub === "number" &&
			byCode.basePriceRub > 0
		) {
			return {
				priceRub: byCode.basePriceRub,
				title: byCode.title,
				priceId: byCode.id,
				fromCatalog: true,
			};
		}
	}

	// 2. Сопоставление по ключевым словам и категории
	const matched = catalog.filter((item) => {
		const title = item.title.toLowerCase().replace(/ё/g, "е");
		return normalizedKeywords.some((kw) => title.includes(kw));
	});

	const activeMatch = matched.find((s) => s.active !== false) ?? matched[0];
	if (
		activeMatch &&
		typeof activeMatch.basePriceRub === "number" &&
		activeMatch.basePriceRub > 0
	) {
		return {
			priceRub: activeMatch.basePriceRub,
			title: activeMatch.title,
			priceId: activeMatch.id,
			fromCatalog: true,
		};
	}

	return {
		priceRub: fallbackPriceRub,
		title: "",
		priceId: null,
		fromCatalog: false,
	};
}

/**
 * 1-Click генерация комплексных этапов плана лечения на основе одонтограммы.
 * Поддерживает взрослую и детскую одонтограмму (молочные зубы), пародонтологические патологии и имплантацию.
 */
export function generateTreatmentPlanStages(
	teeth: readonly ToothData[],
	catalog?: readonly CatalogServiceLookupItem[],
	discountPercent: number = 0,
): TreatmentPlanStage[] {
	const stage1Items: TreatmentPlanItem[] = [];
	const stage2Items: TreatmentPlanItem[] = [];
	const stage3Items: TreatmentPlanItem[] = [];

	const validDiscountPct = Math.max(0, Math.min(50, discountPercent));

	let hasPeriodontalNeeds = false;

	// Анализируем зубы и пародонтальный статус
	for (const tooth of teeth) {
		const num = tooth.toothNumber;
		const state: ToothState | string = tooth.state || "Healthy";
		const isDeciduous = isDeciduousTooth(num);

		// Пародонтологический скрининг (костная резорбция, подвижность, карманы)
		const hasBoneLoss = Boolean(tooth.boneLossLevel && tooth.boneLossLevel > 0);
		const hasMobility = Boolean(tooth.mobility && tooth.mobility > 0);
		const hasFurcation = Boolean(tooth.furcationGrade && tooth.furcationGrade > 0);

		if (hasBoneLoss || hasMobility || hasFurcation) {
			hasPeriodontalNeeds = true;

			// Добавляем скейлинг и сглаживание корней (A16.07.051)
			const defSrp = ORDER_804N_DICTIONARY.PeriodontalScalingSRP!;
			const matchSrp = matchCatalogService(
				catalog,
				"periodontics",
				defSrp.keywords,
				defSrp.defaultPriceRub,
				defSrp.code,
			);
			const srpUnit = matchSrp.priceRub;
			const srpDisc =
				validDiscountPct > 0 ? Math.round((srpUnit * validDiscountPct) / 100) : 0;

			stage1Items.push({
				id: `srp-${num}`,
				toothNumber: num,
				code804n: defSrp.code,
				name: matchSrp.title || `Зуб ${num}: ${defSrp.title}`,
				category: "Пародонтология",
				unitPriceRub: srpUnit,
				priceRub: srpUnit - srpDisc,
				discountRub: srpDisc,
				quantity: 1,
				phase: 1,
				stageKind: "stage_1_therapy",
				isAuto: true,
				priceId: matchSrp.priceId,
				fromCatalog: matchSrp.fromCatalog,
				materials: defSrp.materialsDefault,
				clinicalRationale: "Устранение поддесневого биопленочного налета и полировка корня",
			});

			// Если глубокая потеря кости (grade >= 2) — добавляем закрытый кюретаж кармана (A16.07.039)
			if ((tooth.boneLossLevel && tooth.boneLossLevel >= 2) || hasFurcation) {
				const defCurettage = ORDER_804N_DICTIONARY.PeriodontalClosedCurettage!;
				const matchCur = matchCatalogService(
					catalog,
					"periodontics",
					defCurettage.keywords,
					defCurettage.defaultPriceRub,
					defCurettage.code,
				);
				const curUnit = matchCur.priceRub;
				const curDisc =
					validDiscountPct > 0 ? Math.round((curUnit * validDiscountPct) / 100) : 0;

				stage1Items.push({
					id: `curettage-${num}`,
					toothNumber: num,
					code804n: defCurettage.code,
					name: matchCur.title || `Зуб ${num}: ${defCurettage.title}`,
					category: "Пародонтология",
					unitPriceRub: curUnit,
					priceRub: curUnit - curDisc,
					discountRub: curDisc,
					quantity: 1,
					phase: 1,
					stageKind: "stage_1_therapy",
					isAuto: true,
					priceId: matchCur.priceId,
					fromCatalog: matchCur.fromCatalog,
					materials: defCurettage.materialsDefault,
					clinicalRationale: "Аблация грануляционной ткани и редукция глубины пародонтального кармана",
				});
			}

			// Если патологическая подвижность >= 2 — шинирование Ribbond (A16.07.019)
			if (tooth.mobility && tooth.mobility >= 2) {
				const defSplint = ORDER_804N_DICTIONARY.PeriodontalSplinting!;
				const matchSplint = matchCatalogService(
					catalog,
					"periodontics",
					defSplint.keywords,
					defSplint.defaultPriceRub,
					defSplint.code,
				);
				const spUnit = matchSplint.priceRub;
				const spDisc =
					validDiscountPct > 0 ? Math.round((spUnit * validDiscountPct) / 100) : 0;

				stage1Items.push({
					id: `splint-${num}`,
					toothNumber: num,
					code804n: defSplint.code,
					name: matchSplint.title || `Зуб ${num}: ${defSplint.title}`,
					category: "Пародонтология",
					unitPriceRub: spUnit,
					priceRub: spUnit - spDisc,
					discountRub: spDisc,
					quantity: 1,
					phase: 1,
					stageKind: "stage_1_therapy",
					isAuto: true,
					priceId: matchSplint.priceId,
					fromCatalog: matchSplint.fromCatalog,
					materials: defSplint.materialsDefault,
					clinicalRationale: "Иммобилизация подвижного зуба в единый стабилизирующий блок",
				});
			}
		}

		if (state === "Healthy" || state === "Filled") continue;

		// ----------------------------------------------------
		// 1. ДЕТСКИЙ ПРИКУС (Временные зубы 51..85)
		// ----------------------------------------------------
		if (isDeciduous) {
			if (state === "Caries") {
				const def = ORDER_804N_DICTIONARY.PediatricCariesTherapy!;
				const match = matchCatalogService(
					catalog,
					"pediatric",
					def.keywords,
					def.defaultPriceRub,
					def.code,
				);
				const unitPrice = match.priceRub;
				const discountRub =
					validDiscountPct > 0 ? Math.round((unitPrice * validDiscountPct) / 100) : 0;

				stage1Items.push({
					id: `ped-caries-${num}`,
					toothNumber: num,
					code804n: def.code,
					name: match.title || `Временный зуб ${num}: ${def.title}`,
					category: "Детская терапия",
					unitPriceRub: unitPrice,
					priceRub: Math.max(0, unitPrice - discountRub),
					discountRub: discountRub,
					quantity: 1,
					phase: 1,
					stageKind: "stage_1_therapy",
					isAuto: true,
					priceId: match.priceId,
					fromCatalog: match.fromCatalog,
					materials: def.materialsDefault,
					clinicalRationale: "Устранение кариозного дефекта молочного зуба и защита зачатка постоянного",
				});
			} else if (state === "Pulpitis") {
				const def = ORDER_804N_DICTIONARY.PediatricPulpitisPulpotomy!;
				const match = matchCatalogService(
					catalog,
					"pediatric",
					def.keywords,
					def.defaultPriceRub,
					def.code,
				);
				const unitPrice = match.priceRub;
				const discountRub =
					validDiscountPct > 0 ? Math.round((unitPrice * validDiscountPct) / 100) : 0;

				stage1Items.push({
					id: `ped-pulpotomy-${num}`,
					toothNumber: num,
					code804n: def.code,
					name: match.title || `Временный зуб ${num}: ${def.title}`,
					category: "Детская терапия",
					unitPriceRub: unitPrice,
					priceRub: Math.max(0, unitPrice - discountRub),
					discountRub: discountRub,
					quantity: 1,
					phase: 1,
					stageKind: "stage_1_therapy",
					isAuto: true,
					priceId: match.priceId,
					fromCatalog: match.fromCatalog,
					materials: def.materialsDefault,
					clinicalRationale: "Витальная пульпотомия с биоактивной герметизацией корневых устьев",
				});

				// Для временного моляра после пульпотомии добавляем стандартную стальную коронку SSC в Этап 3
				const defSsc = ORDER_804N_DICTIONARY.PediatricCrownSSC!;
				const matchSsc = matchCatalogService(
					catalog,
					"pediatric",
					defSsc.keywords,
					defSsc.defaultPriceRub,
					defSsc.code,
				);
				const sscUnit = matchSsc.priceRub;
				const sscDisc =
					validDiscountPct > 0 ? Math.round((sscUnit * validDiscountPct) / 100) : 0;

				stage3Items.push({
					id: `ped-ssc-${num}`,
					toothNumber: num,
					code804n: defSsc.code,
					name: matchSsc.title || `Временный зуб ${num}: ${defSsc.title}`,
					category: "Детская ортопедия",
					unitPriceRub: sscUnit,
					priceRub: Math.max(0, sscUnit - sscDisc),
					discountRub: sscDisc,
					quantity: 1,
					phase: 3,
					stageKind: "stage_3_orthopedics",
					isAuto: true,
					priceId: matchSsc.priceId,
					fromCatalog: matchSsc.fromCatalog,
					materials: defSsc.materialsDefault,
					clinicalRationale: "Предотвращение повторного скола и сохранение высоты прикуса до смены",
				});
			} else if (state === "Missing" || state === "Periodontitis") {
				// Удаление молочного зуба в этап хирургии (без имплантации)
				const defExtract = ORDER_804N_DICTIONARY.PediatricExtraction!;
				const matchExtract = matchCatalogService(
					catalog,
					"pediatric_surgery",
					defExtract.keywords,
					defExtract.defaultPriceRub,
					defExtract.code,
				);
				const unitPrice = matchExtract.priceRub;
				const discountRub =
					validDiscountPct > 0 ? Math.round((unitPrice * validDiscountPct) / 100) : 0;

				stage2Items.push({
					id: `ped-extract-${num}`,
					toothNumber: num,
					code804n: defExtract.code,
					name: matchExtract.title || `Временный зуб ${num}: ${defExtract.title}`,
					category: "Детская хирургия",
					unitPriceRub: unitPrice,
					priceRub: Math.max(0, unitPrice - discountRub),
					discountRub: discountRub,
					quantity: 1,
					phase: 2,
					stageKind: "stage_2_surgery",
					isAuto: true,
					priceId: matchExtract.priceId,
					fromCatalog: matchExtract.fromCatalog,
					materials: defExtract.materialsDefault,
					clinicalRationale: "Физиологическая смена или санация очага инфекции временного зуба",
				});
			}
			continue;
		}

		// ----------------------------------------------------
		// 2. ВЗРОСЛЫЙ ПРИКУС (Постоянные зубы 11..48)
		// ----------------------------------------------------
		if (state === "Caries") {
			const def = ORDER_804N_DICTIONARY.CariesTherapy!;
			const match = matchCatalogService(
				catalog,
				"therapy",
				def.keywords,
				def.defaultPriceRub,
				def.code,
			);
			const unitPrice = match.priceRub;
			const discountRub =
				validDiscountPct > 0 ? Math.round((unitPrice * validDiscountPct) / 100) : 0;
			const finalPrice = Math.max(0, unitPrice - discountRub);

			stage1Items.push({
				id: `caries-${num}`,
				toothNumber: num,
				code804n: def.code,
				name: match.title || `Зуб ${num}: ${def.title}`,
				category: "Терапия",
				unitPriceRub: unitPrice,
				priceRub: finalPrice,
				discountRub: discountRub,
				quantity: 1,
				phase: 1,
				stageKind: "stage_1_therapy",
				isAuto: true,
				priceId: match.priceId,
				fromCatalog: match.fromCatalog,
				materials: def.materialsDefault,
				clinicalRationale: "Устранение очага кариозного распада, восстановление контактного пункта",
			});
		} else if (state === "Pulpitis") {
			const clinicalCanals =
				tooth.clinicalData &&
				typeof tooth.clinicalData === "object" &&
				"canals" in tooth.clinicalData &&
				Array.isArray((tooth.clinicalData as { canals?: unknown[] }).canals)
					? (tooth.clinicalData as { canals?: unknown[] }).canals?.length
					: undefined;

			const canalsCount = getAnatomicalRootCanalCount(num, clinicalCanals);
			const obtProc = getEndoObturationProcedure(canalsCount);
			const def = obtProc;
			const match = matchCatalogService(
				catalog,
				"therapy",
				def.keywords,
				def.defaultPriceRub,
				def.code,
			);
			const unitPrice = match.priceRub;
			const discountRub =
				validDiscountPct > 0 ? Math.round((unitPrice * validDiscountPct) / 100) : 0;
			const finalPrice = Math.max(0, unitPrice - discountRub);

			stage1Items.push({
				id: `pulpitis-${num}`,
				toothNumber: num,
				code804n: def.code,
				name: match.title || `Зуб ${num}: ${def.title}`,
				category: "Эндодонтия",
				unitPriceRub: unitPrice,
				priceRub: finalPrice,
				discountRub: discountRub,
				quantity: 1,
				phase: 1,
				stageKind: "stage_1_therapy",
				isAuto: true,
				priceId: match.priceId,
				fromCatalog: match.fromCatalog,
				materials: def.materialsDefault,
				clinicalRationale: "Купирование пульпарной боли, трехмерная обтурация каналов",
			});
		} else if (state === "Periodontitis") {
			const def = ORDER_804N_DICTIONARY.PeriodontitisTherapy!;
			const match = matchCatalogService(
				catalog,
				"therapy",
				def.keywords,
				def.defaultPriceRub,
				def.code,
			);
			const unitPrice = match.priceRub;
			const discountRub =
				validDiscountPct > 0 ? Math.round((unitPrice * validDiscountPct) / 100) : 0;
			const finalPrice = Math.max(0, unitPrice - discountRub);

			stage1Items.push({
				id: `perio-${num}`,
				toothNumber: num,
				code804n: def.code,
				name: match.title || `Зуб ${num}: ${def.title}`,
				category: "Эндодонтия",
				unitPriceRub: unitPrice,
				priceRub: finalPrice,
				discountRub: discountRub,
				quantity: 1,
				phase: 1,
				stageKind: "stage_1_therapy",
				isAuto: true,
				priceId: match.priceId,
				fromCatalog: match.fromCatalog,
				materials: def.materialsDefault,
				clinicalRationale: "Ликвидация апикального периапикального воспаления",
			});
		} else if (state === "Missing" || state === "Planned_Implant") {
			// Хирургический этап: Удаление корня (если Missing) + Костная пластика (при атрофии) + Навигационный шаблон + Имплантация
			const defGuide = ORDER_804N_DICTIONARY.SurgicalNavigationGuide!;
			const defImplant = ORDER_804N_DICTIONARY.DentalImplantation!;

			const matchGuide = matchCatalogService(
				catalog,
				"surgery",
				defGuide.keywords,
				defGuide.defaultPriceRub,
				defGuide.code,
			);
			const matchImplant = matchCatalogService(
				catalog,
				"surgery",
				defImplant.keywords,
				defImplant.defaultPriceRub,
				defImplant.code,
			);

			if (state === "Missing") {
				const defExtract = ORDER_804N_DICTIONARY.SimpleExtraction!;
				const matchExtract = matchCatalogService(
					catalog,
					"surgery",
					defExtract.keywords,
					defExtract.defaultPriceRub,
					defExtract.code,
				);
				const extUnit = matchExtract.priceRub;
				const extDisc =
					validDiscountPct > 0 ? Math.round((extUnit * validDiscountPct) / 100) : 0;

				stage2Items.push({
					id: `extract-${num}`,
					toothNumber: num,
					code804n: defExtract.code,
					name: matchExtract.title || `Зуб ${num}: ${defExtract.title}`,
					category: "Хирургия",
					unitPriceRub: extUnit,
					priceRub: extUnit - extDisc,
					discountRub: extDisc,
					quantity: 1,
					phase: 2,
					stageKind: "stage_2_surgery",
					isAuto: true,
					priceId: matchExtract.priceId,
					fromCatalog: matchExtract.fromCatalog,
					materials: defExtract.materialsDefault,
					clinicalRationale: "Санация разрушенного зуба, подготовка костного ложа к имплантации",
				});
			}

			// Если отмечена атрофия кости (boneLossLevel > 0) — добавляем костную пластику / синус-лифтинг (A16.07.041)
			if (tooth.boneLossLevel && tooth.boneLossLevel > 0) {
				const defGraft = ORDER_804N_DICTIONARY.BoneGraftingSinusLift!;
				const matchGraft = matchCatalogService(
					catalog,
					"surgery",
					defGraft.keywords,
					defGraft.defaultPriceRub,
					defGraft.code,
				);
				const graftUnit = matchGraft.priceRub;
				const graftDisc =
					validDiscountPct > 0 ? Math.round((graftUnit * validDiscountPct) / 100) : 0;

				stage2Items.push({
					id: `graft-${num}`,
					toothNumber: num,
					code804n: defGraft.code,
					name: matchGraft.title || `Зуб ${num}: ${defGraft.title}`,
					category: "Хирургия",
					unitPriceRub: graftUnit,
					priceRub: graftUnit - graftDisc,
					discountRub: graftDisc,
					quantity: 1,
					phase: 2,
					stageKind: "stage_2_surgery",
					isAuto: true,
					priceId: matchGraft.priceId,
					fromCatalog: matchGraft.fromCatalog,
					materials: defGraft.materialsDefault,
					clinicalRationale: "Восстановление ширины и высоты альвеолярного гребня материалом Bio-Oss",
				});
			}

			const guideUnit = matchGuide.priceRub;
			const guideDisc =
				validDiscountPct > 0 ? Math.round((guideUnit * validDiscountPct) / 100) : 0;
			stage2Items.push({
				id: `guide-${num}`,
				toothNumber: num,
				code804n: defGuide.code,
				name: matchGuide.title || `Зуб ${num}: ${defGuide.title}`,
				category: "Хирургия",
				unitPriceRub: guideUnit,
				priceRub: guideUnit - guideDisc,
				discountRub: guideDisc,
				quantity: 1,
				phase: 2,
				stageKind: "stage_2_surgery",
				isAuto: true,
				priceId: matchGuide.priceId,
				fromCatalog: matchGuide.fromCatalog,
				materials: defGuide.materialsDefault,
				clinicalRationale: "Прецизионное позиционирование имплантата по данным КТ",
			});

			const impUnit = matchImplant.priceRub;
			const impDisc =
				validDiscountPct > 0 ? Math.round((impUnit * validDiscountPct) / 100) : 0;
			stage2Items.push({
				id: `implant-${num}`,
				toothNumber: num,
				code804n: defImplant.code,
				name: matchImplant.title || `Зуб ${num}: ${defImplant.title}`,
				category: "Хирургия",
				unitPriceRub: impUnit,
				priceRub: impUnit - impDisc,
				discountRub: impDisc,
				quantity: 1,
				phase: 2,
				stageKind: "stage_2_surgery",
				isAuto: true,
				priceId: matchImplant.priceId,
				fromCatalog: matchImplant.fromCatalog,
				materials: defImplant.materialsDefault,
				clinicalRationale: "Восстановление утраченной жевательной опоры внутрикостным имплантатом",
			});

			// Ортопедический этап на имплантате (A16.07.006)
			const defImpCrown = ORDER_804N_DICTIONARY.ImplantCrownProsthetics!;
			const matchImpCrown = matchCatalogService(
				catalog,
				"prosthetics",
				defImpCrown.keywords,
				defImpCrown.defaultPriceRub,
				defImpCrown.code,
			);
			const crownUnit = matchImpCrown.priceRub;
			const crownDisc =
				validDiscountPct > 0 ? Math.round((crownUnit * validDiscountPct) / 100) : 0;

			stage3Items.push({
				id: `implant-crown-${num}`,
				toothNumber: num,
				code804n: defImpCrown.code,
				name: matchImpCrown.title || `Зуб ${num}: ${defImpCrown.title}`,
				category: "Ортопедия",
				unitPriceRub: crownUnit,
				priceRub: crownUnit - crownDisc,
				discountRub: crownDisc,
				quantity: 1,
				phase: 3,
				stageKind: "stage_3_orthopedics",
				isAuto: true,
				priceId: matchImpCrown.priceId,
				fromCatalog: matchImpCrown.fromCatalog,
				materials: defImpCrown.materialsDefault,
				clinicalRationale: "Финишная эстетическая и функциональная реставрация на имплантате с винтовой фиксацией",
			});
		} else if (state === "Crown") {
			const defCrown = ORDER_804N_DICTIONARY.CrownZirconia!;
			const matchCrown = matchCatalogService(
				catalog,
				"prosthetics",
				defCrown.keywords,
				defCrown.defaultPriceRub,
				defCrown.code,
			);
			const crUnit = matchCrown.priceRub;
			const crDisc =
				validDiscountPct > 0 ? Math.round((crUnit * validDiscountPct) / 100) : 0;

			stage3Items.push({
				id: `crown-${num}`,
				toothNumber: num,
				code804n: defCrown.code,
				name: matchCrown.title || `Зуб ${num}: ${defCrown.title}`,
				category: "Ортопедия",
				unitPriceRub: crUnit,
				priceRub: crUnit - crDisc,
				discountRub: crDisc,
				quantity: 1,
				phase: 3,
				stageKind: "stage_3_orthopedics",
				isAuto: true,
				priceId: matchCrown.priceId,
				fromCatalog: matchCrown.fromCatalog,
				materials: defCrown.materialsDefault,
				clinicalRationale: "Анатомическое укрепление депульпированного зуба коронкой из диоксида циркония",
			});
		}
	}

	// Если есть любые манипуляции — добавляем КЛКТ диагностику и комплексную гигиену в начало Этапа 1
	if (stage1Items.length > 0 || stage2Items.length > 0 || stage3Items.length > 0) {
		const defDiag = ORDER_804N_DICTIONARY.DiagnosticsCT!;
		const matchDiag = matchCatalogService(
			catalog,
			"diagnostics",
			defDiag.keywords,
			defDiag.defaultPriceRub,
			defDiag.code,
		);
		const diagUnit = matchDiag.priceRub;
		const diagDisc =
			validDiscountPct > 0 ? Math.round((diagUnit * validDiscountPct) / 100) : 0;

		const defHyg = ORDER_804N_DICTIONARY.HygieneComplex!;
		const matchHyg = matchCatalogService(
			catalog,
			"hygiene",
			defHyg.keywords,
			defHyg.defaultPriceRub,
			defHyg.code,
		);
		const hygUnit = matchHyg.priceRub;
		const hygDisc =
			validDiscountPct > 0 ? Math.round((hygUnit * validDiscountPct) / 100) : 0;

		stage1Items.unshift(
			{
				id: "stage1-hygiene",
				code804n: defHyg.code,
				name: matchHyg.title || defHyg.title,
				category: "Гигиена",
				unitPriceRub: hygUnit,
				priceRub: hygUnit - hygDisc,
				discountRub: hygDisc,
				quantity: 1,
				phase: 1,
				stageKind: "stage_1_therapy",
				isAuto: true,
				priceId: matchHyg.priceId,
				fromCatalog: matchHyg.fromCatalog,
				materials: defHyg.materialsDefault,
				clinicalRationale: "Снятие биопленки и наддесневого камня перед вмешательствами",
			},
			{
				id: "stage1-ct",
				code804n: defDiag.code,
				name: matchDiag.title || defDiag.title,
				category: "Диагностика",
				unitPriceRub: diagUnit,
				priceRub: diagUnit - diagDisc,
				discountRub: diagDisc,
				quantity: 1,
				phase: 1,
				stageKind: "stage_1_therapy",
				isAuto: true,
				priceId: matchDiag.priceId,
				fromCatalog: matchDiag.fromCatalog,
				materials: defDiag.materialsDefault,
				clinicalRationale: "3D-контроль анатомии корней и плотности альвеолярной кости",
			},
		);
	}

	// Формируем 3 структуры этапов
	const buildStage = (
		num: number,
		kind: TreatmentPlanStageKind,
		title: string,
		subtitle: string,
		goal: string,
		items: TreatmentPlanItem[],
	): TreatmentPlanStage => {
		const totalKopecksList = items.map((i) => parseKopecks(i.priceRub));
		const totalKopecks = sumKopecks(totalKopecksList);
		const totalRub = Math.round(totalKopecks / 100);
		const visits = items.length === 0 ? 0 : Math.max(1, Math.ceil(items.length / 2));
		const weeks = items.length === 0 ? 0 : num === 2 ? 8 : num === 3 ? 3 : visits * 1;
		const codes = [...new Set(items.map((i) => i.code804n))];

		return {
			stageNumber: num,
			stageKind: kind,
			title,
			subtitle,
			clinicalGoal: goal,
			items,
			totalRub,
			totalKopecks,
			estimatedVisits: visits,
			estimatedWeeks: weeks,
			order804nCodes: codes,
		};
	};

	const s1 = buildStage(
		1,
		"stage_1_therapy",
		"Этап 1: Неотложная помощь, терапия и пародонтология",
		"Купирование боли, лечение кариеса, пульпита, пародонтита SRP и профгигиена",
		"Полная ликвидация очагов инфекции и воспаления в полости рта",
		stage1Items,
	);

	const s2 = buildStage(
		2,
		"stage_2_surgery",
		"Этап 2: Хирургический этап",
		"Атравматичное удаление, костная пластика, синус-лифтинг и дентальная имплантация",
		"Восстановление объема костной ткани и интеграция титановых опор",
		stage2Items,
	);

	const s3 = buildStage(
		3,
		"stage_3_orthopedics",
		"Этап 3: Ортопедический этап",
		"Коронки E.max / диоксид циркония, мостовидные протезы, протезирование на имплантатах",
		"Полное анатомическое и эстетическое восстановление прикуса и улыбки",
		stage3Items,
	);

	return [s1, s2, s3];
}

/**
 * Точный копеечный расчет рассрочки 0% без переплат на 3, 6, 12 и 24 месяца.
 * Использует splitKopecks для равномерного распределения копеек без потерь и погрешностей.
 */
export function computeTierInstallments(
	totalKopecks: Kopecks,
): Record<3 | 6 | 12 | 24, TierInstallmentPlan> {
	const build = (months: 3 | 6 | 12 | 24): TierInstallmentPlan => {
		if (totalKopecks <= 0) {
			return {
				months,
				monthlyPaymentKopecks: 0 as Kopecks,
				monthlyPaymentRub: 0,
				partsKopecks: Array(months).fill(0 as Kopecks),
				remainderKopecks: 0 as Kopecks,
			};
		}
		const parts = splitKopecks(totalKopecks, months);
		const monthlyPaymentKopecks = (parts[0] ?? 0) as Kopecks;
		const monthlyPaymentRub = Math.round(monthlyPaymentKopecks / 100);
		const remainderKopecks = ((parts[parts.length - 1] ?? 0) - monthlyPaymentKopecks) as Kopecks;
		return {
			months,
			monthlyPaymentKopecks,
			monthlyPaymentRub,
			partsKopecks: parts,
			remainderKopecks,
		};
	};

	return {
		3: build(3),
		6: build(6),
		12: build(12),
		24: build(24),
	};
}

/**
 * Расчёт возврата 13% НДФЛ по НК РФ (Справка об оплате медицинских услуг).
 * Код 01 — обычное лечение (лимит налоговой базы 150 000 ₽, возврат до 19 500 ₽).
 * Код 02 — дорогостоящее лечение (имплантация/костная пластика, возврат 13% от всей суммы).
 */
export function calculateNdflDeduction(
	totalKopecks: Kopecks,
	isHighCostCode02: boolean = true,
): NdflDeductionResult {
	const code = isHighCostCode02 ? "02" : "01";
	const codeDescription = isHighCostCode02
		? "Код 02 — Дорогостоящее лечение (имплантация, костная пластика, синус-лифтинг) — налоговый вычет 13% со всей суммы без ограничений"
		: "Код 01 — Обычное медицинское лечение (терапия, гигиена, ортопедия) — налоговый вычет 13% с лимитом налоговой базы 150 000 ₽ (макс. возврат 19 500 ₽)";

	if (totalKopecks <= 0) {
		return {
			code,
			codeDescription,
			isHighCostCode02,
			baseKopecks: 0 as Kopecks,
			refundKopecks: 0 as Kopecks,
			refundRub: 0,
			finalPriceWithRefundRub: 0,
			annualLimitRub: isHighCostCode02 ? undefined : 150000,
		};
	}

	let refundKopecks: Kopecks;
	let baseKopecks: Kopecks;
	if (isHighCostCode02) {
		baseKopecks = totalKopecks;
		refundKopecks = percentageOfKopecks(totalKopecks, 1300); // 13.00%
	} else {
		const cap = parseKopecks(150000);
		baseKopecks = Math.min(totalKopecks, cap) as Kopecks;
		refundKopecks = percentageOfKopecks(baseKopecks, 1300);
	}

	const refundRub = Math.round(refundKopecks / 100);
	const totalRub = Math.round(totalKopecks / 100);
	const finalPriceWithRefundRub = Math.max(0, totalRub - refundRub);

	return {
		code,
		codeDescription,
		isHighCostCode02,
		baseKopecks,
		refundKopecks,
		refundRub,
		finalPriceWithRefundRub,
		annualLimitRub: isHighCostCode02 ? undefined : 150000,
	};
}

/**
 * Расчет списания бонусных баллов / депозита пациента с учетом копеечной точности.
 */
export function calculateLoyaltyBonusDeduction(
	grossKopecks: Kopecks,
	discountPercent: number,
	availablePatientBalanceRub: number,
	requestedBonusToSpendRub: number = 0,
): LoyaltyBonusDeduction {
	const validDiscountPct = Math.max(0, Math.min(100, discountPercent));
	const discountKopecks =
		validDiscountPct > 0
			? percentageOfKopecks(grossKopecks, validDiscountPct * 100)
			: (0 as Kopecks);

	const afterDiscountKopecks = Math.max(0, grossKopecks - discountKopecks) as Kopecks;
	const afterDiscountRub = Math.round(afterDiscountKopecks / 100);

	const maxSpendableBonusRub = Math.max(
		0,
		Math.min(availablePatientBalanceRub, afterDiscountRub),
	);
	const appliedBonusRub = Math.max(
		0,
		Math.min(requestedBonusToSpendRub, maxSpendableBonusRub),
	);
	const appliedBonusKopecks = parseKopecks(appliedBonusRub);

	const netPayableKopecks = Math.max(
		0,
		afterDiscountKopecks - appliedBonusKopecks,
	) as Kopecks;
	const netPayableRub = Math.round(netPayableKopecks / 100);

	return {
		availableBalanceRub: availablePatientBalanceRub,
		appliedBonusRub,
		appliedBonusKopecks,
		grossKopecks,
		discountKopecks,
		netPayableKopecks,
		netPayableRub,
	};
}

/**
 * Генерация 3 сопоставимых вариантов плана лечения (Эконом, Стандарт, Оптимальный)
 * для side-by-side презентации пациенту.
 */
export function generate3TierPlanComparison(
	teeth: readonly ToothData[],
	catalog?: readonly CatalogServiceLookupItem[],
	customDiscountPercent: number = 0,
): TreatmentPlanTier[] {
	const stages = generateTreatmentPlanStages(teeth, catalog, customDiscountPercent);

	const baseKopecks = sumKopecks(stages.map((s) => s.totalKopecks));
	const baseTotalRub = Math.round(baseKopecks / 100);

	// ==========================================
	// 1. ВАРИАНТ 1: ЭКОНОМ (Базовый минимум)
	// ==========================================
	// Эконом использует базовые пломбы и металлокерамику (коэфф ~0.75 от базовой стоимости)
	const economyKopecks = percentageOfKopecks(baseKopecks, 7500);
	const economyTotalRub = Math.max(baseTotalRub > 0 ? 9500 : 0, Math.round(economyKopecks / 100));
	const econNdfl = calculateNdflDeduction(economyKopecks, false);
	const econInstallments = computeTierInstallments(economyKopecks);

	const economyTier: TreatmentPlanTier = {
		tierId: "economy",
		title: "Эконом (Базовый)",
		subtitle: "Неотложная помощь, купирование боли и базовая функциональность",
		badge: "Эконом",
		badgeClass: "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700",
		borderClass: "border-[var(--line,#cbd5e1)] dark:border-zinc-800 hover:border-slate-400",
		isRecommended: false,
		totalRub: economyTotalRub,
		totalKopecks: economyKopecks,
		durationWeeks: 4,
		durationVisits: 3,
		warrantyYears: 1,
		materialsHeadline: "Светоотверждаемые нанокомпозиты, стандартные металлокерамические коронки",
		materialsList: [
			"Пломбировочные фотополимеры Gradia / Charisma",
			"Стандартная механическая обработка каналов K-файлами",
			"Металлокерамические коронки и мостовидные протезы",
			"Ультразвуковое снятие наддесневого камня",
			"Гарантия клиники 1 год",
		],
		keyAdvantages: [
			"Минимальная стоимость старта лечения",
			"Быстрое устранение очагов острой боли и инфекции",
			"Возможность поэтапной оплаты за каждый визит",
		],
		stages,
		itemsCount: stages.reduce((acc, s) => acc + s.items.length, 0),
		ndflRefundRub: econNdfl.refundRub,
		priceWithNdflRefundRub: econNdfl.finalPriceWithRefundRub,
		monthlyInstallment12Rub: econInstallments[12].monthlyPaymentRub,
		installments: econInstallments,
		ndflDetails: econNdfl,
	};

	// ==========================================
	// 2. ВАРИАНТ 2: СТАНДАРТ (Сбалансированная реабилитация)
	// ==========================================
	// Стандарт = 100% расчет по прайсу клиники с современными протоколами
	const standardKopecks = baseKopecks;
	const standardTotalRub = baseTotalRub;
	const stdNdfl = calculateNdflDeduction(standardKopecks, true);
	const stdInstallments = computeTierInstallments(standardKopecks);

	const standardTier: TreatmentPlanTier = {
		tierId: "standard",
		title: "Стандарт (Оптимальный выбор)",
		subtitle: "Комплексная реабилитация: нанокомпозиты Estelite, имплантаты Osstem и диоксид циркония",
		badge: "Популярный выбор",
		badgeClass: "bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-200 border-blue-300 dark:border-blue-800",
		borderClass: "border-blue-500/50 hover:border-blue-500 dark:border-blue-700/60 shadow-md",
		isRecommended: false,
		totalRub: standardTotalRub,
		totalKopecks: standardKopecks,
		durationWeeks: 8,
		durationVisits: 5,
		warrantyYears: 2,
		materialsHeadline: "Нанокомпозиты Estelite Asteria, корейские имплантаты Osstem, коронки из диоксида циркония",
		materialsList: [
			"Японские наногибридные композиты Estelite Asteria / Filtek Ultimate",
			"Дентальные имплантаты Osstem TS-III / Dentium SuperLine (SLA)",
			"Безметалловые коронки из монолитного диоксида циркония Prettau",
			"Комплексная гигиена Air-Flow с глициновым порошком",
			"Гарантия клиники 2 года",
		],
		keyAdvantages: [
			"Идеальный баланс долговечности, эстетики и стоимости",
			"Безметалловые биосовместимые циркониевые конструкции",
			"Надежная остеоинтеграция имплантатов 98.8%",
		],
		stages,
		itemsCount: stages.reduce((acc, s) => acc + s.items.length, 0),
		ndflRefundRub: stdNdfl.refundRub,
		priceWithNdflRefundRub: stdNdfl.finalPriceWithRefundRub,
		monthlyInstallment12Rub: stdInstallments[12].monthlyPaymentRub,
		installments: stdInstallments,
		ndflDetails: stdNdfl,
	};

	// ==========================================
	// 3. ВАРИАНТ 3: ОПТИМАЛЬНЫЙ / ПРЕМИУМ (Выбор главного врача)
	// ==========================================
	// Оптимальный включает микроскопное лечение, Straumann Roxolid, E.max керамику, 3D-шаблон (~1.35x)
	const optimumKopecks = percentageOfKopecks(baseKopecks, 13500);
	const optimumTotalRub = Math.round(optimumKopecks / 100);
	const optNdfl = calculateNdflDeduction(optimumKopecks, true);
	const optInstallments = computeTierInstallments(optimumKopecks);

	const optimumTier: TreatmentPlanTier = {
		tierId: "optimum",
		title: "Оптимальный (Премиум Реконструкция)",
		subtitle: "Лечение под микроскопом, швейцарские имплантаты Straumann SLActive, керамика E.max и 3D-навигация",
		badge: "Выбор главного врача",
		badgeClass: "bg-emerald-100 dark:bg-emerald-950 text-emerald-900 dark:text-emerald-200 border-emerald-400/60 font-bold",
		borderClass: "border-emerald-500 ring-2 ring-emerald-500/20 shadow-xl shadow-emerald-500/10",
		isRecommended: true,
		totalRub: optimumTotalRub,
		totalKopecks: optimumKopecks,
		durationWeeks: 10,
		durationVisits: 6,
		warrantyYears: "5 лет / Пожизненная на имплантаты",
		materialsHeadline: "Швейцарские имплантаты Straumann Roxolid SLActive, керамика IPS e.max Press, микроскоп Leica",
		materialsList: [
			"Лечение каналов и реставрации под дентальным микроскопом Carl Zeiss / Leica",
			"Швейцарские гидрофильные имплантаты Straumann Roxolid SLActive",
			"Высокоэстетичная прессованная керамика IPS e.max Press / Katana UTML",
			"3D навигационный хирургический шаблон виртуального позиционирования",
			"DSD (Digital Smile Design) 3D-моделирование будущей улыбки",
			"Пожизненная международная гарантия производителя на имплантаты",
		],
		keyAdvantages: [
			"Максимальная надежность и сохранение собственных тканей под микроскопом",
			"Ускоренное приживление имплантатов за 3-4 недели (SLActive технология)",
			"Безупречная эстетика натурального зуба с естественной прозрачностью",
			"Персональный медицинский консьерж и VIP сопровождение",
		],
		stages,
		itemsCount: stages.reduce((acc, s) => acc + s.items.length, 0),
		ndflRefundRub: optNdfl.refundRub,
		priceWithNdflRefundRub: optNdfl.finalPriceWithRefundRub,
		monthlyInstallment12Rub: optInstallments[12].monthlyPaymentRub,
		installments: optInstallments,
		ndflDetails: optNdfl,
	};

	return [economyTier, standardTier, optimumTier];
}
