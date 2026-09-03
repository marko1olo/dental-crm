/**
 * treatmentPlanStagesEngine.ts — чистый клинико-финансовый движок планов лечения DENTE CRM.
 *
 * Выполняет:
 * 1. 1-Click генерацию 3 клинических этапов по одонтограмме с номенклатурой Приказа Минздрава РФ № 804н:
 *    - Этап 1: Неотложная терапия и санация (кариес, эндодонтия по числу каналов, коффердам, билдап, пародонтология SRP A16.07.051, профгигиена A16.07.050, детская терапия, КЛКТ A06.07.004).
 *    - Этап 2: Хирургический этап (удаление корней A16.07.001, костная пластика A16.07.041, навигационный шаблон A16.07.054, дентальная имплантация A16.07.054.001, All-on-4/6, мультиюниты; фиксация интервала остеоинтеграции 3–6 месяцев).
 *    - Этап 3: Ортопедический этап (интраоральное 3D-сканирование A02.07.010, временные коронки CAD/CAM PMMA, коронки E.max / диоксид циркония A16.07.004.001, мостовидные протезы на 2 имплантатах при 3 дефектах подряд, протезирование на имплантатах A16.07.006, балочные конструкции All-on-4/6 A16.07.035).
 * 2. Генерацию 3 вариантов плана лечения («Эконом», «Стандарт», «Оптимальный») для презентации пациенту.
 * 3. Отвязку от хардкода цен: в PROD-режиме ненайденные услуги получают priceRub: 0, unitPriceRub: 0, isDraft: true, requiresManualPricing: true. В DEMO-режиме (IS_DEMO_SHOWCASE) используются демонстрационные справочные цены.
 * 4. Клинический паттерн-матчинг:
 *    - 1 отсутствующий зуб: 1 имплантат + коронка (или мост 3 ед. в Эконом).
 *    - 3 отсутствующих зуба подряд: 2 имплантата на крайние позиции + мостовидный протез 3 ед. (промежуточная часть), а не 3 имплантата.
 *    - Тотальная/субтотальная адентия (> 10 отсутствующих зубов на челюсти): протокол All-on-4 / All-on-6 (шаблон + 4/6 имплантатов + мультиюниты + несъемный армированный протез).
 *    - Депульпированные моляры/премоляры: коффердам (1 шт) + обработка N каналов + обтурация N каналов + билдап под коронку + коронка в Этап 3 (вместо световой пломбы в Стандарт/Оптимум).
 * 5. Расчёт 13% налогового вычета НДФЛ (Код 01 / Код 02) и рассрочки 0% (3, 6, 12, 24 мес.) в копейках.
 */

import {
	type Kopecks,
	parseKopecks,
	percentageOfKopecks,
	splitKopecks,
	calculatePlanTaxDeductionBreakdown,
	calculateStaged304030Schedule,
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
	readonly code?: string;
	readonly order804nCode?: string;
}

export interface MatchCatalogServiceResult {
	readonly priceRub: number;
	readonly unitPriceRub: number;
	readonly title: string;
	readonly priceId: string | null;
	readonly fromCatalog: boolean;
	readonly isDraft: boolean;
	readonly requiresManualPricing: boolean;
}

/**
 * Глобальный переключатель демонстрационного режима для презентаций / пресетов.
 */
let _demoShowcaseOverride: boolean | null = null;

export function setDemoShowcaseMode(enabled: boolean | null): void {
	_demoShowcaseOverride = enabled;
}

export function isDemoShowcaseMode(explicitOverride?: boolean): boolean {
	if (typeof explicitOverride === "boolean") return explicitOverride;
	if (typeof _demoShowcaseOverride === "boolean") return _demoShowcaseOverride;

	if (typeof process !== "undefined" && process.env) {
		if (process.env.IS_DEMO_SHOWCASE === "true" || process.env.VITE_DEMO_SHOWCASE === "true") {
			return true;
		}
	}
	if (typeof import.meta !== "undefined" && (import.meta as unknown as { env?: Record<string, string> }).env) {
		const env = (import.meta as unknown as { env: Record<string, string> }).env;
		if (
			env.IS_DEMO_SHOWCASE === "true" ||
			env.VITE_DEMO_SHOWCASE === "true" ||
			env.VITE_DEMO_MODE === "true" ||
			env.MODE === "demo"
		) {
			return true;
		}
	}
	return false;
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
 * Извлечение клинического числа каналов из ToothData (учитывает clinicalData.canals).
 */
function extractCanalCount(tooth: ToothData): number {
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
const UPPER_ARCH_TEETH = [18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28] as const;
const LOWER_ARCH_TEETH = [48, 47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37, 38] as const;

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

/**
 * Поиск услуги в прейскуранте клиники по коду 804н или ключевым словам.
 * В PROD-режиме: при отсутствии в каталоге возвращает priceRub: 0, unitPriceRub: 0, isDraft: true, requiresManualPricing: true.
 * В DEMO-режиме: использует демонстрационную цену fallbackPriceRub.
 */
export function matchCatalogService(
	catalog: readonly CatalogServiceLookupItem[] | undefined,
	category: string,
	keywords: readonly string[],
	fallbackPriceRub: number,
	order804nCode?: string,
	options?: { isDemoMode?: boolean },
): MatchCatalogServiceResult {
	const isDemo = isDemoShowcaseMode(options?.isDemoMode);

	if (catalog && catalog.length > 0) {
		const normalizedKeywords = keywords.map((k) => k.toLowerCase().replace(/ё/g, "е"));

		// 1. Точное совпадение по Order 804n коду (если есть в прайсе)
		if (order804nCode) {
			const byCode = catalog.find(
				(s) =>
					s.active !== false &&
					(s.title.includes(order804nCode) ||
						s.order804nCode === order804nCode ||
						s.code === order804nCode),
			);
			if (byCode && typeof byCode.basePriceRub === "number" && byCode.basePriceRub > 0) {
				return {
					priceRub: byCode.basePriceRub,
					unitPriceRub: byCode.basePriceRub,
					title: byCode.title,
					priceId: byCode.id,
					fromCatalog: true,
					isDraft: false,
					requiresManualPricing: false,
				};
			}
		}

		// 2. Сопоставление по ключевым словам и категории
		const matched = catalog.filter((item) => {
			const title = item.title.toLowerCase().replace(/ё/g, "е");
			return normalizedKeywords.some((kw) => title.includes(kw));
		});

		const activeMatch = matched.find((s) => s.active !== false) ?? matched[0];
		if (activeMatch && typeof activeMatch.basePriceRub === "number" && activeMatch.basePriceRub > 0) {
			return {
				priceRub: activeMatch.basePriceRub,
				unitPriceRub: activeMatch.basePriceRub,
				title: activeMatch.title,
				priceId: activeMatch.id,
				fromCatalog: true,
				isDraft: false,
				requiresManualPricing: false,
			};
		}
	}

	// Услуга отсутствует в каталоге или basePriceRub === 0:
	if (isDemo) {
		return {
			priceRub: fallbackPriceRub,
			unitPriceRub: fallbackPriceRub,
			title: "",
			priceId: null,
			fromCatalog: false,
			isDraft: false,
			requiresManualPricing: false,
		};
	}

	// PROD-режим: запрещено подставлять фиксированные дефолтные цены!
	return {
		priceRub: 0,
		unitPriceRub: 0,
		title: "",
		priceId: null,
		fromCatalog: false,
		isDraft: true,
		requiresManualPricing: true,
	};
}

/**
 * Вспомогательная функция для создания позиции плана.
 */
function createPlanItem(
	id: string,
	phase: number,
	stageKind: TreatmentPlanStageKind,
	def: Order804nProcedureDefinition,
	toothNumber: number | undefined,
	catalog: readonly CatalogServiceLookupItem[] | undefined,
	discountPercent: number,
	overrides?: {
		quantity?: number;
		customTitle?: string;
		customPriceRub?: number;
		customMaterials?: string;
		relatedToothNumbers?: readonly number[];
		isDemoMode?: boolean;
		clinicalRationale?: string;
	},
): TreatmentPlanItem {
	const quantity = overrides?.quantity ?? 1;
	const validDiscountPct = Math.max(0, Math.min(100, discountPercent));

	let matched: MatchCatalogServiceResult;
	if (typeof overrides?.customPriceRub === "number") {
		matched = {
			priceRub: overrides.customPriceRub,
			unitPriceRub: overrides.customPriceRub,
			title: overrides.customTitle ?? def.title,
			priceId: null,
			fromCatalog: false,
			isDraft: false,
			requiresManualPricing: false,
		};
	} else {
		matched = matchCatalogService(
			catalog,
			def.category,
			def.keywords,
			def.defaultPriceRub,
			def.code,
			overrides?.isDemoMode !== undefined ? { isDemoMode: overrides.isDemoMode } : undefined,
		);
	}

	const unitPriceRub = matched.priceRub;
	const discountAmountRub =
		validDiscountPct > 0 ? Math.round((unitPriceRub * validDiscountPct) / 100) : 0;
	const finalUnitPriceRub = Math.max(0, unitPriceRub - discountAmountRub);
	const totalPriceRub = finalUnitPriceRub * quantity;

	return {
		id,
		toothNumber,
		relatedToothNumbers: overrides?.relatedToothNumbers,
		code804n: def.code,
		name: overrides?.customTitle || (matched.fromCatalog && matched.title ? matched.title : def.title),
		category: def.category,
		priceRub: totalPriceRub,
		unitPriceRub,
		discountRub: discountAmountRub * quantity,
		quantity,
		phase,
		stageKind,
		isAuto: true,
		priceId: matched.priceId,
		fromCatalog: matched.fromCatalog,
		materials: overrides?.customMaterials || def.materialsDefault,
		clinicalRationale: overrides?.clinicalRationale,
		isDraft: matched.isDraft,
		requiresManualPricing: matched.requiresManualPricing,
	};
}

/**
 * Создание пустого этапа плана.
 */
function makeEmptyStage(
	stageNumber: number,
	stageKind: TreatmentPlanStageKind,
	title: string,
	subtitle: string,
): TreatmentPlanStage {
	return {
		stageNumber,
		stageKind,
		title,
		subtitle,
		clinicalGoal: subtitle,
		items: [],
		totalRub: 0,
		totalKopecks: 0 as Kopecks,
		estimatedVisits: 0,
		estimatedWeeks: 0,
		order804nCodes: [],
	};
}

/**
 * 1-Click генерация комплексных этапов плана лечения на основе одонтограммы.
 * Поддерживает взрослую и детскую одонтограмму, клинический паттерн-матчинг адентии и депульпирования,
 * и строгое соблюдение хронологии с интервалом остеоинтеграции (3-6 месяцев).
 */
export function generateTreatmentPlanStages(
	teeth: readonly ToothData[],
	catalog?: readonly CatalogServiceLookupItem[],
	discountPercent: number = 0,
	options?: { isDemoMode?: boolean },
): [TreatmentPlanStage, TreatmentPlanStage, TreatmentPlanStage] {
	const validDiscountPct = Math.max(0, Math.min(100, discountPercent));
	const isDemo = isDemoShowcaseMode(options?.isDemoMode);

	// Проверка наличия каких-либо патологий: если все зубы Healthy или Filled -> возвращаем пустые этапы!
	const hasPathology = teeth.some((t) => {
		const s = t.state || "Healthy";
		return (
			(s !== "Healthy" && s !== "Filled") ||
			Boolean(t.boneLossLevel && t.boneLossLevel > 0) ||
			Boolean(t.mobility && t.mobility > 0) ||
			Boolean(t.furcationGrade && t.furcationGrade > 0)
		);
	});

	if (!hasPathology) {
		return [
			makeEmptyStage(1, "stage_1_therapy", "Этап 1: Неотложная терапия и санация", "Устранение очагов острой боли, КЛКТ 3D-диагностика, профессиональная гигиена."),
			makeEmptyStage(2, "stage_2_surgery", "Этап 2: Хирургия и имплантация", "Хирургическая санация полости рта."),
			makeEmptyStage(3, "stage_3_orthopedics", "Этап 3: Ортопедическая реабилитация", "Ортопедическое восстановление зубных рядов."),
		];
	}

	const stage1Items: TreatmentPlanItem[] = [];
	const stage2Items: TreatmentPlanItem[] = [];
	const stage3Items: TreatmentPlanItem[] = [];

	let hasPeriodontalNeeds = false;
	let hasImplants = false;

	// 1. Предварительный пародонтологический скрининг
	for (const tooth of teeth) {
		const hasBoneLoss = Boolean(tooth.boneLossLevel && tooth.boneLossLevel > 0);
		const hasMobility = Boolean(tooth.mobility && tooth.mobility > 0);
		const hasFurcation = Boolean(tooth.furcationGrade && tooth.furcationGrade > 0);

		if (hasBoneLoss || hasMobility || hasFurcation) {
			hasPeriodontalNeeds = true;
			const defSrp = ORDER_804N_DICTIONARY.PeriodontalScalingSRP!;
			stage1Items.push(
				createPlanItem(
					"s1-perio-srp-" + tooth.toothNumber,
					1,
					"stage_1_therapy",
					defSrp,
					tooth.toothNumber,
					catalog,
					validDiscountPct,
					{
						customTitle: "Скейлинг и пародонтологическая обработка корня зуба №" + tooth.toothNumber + " (SRP)",
						isDemoMode: isDemo,
					},
				),
			);

			if (hasBoneLoss && (tooth.boneLossLevel ?? 0) >= 2) {
				const defCurettage = ORDER_804N_DICTIONARY.PeriodontalClosedCurettage!;
				stage1Items.push(
					createPlanItem(
						"s1-perio-curettage-" + tooth.toothNumber,
						1,
						"stage_1_therapy",
						defCurettage,
						tooth.toothNumber,
						catalog,
						validDiscountPct,
						{
							customTitle: "Закрытый кюретаж пародонтального кармана зуба №" + tooth.toothNumber,
							isDemoMode: isDemo,
						},
					),
				);
			}

			if (hasMobility && (tooth.mobility ?? 0) >= 2) {
				const defSplint = ORDER_804N_DICTIONARY.PeriodontalSplinting!;
				stage1Items.push(
					createPlanItem(
						"s1-perio-splint-" + tooth.toothNumber,
						1,
						"stage_1_therapy",
						defSplint,
						tooth.toothNumber,
						catalog,
						validDiscountPct,
						{
							customTitle: "Шинирование подвижного зуба №" + tooth.toothNumber + " стекловолоконной лентой",
							isDemoMode: isDemo,
						},
					),
				);
			}
		}
	}

	// 2. Базовая гигиена и 3D КЛКТ диагностика в Этап 1
	const defCT = ORDER_804N_DICTIONARY.DiagnosticsCT!;
	stage1Items.unshift(
		createPlanItem("s1-ct-diag", 1, "stage_1_therapy", defCT, undefined, catalog, validDiscountPct, { isDemoMode: isDemo }),
	);

	const defHygiene = ORDER_804N_DICTIONARY.HygieneComplex!;
	stage1Items.push(
		createPlanItem(
			"s1-hygiene",
			1,
			"stage_1_therapy",
			defHygiene,
			undefined,
			catalog,
			validDiscountPct,
			{
				customTitle: hasPeriodontalNeeds
					? "Комплексная гигиена + пародонтологическая антисептическая обработка (Air-Flow + УЗ)"
					: "Профессиональная гигиена полости рта (Air-Flow + УЗ-скейлинг)",
				isDemoMode: isDemo,
			},
		),
	);

	// 3. Анализ постоянных зубов и паттерн-матчинг
	const missingUpper: number[] = [];
	const missingLower: number[] = [];

	for (const tooth of teeth) {
		const num = tooth.toothNumber;
		const state: ToothState | string = tooth.state || "Healthy";
		const isDeciduous = isDeciduousTooth(num);

		// ==========================================
		// ВРЕМЕННЫЙ (МОЛОЧНЫЙ) ПРИКУС
		// ==========================================
		if (isDeciduous) {
			if (state === "Caries") {
				const defPedCaries = ORDER_804N_DICTIONARY.PediatricCariesTherapy!;
				stage1Items.push(
					createPlanItem(
						"s1-ped-caries-" + num,
						1,
						"stage_1_therapy",
						defPedCaries,
						num,
						catalog,
						validDiscountPct,
						{
							customTitle: "Лечение кариеса молочного зуба №" + num + " биосовместимым материалом",
							isDemoMode: isDemo,
						},
					),
				);
			} else if (state === "Pulpitis") {
				const defPulpotomy = ORDER_804N_DICTIONARY.PediatricPulpitisPulpotomy!;
				stage1Items.push(
					createPlanItem(
						"s1-ped-pulpotomy-" + num,
						1,
						"stage_1_therapy",
						defPulpotomy,
						num,
						catalog,
						validDiscountPct,
						{
							customTitle: "Витальная пульпотомия молочного зуба №" + num + " с Biodentine/МТА",
							isDemoMode: isDemo,
						},
					),
				);
				// Защитная коронка SSC для депульпированного молочного зуба
				const defPedCrown = ORDER_804N_DICTIONARY.PediatricCrownSSC!;
				stage3Items.push(
					createPlanItem(
						"s3-ped-crown-" + num,
						3,
						"stage_3_orthopedics",
						defPedCrown,
						num,
						catalog,
						validDiscountPct,
						{
							customTitle: "Защитная коронка на депульпированный молочный зуб №" + num + " (3M SSC / NuSmile)",
							isDemoMode: isDemo,
						},
					),
				);
			} else if (state === "Periodontitis" || state === "Root" || state === "Impacted" || state === "Missing") {
				const defPedExt = ORDER_804N_DICTIONARY.PediatricExtraction!;
				stage2Items.push(
					createPlanItem(
						"s2-ped-extract-" + num,
						2,
						"stage_2_surgery",
						defPedExt,
						num,
						catalog,
						validDiscountPct,
						{
							customTitle: "Атравматичное удаление временного зуба №" + num,
							isDemoMode: isDemo,
						},
					),
				);
			}
			continue;
		}

		// ==========================================
		// ПОСТОЯННЫЙ ПРИКУС
		// ==========================================
		if (state === "Missing") {
			const quadrant = Math.floor(num / 10);
			if (quadrant === 1 || quadrant === 2) {
				missingUpper.push(num);
			} else if (quadrant === 3 || quadrant === 4) {
				missingLower.push(num);
			}
			continue;
		}

		if (state === "Root") {
			const defExt = ORDER_804N_DICTIONARY.SimpleExtraction!;
			stage2Items.push(
				createPlanItem(
					"s2-root-extract-" + num,
					2,
					"stage_2_surgery",
					defExt,
					num,
					catalog,
					validDiscountPct,
					{
						customTitle: "Атравматичное удаление разрушенного корня зуба №" + num + " с консервацией лунки",
						isDemoMode: isDemo,
					},
				),
			);
			// После удаления планируется имплантация и коронка
			const quadrant = Math.floor(num / 10);
			if (quadrant === 1 || quadrant === 2) {
				missingUpper.push(num);
			} else {
				missingLower.push(num);
			}
			continue;
		}

		if (state === "Impacted") {
			const defComplexExt = ORDER_804N_DICTIONARY.ComplexExtraction!;
			stage2Items.push(
				createPlanItem(
					"s2-impacted-extract-" + num,
					2,
					"stage_2_surgery",
					defComplexExt,
					num,
					catalog,
					validDiscountPct,
					{
						customTitle: "Сложное хирургическое удаление ретенированного/дистопированного зуба №" + num,
						isDemoMode: isDemo,
					},
				),
			);
			continue;
		}

		if (state === "Caries") {
			const defCaries = ORDER_804N_DICTIONARY.CariesTherapy!;
			stage1Items.push(
				createPlanItem(
					"s1-caries-" + num,
					1,
					"stage_1_therapy",
					defCaries,
					num,
					catalog,
					validDiscountPct,
					{
						customTitle: "Лечение кариеса зуба №" + num + " нанокомпозитом Estelite / Filtek",
						isDemoMode: isDemo,
					},
				),
			);
		} else if (state === "Pulpitis" || state === "Periodontitis") {
			// Паттерн депульпированных зубов (Pulpitis/Periodontitis):
			// 1. Коффердам (1 шт)
			const defCofferdam = ORDER_804N_DICTIONARY.CofferdamIsolation!;
			stage1Items.push(
				createPlanItem(
					"s1-cofferdam-" + num,
					1,
					"stage_1_therapy",
					defCofferdam,
					num,
					catalog,
					validDiscountPct,
					{
						customTitle: "Наложение коффердама для изоляции зуба №" + num,
						isDemoMode: isDemo,
					},
				),
			);

			// 2. Инструментальная обработка N каналов
			const canalCount = extractCanalCount(tooth);
			const defPrep = getEndoPreparationProcedure(canalCount);
			stage1Items.push(
				createPlanItem(
					"s1-endo-prep-" + num,
					1,
					"stage_1_therapy",
					defPrep,
					num,
					catalog,
					validDiscountPct,
					{
						customTitle: "Инструментальная и медикаментозная обработка корневых каналов зуба №" + num + " (" + canalCount + (canalCount === 1 ? " канал" : canalCount < 5 ? " канала" : " каналов") + ")",
						isDemoMode: isDemo,
					},
				),
			);

			// 3. 3D-обтурация гуттаперчей N каналов
			const defObt = getEndoObturationProcedure(canalCount);
			stage1Items.push(
				createPlanItem(
					"s1-endo-obt-" + num,
					1,
					"stage_1_therapy",
					defObt,
					num,
					catalog,
					validDiscountPct,
					{
						customTitle: "3D-обтурация корневых каналов зуба №" + num + " горячей гуттаперчей с биокерамикой (" + canalCount + (canalCount === 1 ? " канал" : canalCount < 5 ? " канала" : " каналов") + ")",
						isDemoMode: isDemo,
					},
				),
			);

			// 4. Восстановление зуба под коронку (билдап со стекловолоконным штифтом)
			const defBuildup = ORDER_804N_DICTIONARY.BuildupFiberPost!;
			stage1Items.push(
				createPlanItem(
					"s1-buildup-" + num,
					1,
					"stage_1_therapy",
					defBuildup,
					num,
					catalog,
					validDiscountPct,
					{
						customTitle: "Восстановление культи зуба №" + num + " под коронку (Build-up со стекловолоконным штифтом)",
						isDemoMode: isDemo,
					},
				),
			);

			// 5. Для моляров и премоляров (жевательная группа): коронка в Этап 3!
			if (isMolarOrPremolar(num)) {
				const defCrown = ORDER_804N_DICTIONARY.CrownZirconia!;
				stage3Items.push(
					createPlanItem(
						"s3-crown-endo-" + num,
						3,
						"stage_3_orthopedics",
						defCrown,
						num,
						catalog,
						validDiscountPct,
						{
							customTitle: "Ортопедическая защита депульпированного зуба №" + num + " коронкой из диоксида циркония",
							isDemoMode: isDemo,
						},
					),
				);
			}
		} else if (state === "Crown" || state === "CrownNeeded") {
			const defCrown = ORDER_804N_DICTIONARY.CrownZirconia!;
			stage3Items.push(
				createPlanItem(
					"s3-crown-" + num,
					3,
					"stage_3_orthopedics",
					defCrown,
					num,
					catalog,
					validDiscountPct,
					{
						customTitle: "Восстановление зуба №" + num + " коронкой из диоксида циркония Prettau",
						isDemoMode: isDemo,
					},
				),
			);
		}
	}

	// 4. Клинический паттерн-матчинг адентии (Хирургия + Ортопедия)
	function processJawMissingTeeth(jawTeethSeq: readonly number[], missingList: number[], jawName: "верхней" | "нижней") {
		const missingSet = new Set(missingList);
		if (missingSet.size === 0) return;

		// Паттерн тотальной / субтотальной адентии (> 10 отсутствующих зубов на челюсти)
		if (missingSet.size > 10) {
			hasImplants = true;
			// 1. Навигационный 3D-шаблон для All-on-4
			const defGuide = ORDER_804N_DICTIONARY.AllOn4SurgicalGuide!;
			stage2Items.push(
				createPlanItem(
					"s2-allon4-guide-" + jawName,
					2,
					"stage_2_surgery",
					defGuide,
					undefined,
					catalog,
					validDiscountPct,
					{
						customTitle: "Хирургический навигационный 3D-шаблон для протокола All-on-4 (" + jawName + " челюсть)",
						isDemoMode: isDemo,
					},
				),
			);

			// 2. Установка 4 имплантатов
			const defAllOn4 = ORDER_804N_DICTIONARY.AllOn4Implantation!;
			stage2Items.push(
				createPlanItem(
					"s2-allon4-implants-" + jawName,
					2,
					"stage_2_surgery",
					defAllOn4,
					undefined,
					catalog,
					validDiscountPct,
					{
						customTitle: "Установка 4 дентальных имплантатов по протоколу All-on-4 (" + jawName + " челюсть)",
						quantity: 1,
						isDemoMode: isDemo,
					},
				),
			);

			// 3. Мультиюнит абатменты (4 шт)
			const defMultiUnit = ORDER_804N_DICTIONARY.MultiUnitAbutment!;
			stage2Items.push(
				createPlanItem(
					"s2-allon4-multiunit-" + jawName,
					2,
					"stage_2_surgery",
					defMultiUnit,
					undefined,
					catalog,
					validDiscountPct,
					{
						customTitle: "Установка мультиюнит-абатментов Multi-Unit (4 шт, " + jawName + " челюсть)",
						quantity: 4,
						isDemoMode: isDemo,
					},
				),
			);

			// 4. Несъемный армированный протез All-on-4 в Этап 3
			const defProsthesis = ORDER_804N_DICTIONARY.AllOn4Prosthesis!;
			stage3Items.push(
				createPlanItem(
					"s3-allon4-prosthesis-" + jawName,
					3,
					"stage_3_orthopedics",
					defProsthesis,
					undefined,
					catalog,
					validDiscountPct,
					{
						customTitle: "Несъемный армированный протез с винтовой фиксацией All-on-4 (" + jawName + " челюсть)",
						quantity: 1,
						isDemoMode: isDemo,
					},
				),
			);
			return;
		}

		// Поиск непрерывных участков адентии (spans) вдоль зубной дуги
		const handledTeeth = new Set<number>();
		let i = 0;
		while (i < jawTeethSeq.length) {
			const tNum = jawTeethSeq[i]!;
			if (missingSet.has(tNum) && !handledTeeth.has(tNum)) {
				const currentSpan: number[] = [tNum];
				let j = i + 1;
				while (j < jawTeethSeq.length && missingSet.has(jawTeethSeq[j]!) && !handledTeeth.has(jawTeethSeq[j]!)) {
					currentSpan.push(jawTeethSeq[j]!);
					j++;
				}

				// Паттерн 3 отсутствующих зуба подряд (например: 34, 35, 36 или 14, 15, 16)
				if (currentSpan.length === 3) {
					hasImplants = true;
					const [tooth1, tooth2, tooth3] = currentSpan as [number, number, number];
					handledTeeth.add(tooth1);
					handledTeeth.add(tooth2);
					handledTeeth.add(tooth3);

					// Хирургия: 2 имплантата на крайние позиции (tooth1 и tooth3), 0 на средний tooth2!
					const defImp = ORDER_804N_DICTIONARY.DentalImplantation!;
					stage2Items.push(
						createPlanItem(
							"s2-implant-span-" + tooth1,
							2,
							"stage_2_surgery",
							defImp,
							tooth1,
							catalog,
							validDiscountPct,
							{
								customTitle: "Дентальная имплантация в области зуба №" + tooth1 + " (крайняя опора моста)",
								isDemoMode: isDemo,
							},
						),
					);
					stage2Items.push(
						createPlanItem(
							"s2-implant-span-" + tooth3,
							2,
							"stage_2_surgery",
							defImp,
							tooth3,
							catalog,
							validDiscountPct,
							{
								customTitle: "Дентальная имплантация в области зуба №" + tooth3 + " (крайняя опора моста)",
								isDemoMode: isDemo,
							},
						),
					);

					// Ортопедия: Мостовидный протез на 3 единицы на 2 имплантатах
					const defBridge = ORDER_804N_DICTIONARY.BridgeProsthesis!;
					stage3Items.push(
						createPlanItem(
							"s3-bridge-span-" + tooth1 + "-" + tooth3,
							3,
							"stage_3_orthopedics",
							defBridge,
							tooth1,
							catalog,
							validDiscountPct,
							{
								customTitle: "Мостовидный протез из диоксида циркония на 2 имплантатах (3 единицы: №" + tooth1 + ", №" + tooth2 + ", №" + tooth3 + ")",
								relatedToothNumbers: [tooth1, tooth2, tooth3],
								quantity: 1,
								isDemoMode: isDemo,
							},
						),
					);
					i = j;
					continue;
				}

				// Одиночные дефекты или участки другой длины: 1 имплантат + 1 коронка на каждый отсутствующий зуб
				for (const missingT of currentSpan) {
					hasImplants = true;
					handledTeeth.add(missingT);

					const toothObj = teeth.find((t) => t.toothNumber === missingT);
					if (toothObj?.boneLossLevel && toothObj.boneLossLevel >= 2) {
						const defBone = ORDER_804N_DICTIONARY.BoneGraftingSinusLift!;
						stage2Items.push(
							createPlanItem(
								"s2-bone-graft-" + missingT,
								2,
								"stage_2_surgery",
								defBone,
								missingT,
								catalog,
								validDiscountPct,
								{
									customTitle: "Костная пластика / синус-лифтинг в области зуба №" + missingT,
									isDemoMode: isDemo,
								},
							),
						);
					}

					// Хирургия: подготовка ложа + навигационный шаблон + имплантация
					const defExt = ORDER_804N_DICTIONARY.SimpleExtraction!;
					stage2Items.push(
						createPlanItem(
							"s2-extract-prep-" + missingT,
							2,
							"stage_2_surgery",
							defExt,
							missingT,
							catalog,
							validDiscountPct,
							{
								customTitle: "Подготовка костного ложа / атравматичное удаление корня №" + missingT,
								isDemoMode: isDemo,
							},
						),
					);

					const defGuide = ORDER_804N_DICTIONARY.SurgicalNavigationGuide!;
					stage2Items.push(
						createPlanItem(
							"s2-guide-" + missingT,
							2,
							"stage_2_surgery",
							defGuide,
							missingT,
							catalog,
							validDiscountPct,
							{
								customTitle: "Навигационный хирургический 3D-шаблон (позиция №" + missingT + ")",
								isDemoMode: isDemo,
							},
						),
					);

					const defImp = ORDER_804N_DICTIONARY.DentalImplantation!;
					stage2Items.push(
						createPlanItem(
							"s2-implant-" + missingT,
							2,
							"stage_2_surgery",
							defImp,
							missingT,
							catalog,
							validDiscountPct,
							{
								customTitle: "Дентальная имплантация в области зуба №" + missingT + " (Osstem TS-III / Dentium)",
								isDemoMode: isDemo,
							},
						),
					);

					// Ортопедия: протезирование на имплантате
					const defImpCrown = ORDER_804N_DICTIONARY.ImplantCrownProsthetics!;
					stage3Items.push(
						createPlanItem(
							"s3-implant-crown-" + missingT,
							3,
							"stage_3_orthopedics",
							defImpCrown,
							missingT,
							catalog,
							validDiscountPct,
							{
								customTitle: "Протезирование на имплантате коронкой из диоксида циркония (№" + missingT + ")",
								isDemoMode: isDemo,
							},
						),
					);
				}
				i = j;
				continue;
			}
			i++;
		}
	}

	processJawMissingTeeth(UPPER_ARCH_TEETH, missingUpper, "верхней");
	processJawMissingTeeth(LOWER_ARCH_TEETH, missingLower, "нижней");

	// 5. Если в Этапе 3 есть ортопедия — добавляем 3D-сканирование в начало Этапа 3
	if (stage3Items.length > 0) {
		const defScan = ORDER_804N_DICTIONARY.IntraoralScanning3D!;
		stage3Items.unshift(
			createPlanItem(
				"s3-intraoral-scan",
				3,
				"stage_3_orthopedics",
				defScan,
				undefined,
				catalog,
				validDiscountPct,
				{
					customTitle: "Оптическое внутриротовое 3D-сканирование зубных рядов и регистрация прикуса",
					isDemoMode: isDemo,
				},
			),
		);
	}

	// 6. Хронология этапов и фиксация интервала остеоинтеграции (3-6 месяцев)
	const s1TotalRub = stage1Items.reduce((acc, it) => acc + it.priceRub, 0);
	const s2TotalRub = stage2Items.reduce((acc, it) => acc + it.priceRub, 0);
	const s3TotalRub = stage3Items.reduce((acc, it) => acc + it.priceRub, 0);

	const stage1: TreatmentPlanStage = {
		stageNumber: 1,
		stageKind: "stage_1_therapy",
		title: "Этап 1: Неотложная терапия и санация",
		subtitle: "Устранение очагов острой боли, КЛКТ 3D-диагностика, профессиональная гигиена, лечение кариеса и эндодонтия корневых каналов.",
		clinicalGoal: "Ликвидация очагов острой боли и хронической инфекции, антисептическая санация.",
		items: stage1Items,
		totalRub: s1TotalRub,
		totalKopecks: parseKopecks(s1TotalRub),
		estimatedVisits: Math.max(1, Math.ceil(stage1Items.length / 2)),
		estimatedWeeks: 2,
		order804nCodes: Array.from(new Set(stage1Items.map((i) => i.code804n))),
	};

	const stage2: TreatmentPlanStage = {
		stageNumber: 2,
		stageKind: "stage_2_surgery",
		title: "Этап 2: Хирургия и имплантация",
		subtitle: hasImplants
			? "Атравматичное удаление корней, 3D-навигационный шаблон, дентальная имплантация. Включает период остеоинтеграции (3–6 месяцев)."
			: "Хирургическая санация, атравматичное удаление разрушенных зубов и корней с консервацией лунок.",
		clinicalGoal: hasImplants
			? "Восстановление костной опоры и установка дентальных имплантатов с фиксацией периода остеоинтеграции (3–6 месяцев)."
			: "Хирургическая санация и подготовка альвеолярного отростка.",
		items: stage2Items,
		totalRub: s2TotalRub,
		totalKopecks: parseKopecks(s2TotalRub),
		estimatedVisits: Math.max(1, Math.ceil(stage2Items.length / 2)),
		estimatedWeeks: hasImplants ? 16 : 2, // 16 недель = 4 месяца (3–6 мес интервал)
		order804nCodes: Array.from(new Set(stage2Items.map((i) => i.code804n))),
	};

	const stage3: TreatmentPlanStage = {
		stageNumber: 3,
		stageKind: "stage_3_orthopedics",
		title: "Этап 3: Ортопедическая реабилитация",
		subtitle: "Внутриротовое цифровое 3D-сканирование, установка постоянных коронок, мостовидных протезов и конструкций на имплантатах.",
		clinicalGoal: "Восстановление анатомической формы зубного ряда, окклюзии и жевательной эффективности.",
		items: stage3Items,
		totalRub: s3TotalRub,
		totalKopecks: parseKopecks(s3TotalRub),
		estimatedVisits: Math.max(1, Math.ceil(stage3Items.length / 2)),
		estimatedWeeks: 4,
		order804nCodes: Array.from(new Set(stage3Items.map((i) => i.code804n))),
	};

	return [stage1, stage2, stage3];
}

/**
 * Генерация этапов плана лечения для конкретного тарифа («Эконом», «Стандарт», «Оптимальный»).
 */
export function generateTierPlanStages(
	tierId: TreatmentPlanTierId,
	teeth: readonly ToothData[],
	catalog?: readonly CatalogServiceLookupItem[],
	discountPercent: number = 0,
	options?: { isDemoMode?: boolean },
): [TreatmentPlanStage, TreatmentPlanStage, TreatmentPlanStage] {
	const isDemo = isDemoShowcaseMode(options?.isDemoMode);
	const validDiscountPct = Math.max(0, Math.min(100, discountPercent));

	// Для тарифа Стандарт используем базовый генератор
	if (tierId === "standard") {
		return generateTreatmentPlanStages(teeth, catalog, discountPercent, { isDemoMode: isDemo });
	}

	const hasPathology = teeth.some((t) => {
		const s = t.state || "Healthy";
		return (
			(s !== "Healthy" && s !== "Filled") ||
			Boolean(t.boneLossLevel && t.boneLossLevel > 0) ||
			Boolean(t.mobility && t.mobility > 0) ||
			Boolean(t.furcationGrade && t.furcationGrade > 0)
		);
	});

	if (!hasPathology) {
		return [
			makeEmptyStage(1, "stage_1_therapy", "Этап 1: Неотложная терапия и санация", "Санация полости рта."),
			makeEmptyStage(2, "stage_2_surgery", "Этап 2: Хирургия и имплантация", "Хирургическая санация."),
			makeEmptyStage(3, "stage_3_orthopedics", "Этап 3: Ортопедическая реабилитация", "Ортопедическая реабилитация."),
		];
	}

	const stage1Items: TreatmentPlanItem[] = [];
	const stage2Items: TreatmentPlanItem[] = [];
	const stage3Items: TreatmentPlanItem[] = [];

	let hasImplants = false;

	// КЛКТ диагностика и гигиена
	const defCT = ORDER_804N_DICTIONARY.DiagnosticsCT!;
	stage1Items.push(
		createPlanItem("s1-ct-diag", 1, "stage_1_therapy", defCT, undefined, catalog, validDiscountPct, { isDemoMode: isDemo }),
	);

	const defHygiene = ORDER_804N_DICTIONARY.HygieneComplex!;
	stage1Items.push(
		createPlanItem(
			"s1-hygiene",
			1,
			"stage_1_therapy",
			defHygiene,
			undefined,
			catalog,
			validDiscountPct,
			{
				customTitle:
					tierId === "optimum"
						? "Премиальная гигиена Air-Flow Plus с глицином + фторирование Clinpro"
						: "Базовая профессиональная гигиена и снятие зубного камня",
				isDemoMode: isDemo,
			},
		),
	);

	const missingUpper: number[] = [];
	const missingLower: number[] = [];

	for (const tooth of teeth) {
		const num = tooth.toothNumber;
		const state: ToothState | string = tooth.state || "Healthy";
		const isDeciduous = isDeciduousTooth(num);

		if (isDeciduous) {
			if (state === "Caries") {
				const defPed = ORDER_804N_DICTIONARY.PediatricCariesTherapy!;
				stage1Items.push(createPlanItem("s1-ped-" + num, 1, "stage_1_therapy", defPed, num, catalog, validDiscountPct, { isDemoMode: isDemo }));
			} else if (state === "Pulpitis") {
				const defPulp = ORDER_804N_DICTIONARY.PediatricPulpitisPulpotomy!;
				stage1Items.push(createPlanItem("s1-ped-pulp-" + num, 1, "stage_1_therapy", defPulp, num, catalog, validDiscountPct, { isDemoMode: isDemo }));
				const defCrown = ORDER_804N_DICTIONARY.PediatricCrownSSC!;
				stage3Items.push(createPlanItem("s3-ped-crown-" + num, 3, "stage_3_orthopedics", defCrown, num, catalog, validDiscountPct, { isDemoMode: isDemo }));
			} else if (state === "Periodontitis" || state === "Root" || state === "Impacted") {
				const defExt = ORDER_804N_DICTIONARY.PediatricExtraction!;
				stage2Items.push(createPlanItem("s2-ped-ext-" + num, 2, "stage_2_surgery", defExt, num, catalog, validDiscountPct, { isDemoMode: isDemo }));
			}
			continue;
		}

		if (state === "Missing") {
			const quadrant = Math.floor(num / 10);
			if (quadrant === 1 || quadrant === 2) missingUpper.push(num);
			else missingLower.push(num);
			continue;
		}

		if (state === "Root") {
			const defExt = ORDER_804N_DICTIONARY.SimpleExtraction!;
			stage2Items.push(
				createPlanItem(
					"s2-root-" + num,
					2,
					"stage_2_surgery",
					defExt,
					num,
					catalog,
					validDiscountPct,
					{
						customTitle: "Атравматичное удаление корня зуба №" + num,
						isDemoMode: isDemo,
					},
				),
			);
			const quadrant = Math.floor(num / 10);
			if (quadrant === 1 || quadrant === 2) missingUpper.push(num);
			else missingLower.push(num);
			continue;
		}

		if (state === "Impacted") {
			const defComplexExt = ORDER_804N_DICTIONARY.ComplexExtraction!;
			stage2Items.push(createPlanItem("s2-impacted-" + num, 2, "stage_2_surgery", defComplexExt, num, catalog, validDiscountPct, { isDemoMode: isDemo }));
			continue;
		}

		if (state === "Caries") {
			if (tierId === "economy") {
				const defCarEco = ORDER_804N_DICTIONARY.CariesTherapyEconomy!;
				stage1Items.push(
					createPlanItem(
						"s1-caries-eco-" + num,
						1,
						"stage_1_therapy",
						defCarEco,
						num,
						catalog,
						validDiscountPct,
						{
							customTitle: "Пломбирование зуба №" + num + " базовым световым композитом Gradia",
							isDemoMode: isDemo,
						},
					),
				);
			} else {
				// optimum: керамическая вкладка / накладка IPS e.max CAD в этап 3 (ортопедия)
				const defInlay = ORDER_804N_DICTIONARY.InlayOnlay!;
				stage3Items.push(
					createPlanItem(
						"s3-inlay-opt-" + num,
						3,
						"stage_3_orthopedics",
						defInlay,
						num,
						catalog,
						validDiscountPct,
						{
							customTitle: "Керамическая вкладка / накладка IPS e.max CAD на зуб №" + num,
							isDemoMode: isDemo,
						},
					),
				);
			}
		} else if (state === "Pulpitis" || state === "Periodontitis") {
			// Коффердам + Эндодонтия
			const defCofferdam = ORDER_804N_DICTIONARY.CofferdamIsolation!;
			stage1Items.push(createPlanItem("s1-cofferdam-" + num, 1, "stage_1_therapy", defCofferdam, num, catalog, validDiscountPct, { isDemoMode: isDemo }));

			const canalCount = extractCanalCount(tooth);
			const defPrep = getEndoPreparationProcedure(canalCount);
			stage1Items.push(
				createPlanItem(
					"s1-prep-" + num,
					1,
					"stage_1_therapy",
					defPrep,
					num,
					catalog,
					validDiscountPct,
					{
						customTitle:
							tierId === "optimum"
								? "Обработка корневых каналов зуба №" + num + " под микроскопом Zeiss (" + canalCount + " кан.)"
								: "Инструментальная обработка каналов зуба №" + num + " (" + canalCount + " кан.)",
						isDemoMode: isDemo,
					},
				),
			);

			const defObt = getEndoObturationProcedure(canalCount);
			stage1Items.push(
				createPlanItem(
					"s1-obt-" + num,
					1,
					"stage_1_therapy",
					defObt,
					num,
					catalog,
					validDiscountPct,
					{
						customTitle: "3D-обтурация каналов зуба №" + num + " горячей гуттаперчей (" + canalCount + " кан.)",
						isDemoMode: isDemo,
					},
				),
			);

			const defBuildup = ORDER_804N_DICTIONARY.BuildupFiberPost!;
			stage1Items.push(createPlanItem("s1-buildup-" + num, 1, "stage_1_therapy", defBuildup, num, catalog, validDiscountPct, { isDemoMode: isDemo }));

			// Коронка на депульпированный моляр/премоляр
			if (isMolarOrPremolar(num)) {
				if (tierId === "economy") {
					const defMKK = ORDER_804N_DICTIONARY.CrownMetalCeramic!;
					stage3Items.push(
						createPlanItem(
							"s3-crown-mk-" + num,
							3,
							"stage_3_orthopedics",
							defMKK,
							num,
							catalog,
							validDiscountPct,
							{
								customTitle: "Металлокерамическая коронка на зуб №" + num,
								isDemoMode: isDemo,
							},
						),
					);
				} else {
					// optimum
					const defEmax = ORDER_804N_DICTIONARY.CrownEmaxCeramic!;
					stage3Items.push(
						createPlanItem(
							"s3-crown-emax-" + num,
							3,
							"stage_3_orthopedics",
							defEmax,
							num,
							catalog,
							validDiscountPct,
							{
								customTitle: "Премиальная керамическая коронка IPS e.max Press на зуб №" + num,
								isDemoMode: isDemo,
							},
						),
					);
				}
			}
		} else if (state === "Crown" || state === "CrownNeeded") {
			if (tierId === "economy") {
				const defMK = ORDER_804N_DICTIONARY.CrownMetalCeramic!;
				stage3Items.push(createPlanItem("s3-crown-" + num, 3, "stage_3_orthopedics", defMK, num, catalog, validDiscountPct, { isDemoMode: isDemo }));
			} else {
				const defEmax = ORDER_804N_DICTIONARY.CrownEmaxCeramic!;
				stage3Items.push(createPlanItem("s3-crown-" + num, 3, "stage_3_orthopedics", defEmax, num, catalog, validDiscountPct, { isDemoMode: isDemo }));
			}
		}
	}

	// Обработка адентии по тарифам
	function processTierMissingTeeth(jawSeq: readonly number[], missingList: number[], jawLabel: "верхней" | "нижней") {
		const missingSet = new Set(missingList);
		if (missingSet.size === 0) return;

		// Тотальная адентия (>10 зубов)
		if (missingSet.size > 10) {
			if (tierId === "economy") {
				// Эконом: Съемный пластиночный / бюгельный протез
				const defClasp = ORDER_804N_DICTIONARY.ClaspProsthesisEconomy!;
				stage3Items.push(
					createPlanItem(
						"s3-full-clasp-" + jawLabel,
						3,
						"stage_3_orthopedics",
						defClasp,
						undefined,
						catalog,
						validDiscountPct,
						{
							customTitle: "Полный съемный пластиночный протез (" + jawLabel + " челюсть)",
							isDemoMode: isDemo,
						},
					),
				);
			} else {
				// Оптимум: Протокол All-on-6 на швейцарских Straumann + циркониевый мост на балке
				hasImplants = true;
				const defGuide = ORDER_804N_DICTIONARY.AllOn4SurgicalGuide!;
				stage2Items.push(
					createPlanItem(
						"s2-allon6-guide-" + jawLabel,
						2,
						"stage_2_surgery",
						defGuide,
						undefined,
						catalog,
						validDiscountPct,
						{
							customTitle: "Прецизионный навигационный 3D-шаблон All-on-6 (" + jawLabel + " челюсть)",
							isDemoMode: isDemo,
						},
					),
				);

				const defAllOn6 = ORDER_804N_DICTIONARY.AllOn6Implantation!;
				stage2Items.push(
					createPlanItem(
						"s2-allon6-implants-" + jawLabel,
						2,
						"stage_2_surgery",
						defAllOn6,
						undefined,
						catalog,
						validDiscountPct,
						{
							customTitle: "Установка 6 премиальных имплантатов Straumann SLActive All-on-6 (" + jawLabel + " челюсть)",
							isDemoMode: isDemo,
						},
					),
				);

				const defMultiUnit = ORDER_804N_DICTIONARY.MultiUnitAbutment!;
				stage2Items.push(
					createPlanItem(
						"s2-allon6-multiunit-" + jawLabel,
						2,
						"stage_2_surgery",
						defMultiUnit,
						undefined,
						catalog,
						validDiscountPct,
						{
							customTitle: "Установка мультиюнит-абатментов Straumann (6 шт, " + jawLabel + " челюсть)",
							quantity: 6,
							isDemoMode: isDemo,
						},
					),
				);

				const defAllOn6Prosth = ORDER_804N_DICTIONARY.AllOn6Prosthesis!;
				stage3Items.push(
					createPlanItem(
						"s3-allon6-prosthesis-" + jawLabel,
						3,
						"stage_3_orthopedics",
						defAllOn6Prosth,
						undefined,
						catalog,
						validDiscountPct,
						{
							customTitle: "Высокоэстетичный циркониевый протез All-on-6 на титановой балке (" + jawLabel + " челюсть)",
							isDemoMode: isDemo,
						},
					),
				);
			}
			return;
		}

		// Локальная адентия
		const handled = new Set<number>();
		let i = 0;
		while (i < jawSeq.length) {
			const tNum = jawSeq[i]!;
			if (missingSet.has(tNum) && !handled.has(tNum)) {
				const currentSpan: number[] = [tNum];
				let j = i + 1;
				while (j < jawSeq.length && missingSet.has(jawSeq[j]!) && !handled.has(jawSeq[j]!)) {
					currentSpan.push(jawSeq[j]!);
					j++;
				}

				if (tierId === "economy") {
					// Эконом: удаление корня / подготовка лунки + мостовидные металлокерамические протезы
					for (const missingT of currentSpan) {
						handled.add(missingT);
						const defExt = ORDER_804N_DICTIONARY.SimpleExtraction!;
						stage2Items.push(
							createPlanItem(
								"s2-eco-ext-" + missingT,
								2,
								"stage_2_surgery",
								defExt,
								missingT,
								catalog,
								validDiscountPct,
								{
									customTitle: "Удаление разрушенного корня / подготовка альвеолы зуба №" + missingT,
									isDemoMode: isDemo,
								},
							),
						);
						const defEcoBridge = ORDER_804N_DICTIONARY.BridgeProsthesisEconomy!;
						stage3Items.push(
							createPlanItem(
								"s3-eco-bridge-" + missingT,
								3,
								"stage_3_orthopedics",
								defEcoBridge,
								missingT,
								catalog,
								validDiscountPct,
								{
									customTitle: "Восстановление дефекта зуба №" + missingT + " металлокерамическим мостовидным протезом",
									isDemoMode: isDemo,
								},
							),
						);
					}
					i = j;
					continue;
				}

				// Оптимум (Премиум):
				if (currentSpan.length === 3) {
					hasImplants = true;
					const [tooth1, tooth2, tooth3] = currentSpan as [number, number, number];
					handled.add(tooth1);
					handled.add(tooth2);
					handled.add(tooth3);

					const defGuide = ORDER_804N_DICTIONARY.SurgicalNavigationGuide!;
					stage2Items.push(
						createPlanItem("s2-guide-" + tooth1, 2, "stage_2_surgery", defGuide, tooth1, catalog, validDiscountPct, { isDemoMode: isDemo }),
					);

					const defImpPrem = ORDER_804N_DICTIONARY.DentalImplantationPremium!;
					stage2Items.push(
						createPlanItem(
							"s2-imp-opt-" + tooth1,
							2,
							"stage_2_surgery",
							defImpPrem,
							tooth1,
							catalog,
							validDiscountPct,
							{
								customTitle: "Имплантация Straumann Roxolid SLActive в области зуба №" + tooth1,
								isDemoMode: isDemo,
							},
						),
					);
					stage2Items.push(
						createPlanItem(
							"s2-imp-opt-" + tooth3,
							2,
							"stage_2_surgery",
							defImpPrem,
							tooth3,
							catalog,
							validDiscountPct,
							{
								customTitle: "Имплантация Straumann Roxolid SLActive в области зуба №" + tooth3,
								isDemoMode: isDemo,
							},
						),
					);

					const defBridge = ORDER_804N_DICTIONARY.BridgeProsthesis!;
					stage3Items.push(
						createPlanItem(
							"s3-bridge-opt-" + tooth1 + "-" + tooth3,
							3,
							"stage_3_orthopedics",
							defBridge,
							tooth1,
							catalog,
							validDiscountPct,
							{
								customTitle: "Премиальный мостовидный протез E.max / Katana UTML на 2 имплантатах Straumann (№" + tooth1 + ", №" + tooth2 + ", №" + tooth3 + ")",
								relatedToothNumbers: [tooth1, tooth2, tooth3],
								isDemoMode: isDemo,
							},
						),
					);
					i = j;
					continue;
				}

				// Одиночные дефекты в Оптимум: Straumann + Ti-Base абатмент + коронка Katana/E.max
				for (const missingT of currentSpan) {
					hasImplants = true;
					handled.add(missingT);

					const defGuide = ORDER_804N_DICTIONARY.SurgicalNavigationGuide!;
					stage2Items.push(
						createPlanItem("s2-guide-" + missingT, 2, "stage_2_surgery", defGuide, missingT, catalog, validDiscountPct, { isDemoMode: isDemo }),
					);

					const defImpPrem = ORDER_804N_DICTIONARY.DentalImplantationPremium!;
					stage2Items.push(
						createPlanItem(
							"s2-imp-opt-" + missingT,
							2,
							"stage_2_surgery",
							defImpPrem,
							missingT,
							catalog,
							validDiscountPct,
							{
								customTitle: "Имплантация Straumann Roxolid SLActive в области зуба №" + missingT,
								isDemoMode: isDemo,
							},
						),
					);

					const defImpCrownPrem = ORDER_804N_DICTIONARY.ImplantCrownPremium!;
					stage3Items.push(
						createPlanItem(
							"s3-imp-crown-opt-" + missingT,
							3,
							"stage_3_orthopedics",
							defImpCrownPrem,
							missingT,
							catalog,
							validDiscountPct,
							{
								customTitle: "Протезирование на имплантате: индивидуальный Ti-Base абатмент + коронка Katana/E.max (№" + missingT + ")",
								isDemoMode: isDemo,
							},
						),
					);
				}
				i = j;
				continue;
			}
			i++;
		}
	}

	processTierMissingTeeth(UPPER_ARCH_TEETH, missingUpper, "верхней");
	processTierMissingTeeth(LOWER_ARCH_TEETH, missingLower, "нижней");

	// 3D-сканирование в Этап 3
	if (stage3Items.length > 0) {
		const defScan = ORDER_804N_DICTIONARY.IntraoralScanning3D!;
		stage3Items.unshift(createPlanItem("s3-scan", 3, "stage_3_orthopedics", defScan, undefined, catalog, validDiscountPct, { isDemoMode: isDemo }));
	}

	const s1Total = stage1Items.reduce((acc, it) => acc + it.priceRub, 0);
	const s2Total = stage2Items.reduce((acc, it) => acc + it.priceRub, 0);
	const s3Total = stage3Items.reduce((acc, it) => acc + it.priceRub, 0);

	const stage1: TreatmentPlanStage = {
		stageNumber: 1,
		stageKind: "stage_1_therapy",
		title: "Этап 1: Неотложная терапия и санация",
		subtitle:
			tierId === "optimum"
				? "Лечение под микроскопом Leica, КЛКТ 3D-диагностика, швейцарская гигиена Air-Flow и реставрации."
				: "Базовая терапия, устранение боли, гигиена и пломбирование.",
		clinicalGoal: "Устранение очагов воспаления и санация кариозных поражений.",
		items: stage1Items,
		totalRub: s1Total,
		totalKopecks: parseKopecks(s1Total),
		estimatedVisits: Math.max(1, Math.ceil(stage1Items.length / 2)),
		estimatedWeeks: 2,
		order804nCodes: Array.from(new Set(stage1Items.map((i) => i.code804n))),
	};

	const stage2: TreatmentPlanStage = {
		stageNumber: 2,
		stageKind: "stage_2_surgery",
		title: "Этап 2: Хирургия и имплантация",
		subtitle: hasImplants
			? "Дентальная имплантация по 3D-шаблону. Включает период остеоинтеграции (3–6 месяцев)."
			: "Хирургическая санация полости рта.",
		clinicalGoal: "Установка дентальных имплантатов и подготовка костного ложа.",
		items: stage2Items,
		totalRub: s2Total,
		totalKopecks: parseKopecks(s2Total),
		estimatedVisits: Math.max(1, Math.ceil(stage2Items.length / 2)),
		estimatedWeeks: hasImplants ? 16 : 2,
		order804nCodes: Array.from(new Set(stage2Items.map((i) => i.code804n))),
	};

	const stage3: TreatmentPlanStage = {
		stageNumber: 3,
		stageKind: "stage_3_orthopedics",
		title: "Этап 3: Ортопедическая реабилитация",
		subtitle:
			tierId === "optimum"
				? "Цифровой 3D-скан TRIOS, индивидуальные Ti-Base абатменты и премиальные коронки IPS e.max / Katana."
				: "Ортопедическое восстановление зубов и мостовидных протезов.",
		clinicalGoal: "Анатомическое протезирование и окклюзионная реабилитация.",
		items: stage3Items,
		totalRub: s3Total,
		totalKopecks: parseKopecks(s3Total),
		estimatedVisits: Math.max(1, Math.ceil(stage3Items.length / 2)),
		estimatedWeeks: 4,
		order804nCodes: Array.from(new Set(stage3Items.map((i) => i.code804n))),
	};

	return [stage1, stage2, stage3];
}

/**
 * Расчет бонусов лояльности и скидки.
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
			? (percentageOfKopecks(grossKopecks, validDiscountPct * 100))
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
 * Расчет налогового вычета 13% НДФЛ.
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
 * Расчет рассрочки 0% без потерь копеек.
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
 * 1-Click генерация 3 вариантов комплексного плана («Эконом», «Стандарт», «Оптимальный»)
 * с расчётом налогового вычета 13% НДФЛ и беспроцентной рассрочки в копейках.
 */
export function generate3TierPlanComparison(
	teeth: readonly ToothData[],
	catalog?: readonly CatalogServiceLookupItem[],
	patientLoyaltyDiscountPercent: number = 0,
	patientBonusBalanceRub: number = 0,
	options?: { isDemoMode?: boolean },
): [TreatmentPlanTier, TreatmentPlanTier, TreatmentPlanTier] {
	const isDemo = options?.isDemoMode !== undefined ? options.isDemoMode : (isDemoShowcaseMode() || !catalog || catalog.length === 0);
	const validLoyaltyPct = Math.max(0, Math.min(100, patientLoyaltyDiscountPercent));

	const economyStages = generateTierPlanStages("economy", teeth, catalog, validLoyaltyPct, { isDemoMode: isDemo });
	const standardStages = generateTierPlanStages("standard", teeth, catalog, validLoyaltyPct, { isDemoMode: isDemo });
	const optimumStages = generateTierPlanStages("optimum", teeth, catalog, validLoyaltyPct, { isDemoMode: isDemo });

	function makeTier(
		tierId: TreatmentPlanTierId,
		title: string,
		subtitle: string,
		badge: string,
		badgeClass: string,
		borderClass: string,
		isRecommended: boolean,
		warrantyYears: number | string,
		materialsHeadline: string,
		materialsList: readonly string[],
		keyAdvantages: readonly string[],
		stages: [TreatmentPlanStage, TreatmentPlanStage, TreatmentPlanStage],
	): TreatmentPlanTier {
		const allItems = stages.flatMap((s) => s.items);
		const totalRub = stages.reduce((acc, s) => acc + s.totalRub, 0);
		const totalKopecks = parseKopecks(totalRub);

		const isHighCost = allItems.some((i) =>
			i.code804n === "A16.07.054.001" ||
			i.code804n === "A16.07.041" ||
			i.code804n === "A16.07.035",
		);

		const ndflDetails = calculateNdflDeduction(totalKopecks, isHighCost);
		const installments = computeTierInstallments(totalKopecks);
		const stagedSchedule = calculateStaged304030Schedule(totalKopecks, true);

		const estimatedWeeks = stages.reduce((acc, s) => acc + s.estimatedWeeks, 0);
		const estimatedVisits = stages.reduce((acc, s) => acc + s.estimatedVisits, 0);

		return {
			tierId,
			title,
			subtitle,
			badge,
			badgeClass,
			borderClass,
			isRecommended,
			totalRub,
			totalKopecks,
			durationWeeks: estimatedWeeks,
			durationVisits: estimatedVisits,
			warrantyYears,
			materialsHeadline,
			materialsList,
			keyAdvantages,
			stages,
			itemsCount: allItems.length,
			ndflRefundRub: ndflDetails.refundRub,
			priceWithNdflRefundRub: ndflDetails.finalPriceWithRefundRub,
			monthlyInstallment12Rub: installments[12]?.monthlyPaymentRub ?? 0,
			installments,
			ndflDetails,
			stagedSchedule,
		};
	}

	const economyTier = makeTier(
		"economy",
		"Эконом (Базовая санация)",
		"Устранение острой боли, базовая терапия композитами и металлокерамическое протезирование",
		"Базовый",
		"bg-muted/40 text-muted-foreground border-border",
		"border-border hover:border-foreground/40",
		false,
		1,
		"Микрогибридные композиты Gradia / Charisma, металлокерамика Co-Cr",
		[
			"Световые композиты базовой группы (GC Gradia / Heraeus Charisma)",
			"Металлокерамические коронки и мостовидные протезы",
			"Ультразвуковое снятие наддесневого камня",
			"Гарантия клиники 1 год",
		],
		[
			"Минимальная стоимость старта лечения",
			"Быстрое устранение очагов острой боли и инфекции",
			"Возможность поэтапной оплаты за каждый визит",
		],
		economyStages,
	);

	const standardTier = makeTier(
		"standard",
		"Стандарт (Оптимальный выбор)",
		"Комплексная реабилитация: нанокомпозиты Estelite, имплантация Osstem и циркониевые коронки",
		"Популярный выбор",
		"bg-[var(--teal-soft,var(--paper-soft))] text-[var(--teal-dark,var(--teal))] border border-[var(--teal,var(--brand-primary))]/30",
		"border-[var(--teal,var(--brand-primary))]/50 hover:border-[var(--teal,var(--brand-primary))] shadow-md",
		false,
		2,
		"Нанокомпозиты Estelite Asteria, корейские имплантаты Osstem TS-III, диоксид циркония Prettau",
		[
			"Японские наногибридные композиты Estelite Asteria / Filtek Ultimate",
			"Дентальные имплантаты Osstem TS-III / Dentium SuperLine (SLA)",
			"Безметалловые коронки из монолитного диоксида циркония Prettau",
			"Комплексная гигиена Air-Flow с глициновым порошком",
			"Гарантия клиники 2 года",
		],
		[
			"Идеальный баланс долговечности, эстетики и стоимости",
			"Безметалловые биосовместимые циркониевые конструкции",
			"Надежная остеоинтеграция имплантатов 98.8%",
		],
		standardStages,
	);

	const optimumTier = makeTier(
		"optimum",
		"Оптимальный (Премиум Реконструкция)",
		"Лечение под микроскопом, швейцарские имплантаты Straumann SLActive, 3D-шаблон и керамика E.max",
		"Выбор главного врача",
		"bg-emerald-100 dark:bg-emerald-950 text-emerald-900 dark:text-emerald-200 border-emerald-400/60 font-bold",
		"border-emerald-500 ring-2 ring-emerald-500/20 shadow-xl shadow-emerald-500/10",
		true,
		"5 лет (импланты: пож.)",
		"Швейцарские имплантаты Straumann Roxolid SLActive, навигационный 3D-шаблон, керамика IPS e.max Press, микроскоп Leica",
		[
			"Лечение каналов и реставрации под дентальным микроскопом Carl Zeiss / Leica",
			"3D навигационный хирургический шаблон виртуального позиционирования",
			"Швейцарские гидрофильные имплантаты Straumann Roxolid SLActive",
			"Индивидуальные титано-циркониевые Ti-Base абатменты",
			"Высокоэстетичная прессованная керамика IPS e.max Press / Katana UTML",
			"Пожизненная международная гарантия производителя на имплантаты",
		],
		[
			"Максимальная надежность и сохранение собственных тканей под микроскопом",
			"Прецизионная точность установки имплантатов по 3D-шаблону",
			"Ускоренное приживление имплантатов за 3-4 недели (SLActive технология)",
			"Безупречная эстетика натурального зуба с естественной прозрачностью",
			"Персональный медицинский консьерж и VIP сопровождение",
		],
		optimumStages,
	);

	return [economyTier, standardTier, optimumTier];
}

export const generate3TierTreatmentPlanOptions = generate3TierPlanComparison;

/**
 * Прямой расчет поэтапной оплаты (30% / 40% / 30%) с балансировкой копеек.
 */
export function calculateStagedPayment304030(totalKopecksOrRub: number, isKopecks: boolean = true) {
	return calculateStaged304030Schedule(totalKopecksOrRub, isKopecks);
}

/**
 * Прямой расчет экономии 13% НДФЛ для плана лечения.
 */
export function calculatePlanNdflDeduction(
	items: readonly TreatmentPlanItem[] | readonly { readonly code804n?: string; readonly serviceName?: string; readonly priceRub?: number; readonly unitPriceRub?: number; readonly quantity?: number; readonly name?: string }[],
) {
	return calculatePlanTaxDeductionBreakdown(items as any);
}
