/**
 * DENTE Dental CRM — Anatomical Root Canals & Minzdrav Order 804n Endodontic Billing
 *
 * Provides anatomical root canal counts for all 32 permanent and 20 primary teeth (FDI notation),
 * plus automated mapping to Order 804n endodontic line items:
 * - 1-canal tooth: A16.07.008.001 (obturation), A16.07.030.001 (instrumentation)
 * - 2-canal tooth: A16.07.008.002 (obturation), A16.07.030.002 (instrumentation)
 * - 3-canal tooth: A16.07.008.003 (obturation), A16.07.030.003 (instrumentation)
 * - 4-canal tooth: A16.07.008.004 (obturation), A16.07.030.004 (instrumentation)
 */

export type AnatomicalCanalCount = 1 | 2 | 3 | 4;

export interface Order804nEndoItem {
	readonly code: string;
	readonly title: string;
	readonly category: string;
	readonly price: number;
	readonly canalCount: AnatomicalCanalCount;
}

export interface EndodonticOrder804nPair {
	readonly canalCount: AnatomicalCanalCount;
	readonly instrumentation: Order804nEndoItem;
	readonly obturation: Order804nEndoItem;
	readonly combinedPrice: number;
}

/**
 * Standard Order 804n line items for root canal instrumentation and medication (A16.07.030)
 */
export const ORDER_804N_INSTRUMENTATION: Record<AnatomicalCanalCount, Order804nEndoItem> = {
	1: {
		code: "A16.07.030.001",
		title: "Инструментальная и медикаментозная обработка корневого канала (1-канальный зуб)",
		category: "Эндодонтия",
		price: 3500,
		canalCount: 1,
	},
	2: {
		code: "A16.07.030.002",
		title: "Инструментальная и медикаментозная обработка корневых каналов (2-канальный зуб)",
		category: "Эндодонтия",
		price: 5800,
		canalCount: 2,
	},
	3: {
		code: "A16.07.030.003",
		title: "Инструментальная и медикаментозная обработка корневых каналов (3-канальный зуб)",
		category: "Эндодонтия",
		price: 8200,
		canalCount: 3,
	},
	4: {
		code: "A16.07.030.004",
		title: "Инструментальная и медикаментозная обработка корневых каналов (4-канальный зуб)",
		category: "Эндодонтия",
		price: 10500,
		canalCount: 4,
	},
};

/**
 * Standard Order 804n line items for root canal obturation and filling (A16.07.008)
 */
export const ORDER_804N_OBTURATIONS: Record<AnatomicalCanalCount, Order804nEndoItem> = {
	1: {
		code: "A16.07.008.001",
		title: "Пломбирование корневого канала зуба гуттаперчей / биокерамикой (1 канал)",
		category: "Эндодонтия",
		price: 4000,
		canalCount: 1,
	},
	2: {
		code: "A16.07.008.002",
		title: "Пломбирование корневых каналов двухканального зуба (2 канала)",
		category: "Эндодонтия",
		price: 6700,
		canalCount: 2,
	},
	3: {
		code: "A16.07.008.003",
		title: "Пломбирование корневых каналов трехканального зуба (3 канала)",
		category: "Эндодонтия",
		price: 9500,
		canalCount: 3,
	},
	4: {
		code: "A16.07.008.004",
		title: "Пломбирование корневых каналов четырехканального зуба (4 канала)",
		category: "Эндодонтия",
		price: 12000,
		canalCount: 4,
	},
};

/**
 * Combined single-package Order 804n line items for pulpitis / endodontics
 */
export const ORDER_804N_ENDODONTIC_PACKAGES: Record<AnatomicalCanalCount, Order804nEndoItem> = {
	1: {
		code: "A16.07.008.001",
		title: "Эндодонтическое лечение 1-канального зуба (обработка и обтурация)",
		category: "Эндодонтия",
		price: 7500,
		canalCount: 1,
	},
	2: {
		code: "A16.07.008.002",
		title: "Эндодонтическое лечение 2-канального зуба (обработка и обтурация)",
		category: "Эндодонтия",
		price: 12500,
		canalCount: 2,
	},
	3: {
		code: "A16.07.008.003",
		title: "Эндодонтическое лечение 3-канального зуба (обработка и обтурация)",
		category: "Эндодонтия",
		price: 17700,
		canalCount: 3,
	},
	4: {
		code: "A16.07.008.004",
		title: "Эндодонтическое лечение 4-канального зуба (обработка и обтурация)",
		category: "Эндодонтия",
		price: 22500,
		canalCount: 4,
	},
};

/**
 * Additional standard Order 804n line items for endodontic care
 */
export const ORDER_804N_MEDICATION_CAOH2: Order804nEndoItem = {
	code: "A16.07.091",
	title: "Временное пломбирование лекарственным препаратом корневого канала (Ca(OH)2)",
	category: "Эндодонтия",
	price: 2000,
	canalCount: 1,
};

export const ORDER_804N_UNSEALING: Order804nEndoItem = {
	code: "A16.07.082",
	title: "Распломбирование корневого канала зуба",
	category: "Эндодонтия",
	price: 2500,
	canalCount: 1,
};

/**
 * Derives the anatomical root canal count from the FDI tooth number according to
 * clinical dental anatomy standards.
 *
 * FDI Mapping:
 * - Upper Incisors & Canines (11..13, 21..23): 1 canal
 * - Upper 1st Premolars (14, 24): 2 canals (Buccal + Palatal)
 * - Upper 2nd Premolars (15, 25): 1 canal (occasionally 2, standard default 1)
 * - Upper Molars (16, 17, 18, 26, 27, 28): 3 canals (MB1, DB, P; or 4 if MB2)
 * - Lower Incisors & Canines (31..33, 41..43): 1 canal
 * - Lower Premolars (34, 35, 44, 45): 1 canal
 * - Lower Molars (36, 37, 38, 46, 47, 48): 3 canals (MB, ML, D; or 4)
 * - Primary Upper Incisors & Canines (51..53, 61..63): 1 canal
 * - Primary Lower Incisors & Canines (71..73, 81..83): 1 canal
 * - Primary Upper Molars (54, 55, 64, 65): 3 canals
 * - Primary Lower Molars (74, 75, 84, 85): 2 canals
 */
export function getAnatomicalRootCanalCount(
	fdiNumber: number,
	clinicalCanalCount?: number,
): AnatomicalCanalCount {
	if (
		typeof clinicalCanalCount === "number" &&
		Number.isFinite(clinicalCanalCount) &&
		clinicalCanalCount > 0
	) {
		return Math.min(4, Math.max(1, Math.round(clinicalCanalCount))) as AnatomicalCanalCount;
	}

	const quadrant = Math.floor(fdiNumber / 10);
	const pos = fdiNumber % 10;
	const isPrimary = quadrant >= 5 && quadrant <= 8;

	if (isPrimary) {
		if (pos <= 3) return 1;
		if (quadrant === 5 || quadrant === 6) {
			// Верхние молочные моляры (54, 55, 64, 65) -> 3 канала (MB, DB, P)
			return 3;
		}
		// Нижние молочные моляры (74, 75, 84, 85) -> 2 канала (M, D)
		return 2;
	}

	// Постоянные зубы (11..48)
	if (pos <= 3) {
		// Резцы и клыки (11-13, 21-23, 31-33, 41-43)
		return 1;
	}

	if (pos === 4) {
		// Первые премоляры:
		// Верхние 1-е премоляры (14, 24) — 2 канала (щечный и небный в 85-90%)
		if (quadrant === 1 || quadrant === 2) {
			return 2;
		}
		// Нижние 1-е премоляры (34, 44) — 1 канал
		return 1;
	}

	if (pos === 5) {
		// Вторые премоляры:
		// Верхние 2-е премоляры (15, 25) — 1 канал (стандарт)
		// Нижние 2-е премоляры (35, 45) — 1 канал
		return 1;
	}

	if (pos >= 6) {
		// Моляры (16-18, 26-28, 36-38, 46-48)
		// Верхние моляры: 3 канала (MB, DB, P)
		// Нижние моляры: 3 канала (MB, ML, D)
		return 3;
	}

	return 1;
}

export function getCanalCountForTooth(
	fdiNumber: number | string,
	clinicalCanalCount?: number,
): AnatomicalCanalCount {
	const parsedFdi =
		typeof fdiNumber === "number"
			? fdiNumber
			: parseInt(String(fdiNumber || "").replace(/[^0-9]/g, ""), 10) || 11;
	return getAnatomicalRootCanalCount(parsedFdi, clinicalCanalCount);
}

/**
 * Checks if a tooth is anatomically multi-rooted (e.g. molars 16, 17, 18, 26, 27, 28, 36, 37, 38, 46, 47, 48,
 * upper 1st premolars 14, 24, and primary molars).
 */
export function isMultiRootedTooth(fdiNumber: number): boolean {
	return getAnatomicalRootCanalCount(fdiNumber) >= 2;
}

/**
 * Returns the pair of Order 804n procedures (instrumentation + obturation) for a given canal count.
 */
export function getEndodonticOrder804nPair(canalCount: AnatomicalCanalCount): EndodonticOrder804nPair {
	const count = Math.max(1, Math.min(4, canalCount)) as AnatomicalCanalCount;
	const instrumentation = ORDER_804N_INSTRUMENTATION[count];
	const obturation = ORDER_804N_OBTURATIONS[count];
	return {
		canalCount: count,
		instrumentation,
		obturation,
		combinedPrice: instrumentation.price + obturation.price,
	};
}

/**
 * Returns the accurate Order 804n package procedure for a specific tooth number,
 * with support for explicit canal count overrides (e.g. from endo canal log).
 */
export function getOrder804nEndoProcedureForTooth(
	fdiNumber: number,
	explicitCanalCount?: number,
): Order804nEndoItem {
	const count = (
		explicitCanalCount !== undefined && explicitCanalCount >= 1 && explicitCanalCount <= 4
			? explicitCanalCount
			: getAnatomicalRootCanalCount(fdiNumber)
	) as AnatomicalCanalCount;

	return ORDER_804N_ENDODONTIC_PACKAGES[count];
}

export interface EndodonticFullTreatmentPlanItem {
	readonly fdiNumber: number;
	readonly isMultiRooted: boolean;
	readonly canalCount: AnatomicalCanalCount;
	readonly instrumentation: Order804nEndoItem;
	readonly obturation: Order804nEndoItem;
	readonly medication?: Order804nEndoItem | undefined;
	readonly totalCompositePrice: number;
}

/**
 * Calculates complete endodontic composite treatment pricing (instrumentation + obturation + optional Ca(OH)2 medication)
 * for a specific tooth, accurately handling multi-rooted molars (16, 17, 26, 27, 36, 37, 46, 47) and premolars.
 */
export function calculateEndodonticCompositeTreatment(
	fdiNumber: number,
	options?: {
		state?: "Pulpitis" | "Periodontitis" | string;
		clinicalCanalCount?: number;
		includeMedication?: boolean;
	},
): EndodonticFullTreatmentPlanItem {
	const count = (
		options?.clinicalCanalCount !== undefined &&
		options.clinicalCanalCount >= 1 &&
		options.clinicalCanalCount <= 4
			? Math.round(options.clinicalCanalCount)
			: getAnatomicalRootCanalCount(fdiNumber)
	) as AnatomicalCanalCount;

	const pair = getEndodonticOrder804nPair(count);
	const isPeriodontitis = options?.state === "Periodontitis";
	const includeMed = options?.includeMedication ?? isPeriodontitis;
	const medication = includeMed ? ORDER_804N_MEDICATION_CAOH2 : undefined;
	const totalCompositePrice = pair.combinedPrice + (medication ? medication.price : 0);

	return {
		fdiNumber,
		isMultiRooted: isMultiRootedTooth(fdiNumber) || count >= 2,
		canalCount: count,
		instrumentation: pair.instrumentation,
		obturation: pair.obturation,
		medication,
		totalCompositePrice,
	};
}

// ─────────────────────────────────────────────────────────────────────────────
// МИНЗДРАВ РФ ПРИКАЗ № 804Н — ПОЛНЫЕ КАТАЛОГИ НОМЕНКЛАТУРЫ МЕДИЦИНСКИХ УСЛУГ
// ─────────────────────────────────────────────────────────────────────────────

import { type Kopecks, parseKopecks, sumKopecks, multiplyKopecks } from "./utils/money.js";
import type { ToothSurface } from "./documents/forms043u.js";

export interface Order804nBillingLineItem {
	readonly code: string;
	readonly title: string;
	readonly category: string;
	readonly priceRub: number;
	readonly priceKopecks: Kopecks;
	readonly quantity: number;
	readonly totalRub: number;
	readonly totalKopecks: Kopecks;
	readonly totalPriceKopecks?: Kopecks;
	readonly isMandatory: boolean;
	readonly toothNumber?: number | string | null;
	readonly canalCount?: AnatomicalCanalCount | null;
}

export const ORDER_804N_THERAPY_CATALOG = {
	compositeFilling1Surface: {
		code: "A16.07.002.001",
		title: "Восстановление зуба пломбой I, V, VI класс по Блэку с использованием материалов из фотополимеров",
		category: "Терапевтическая стоматология",
		price: 4500,
	},
	compositeFillingMultiSurfaces: {
		code: "A16.07.002.002",
		title: "Восстановление зуба пломбой с нарушением контактного пункта II, III, IV класс по Блэку с использованием фотополимеров",
		category: "Терапевтическая стоматология",
		price: 5500,
	},
	cariesPreparation: {
		code: "A16.07.031",
		title: "Препарирование твердых тканей зуба при лечении кариеса",
		category: "Терапевтическая стоматология",
		price: 1200,
	},
	deepFluoridation: {
		code: "A11.07.012",
		title: "Глубокое фторирование эмали зуба",
		category: "Профилактическая стоматология",
		price: 900,
	},
	selectivePolishing: {
		code: "A16.07.025",
		title: "Избирательное пришлифовывание и полирование твердых тканей зуба",
		category: "Терапевтическая стоматология",
		price: 600,
	},
	inlayVeneerRestoration: {
		code: "A16.07.003",
		title: "Восстановление зуба вкладками, виниром, полукоронкой",
		category: "Терапевтическая стоматология",
		price: 15000,
	},
} as const;

export const ORDER_804N_SURGERY_CATALOG = {
	temporaryExtraction: {
		code: "A16.07.001.001",
		title: "Удаление временного зуба",
		category: "Хирургическая стоматология",
		price: 2000,
	},
	simpleExtraction: {
		code: "A16.07.001.002",
		title: "Удаление постоянного зуба",
		category: "Хирургическая стоматология",
		price: 3500,
	},
	complexExtraction: {
		code: "A16.07.001.003",
		title: "Удаление зуба сложное с разъединением корней",
		category: "Хирургическая стоматология",
		price: 6000,
	},
	retractedExtraction: {
		code: "A16.07.024",
		title: "Удаление ретинированного, дистопированного или сверхкомплектного зуба",
		category: "Хирургическая стоматология",
		price: 8500,
	},
	sutureApplication: {
		code: "A16.07.097",
		title: "Наложение шва на слизистую оболочку рта",
		category: "Хирургическая стоматология",
		price: 1500,
	},
	periostotomy: {
		code: "A16.07.017",
		title: "Вскрытие поднадкостничного очага воспаления (периостотомия)",
		category: "Хирургическая стоматология",
		price: 3000,
	},
	cystectomy: {
		code: "A16.07.016",
		title: "Цистотомия или цистэктомия в области челюсти",
		category: "Хирургическая стоматология",
		price: 7500,
	},
} as const;

export const ORDER_804N_PERIO_CATALOG = {
	prophyHygieneFull: {
		code: "A16.07.051",
		title: "Профессиональная гигиена полости рта и зубов",
		category: "Пародонтология",
		price: 4500,
	},
	ultrasonicScaling: {
		code: "A16.07.020",
		title: "Удаление наддесневых и поддесневых зубных отложений ультразвуком",
		category: "Пародонтология",
		price: 2500,
	},
	closedCurettage: {
		code: "A16.07.039",
		title: "Закрытый кюретаж при заболеваниях пародонта в области зуба",
		category: "Пародонтология",
		price: 1800,
	},
	openCurettage: {
		code: "A16.07.038",
		title: "Открытый кюретаж при заболеваниях пародонта в области зуба",
		category: "Пародонтология",
		price: 3200,
	},
	perioPocketMedication: {
		code: "A11.07.010",
		title: "Введение лекарственных препаратов в пародонтальный карман",
		category: "Пародонтология",
		price: 1200,
	},
	perioSplinting: {
		code: "A16.07.019",
		title: "Временное шинирование при заболеваниях пародонта (1 единица)",
		category: "Пародонтология",
		price: 2200,
	},
} as const;

export const ORDER_804N_ORTHO_CATALOG = {
	crownRestoration: {
		code: "A16.07.004",
		title: "Восстановление зуба коронкой постоянной",
		category: "Ортопедическая стоматология",
		price: 18000,
	},
	crownPreparation: {
		code: "A16.07.004.001",
		title: "Препарирование зуба под искусственную коронку",
		category: "Ортопедическая стоматология",
		price: 3500,
	},
	provisionalCrown: {
		code: "A16.07.004.002",
		title: "Изготовление и фиксация временной провизорной коронки",
		category: "Ортопедическая стоматология",
		price: 2500,
	},
	jawImpression: {
		code: "A02.07.010",
		title: "Снятие оттиска с одной челюсти",
		category: "Ортопедическая стоматология",
		price: 1500,
	},
	ceramicZirconiaCrown: {
		code: "A16.07.004",
		title: "Восстановление зуба коронкой постоянной безметалловой (диоксид циркония / E-max)",
		category: "Ортопедическая стоматология",
		price: 24000,
	},
} as const;

export const ORDER_804N_ANESTHESIA_CATALOG = {
	infiltration: {
		code: "B01.003.004.005",
		title: "Инфильтрационная анестезия",
		category: "Анестезиология",
		price: 800,
	},
	conduction: {
		code: "B01.003.004.004",
		title: "Проводниковая анестезия",
		category: "Анестезиология",
		price: 950,
	},
	application: {
		code: "B01.003.004.001",
		title: "Аппликационная анестезия",
		category: "Анестезиология",
		price: 400,
	},
} as const;

export const ORDER_804N_DIAGNOSTICS_CATALOG = {
	rvgIntraoral: {
		code: "A06.07.007",
		title: "Внутриротовая рентгенография (радиовизиография RVG)",
		category: "Рентгенология",
		price: 750,
	},
	optgPanoramic: {
		code: "A06.07.004",
		title: "Ортопантомография (панорамная томография ОПТГ)",
		category: "Рентгенология",
		price: 1800,
	},
	cbct3d: {
		code: "A06.07.013",
		title: "Конусно-лучевая компьютерная томография (КЛКТ челюстно-лицевой области)",
		category: "Рентгенология",
		price: 3500,
	},
} as const;

export interface ClinicalCase804nOptions {
	readonly fdiNumber?: number | string | null;
	readonly toothNumber?: number | string | null;
	readonly icd10Code: string;
	readonly surfaces?: readonly ToothSurface[] | null;
	readonly canalCount?: number | null | undefined;
	readonly clinicalCanalCount?: number | null | undefined;
	readonly specialty?: string | null | undefined;
	readonly isMultiVisit?: boolean | undefined;
	readonly endoVisitStage?: "access_instrumentation_temporary_calcium" | "final_obturation_restoration" | "single_visit_complete" | undefined;
	readonly isRetreatment?: boolean | undefined;
	readonly isDifficultExtraction?: boolean | undefined;
	readonly isRetracted?: boolean | undefined;
	readonly isDeciduous?: boolean | undefined;
	readonly includeAnesthesia?: boolean | undefined;
	readonly includeRvg?: boolean | undefined;
	readonly includeSutures?: boolean | undefined;
	readonly anesthesiaType?: "infiltration" | "mandibular" | "torus" | "application" | undefined;
	readonly cavityClass?: string | null | undefined;
}

/**
 * Автоматический маппинг клинического диагноза и анатомии зуба на точные коды номенклатуры 804н.
 */
export function getOrder804nServicesForClinicalCase(
	options: ClinicalCase804nOptions,
): Order804nBillingLineItem[] {
	const items: Order804nBillingLineItem[] = [];
	const toothRaw = options.toothNumber ?? options.fdiNumber;
	const fdi = typeof toothRaw === "string" ? parseInt(toothRaw, 10) : (toothRaw ?? null);
	const validFdi = fdi !== null && !Number.isNaN(fdi) ? fdi : null;
	const canalOverride = options.canalCount ?? options.clinicalCanalCount;
	const canalCount = validFdi
		? getAnatomicalRootCanalCount(validFdi, canalOverride ?? undefined)
		: (canalOverride ? (Math.min(4, Math.max(1, Math.round(canalOverride))) as AnatomicalCanalCount) : 1);

	const icd = (options.icd10Code || "").trim().toUpperCase();
	const isMultiSurface = Boolean(options.surfaces && options.surfaces.length >= 2);

	const createItem = (
		catalogItem: { code: string; title: string; category: string; price: number },
		isMandatory: boolean = true,
		quantity: number = 1,
		canalsOverride?: AnatomicalCanalCount,
	): Order804nBillingLineItem => {
		const priceKopecks = parseKopecks(catalogItem.price);
		const totalKopecks = multiplyKopecks(priceKopecks, quantity);
		return {
			code: catalogItem.code,
			title: catalogItem.title,
			category: catalogItem.category,
			priceRub: catalogItem.price,
			priceKopecks,
			quantity,
			totalRub: (catalogItem.price * quantity),
			totalKopecks,
			totalPriceKopecks: totalKopecks,
			isMandatory,
			toothNumber: validFdi,
			canalCount: canalsOverride ?? (canalsOverride === undefined && (catalogItem.category === "Эндодонтия" || icd.startsWith("K04")) ? canalCount : null),
		};
	};

	// 1. Анестезия (по умолчанию включена для инвазивных процедур)
	if (options.includeAnesthesia !== false) {
		const isLowerMolar = validFdi !== null && Math.floor(validFdi / 10) >= 3 && (validFdi % 10) >= 6;
		const anesth = isLowerMolar || options.anesthesiaType === "mandibular" || options.anesthesiaType === "torus"
			? ORDER_804N_ANESTHESIA_CATALOG.conduction
			: options.anesthesiaType === "application"
				? ORDER_804N_ANESTHESIA_CATALOG.application
				: ORDER_804N_ANESTHESIA_CATALOG.infiltration;
		items.push(createItem(anesth, true));
	}

	// 2. Эндодонтия (K04.0, K04.4, K04.5, K04.8)
	if (icd.startsWith("K04")) {
		// RVG снимок
		if (options.includeRvg !== false) {
			items.push(createItem(ORDER_804N_DIAGNOSTICS_CATALOG.rvgIntraoral, true));
		}

		// Распломбирование корневого канала при перелечивании (K04.5)
		if (icd === "K04.5" || options.isRetreatment) {
			items.push(createItem(ORDER_804N_UNSEALING, true, canalCount, canalCount));
		}

		// Инструментальная обработка каналов по числу анатомических каналов (1..4)
		const instItem = ORDER_804N_INSTRUMENTATION[canalCount];
		items.push(createItem(instItem, true, 1, canalCount));

		if (options.endoVisitStage === "access_instrumentation_temporary_calcium") {
			// Временная лечебная обтурация Ca(OH)2
			items.push(createItem(ORDER_804N_MEDICATION_CAOH2, true, 1, canalCount));
			// Временная пломба
			items.push(createItem(ORDER_804N_THERAPY_CATALOG.compositeFilling1Surface, true));
		} else if (options.endoVisitStage === "final_obturation_restoration") {
			// Трехмерная обтурация каналов
			const obtItem = ORDER_804N_OBTURATIONS[canalCount];
			items.push(createItem(obtItem, true, 1, canalCount));
			// Постоянная композитная реставрация
			items.push(
				createItem(
					isMultiSurface
						? ORDER_804N_THERAPY_CATALOG.compositeFillingMultiSurfaces
						: ORDER_804N_THERAPY_CATALOG.compositeFilling1Surface,
					true,
				),
			);
		} else {
			// Одноэтапное полное эндодонтическое лечение
			const obtItem = ORDER_804N_OBTURATIONS[canalCount];
			items.push(createItem(obtItem, true, 1, canalCount));

			if (icd === "K04.4" || icd === "K04.5" || icd === "K04.8") {
				// Включение лечебной противовоспалительной пасты при периодонтите
				items.push(createItem(ORDER_804N_MEDICATION_CAOH2, false, 1, canalCount));
			}

			// Постоянная композитная реставрация
			items.push(
				createItem(
					isMultiSurface
						? ORDER_804N_THERAPY_CATALOG.compositeFillingMultiSurfaces
						: ORDER_804N_THERAPY_CATALOG.compositeFilling1Surface,
					true,
				),
			);
		}
	} else if (icd === "K02.0") {
		// Кариес эмали (стадия пятна / начальный)
		items.push(createItem(ORDER_804N_THERAPY_CATALOG.deepFluoridation, true));
		items.push(createItem(ORDER_804N_THERAPY_CATALOG.compositeFilling1Surface, true));
		items.push(createItem(ORDER_804N_THERAPY_CATALOG.selectivePolishing, true));
	} else if (icd === "K02.1") {
		// Кариес дентина (средний / глубокий)
		items.push(createItem(ORDER_804N_THERAPY_CATALOG.cariesPreparation, true));
		items.push(
			createItem(
				isMultiSurface
					? ORDER_804N_THERAPY_CATALOG.compositeFillingMultiSurfaces
					: ORDER_804N_THERAPY_CATALOG.compositeFilling1Surface,
				true,
			),
		);
		items.push(createItem(ORDER_804N_THERAPY_CATALOG.deepFluoridation, false));
	} else if (icd === "K02.2") {
		// Кариес цемента корня
		items.push(createItem(ORDER_804N_THERAPY_CATALOG.cariesPreparation, true));
		items.push(createItem(ORDER_804N_THERAPY_CATALOG.compositeFilling1Surface, true));
		items.push(createItem(ORDER_804N_THERAPY_CATALOG.deepFluoridation, true));
	} else if (icd.startsWith("K03")) {
		// Некариозные поражения (клиновидный дефект, стираемость, эрозия)
		items.push(createItem(ORDER_804N_THERAPY_CATALOG.cariesPreparation, true));
		items.push(createItem(ORDER_804N_THERAPY_CATALOG.compositeFilling1Surface, true));
		items.push(createItem(ORDER_804N_THERAPY_CATALOG.deepFluoridation, true));
	} else if (icd === "K05.0" || icd === "K05.1") {
		// Гингивит (острый / хронический)
		items.push(createItem(ORDER_804N_PERIO_CATALOG.prophyHygieneFull, true));
		items.push(createItem(ORDER_804N_PERIO_CATALOG.ultrasonicScaling, true));
		items.push(createItem(ORDER_804N_PERIO_CATALOG.perioPocketMedication, true));
	} else if (icd === "K05.3") {
		// Пародонтит хронический
		items.push(createItem(ORDER_804N_PERIO_CATALOG.prophyHygieneFull, true));
		items.push(createItem(ORDER_804N_PERIO_CATALOG.ultrasonicScaling, true));
		items.push(createItem(ORDER_804N_PERIO_CATALOG.closedCurettage, true));
		items.push(createItem(ORDER_804N_PERIO_CATALOG.perioPocketMedication, true));
	} else if (
		icd === "K08.1" ||
		icd === "K01.1" ||
		icd === "K00.6" ||
		options.specialty === "surgery" ||
		options.isRetracted
	) {
		// Хирургическое удаление зуба
		if (options.includeRvg !== false) {
			items.push(createItem(ORDER_804N_DIAGNOSTICS_CATALOG.rvgIntraoral, true));
		}
		const isDeciduous =
			options.isDeciduous ||
			icd === "K00.6" ||
			(validFdi !== null && validFdi >= 51 && validFdi <= 85);
		const isRetracted = options.isRetracted || icd === "K01.1";
		const isMulti = validFdi ? isMultiRootedTooth(validFdi) : (canalCount > 1);

		const extraction = isDeciduous
			? ORDER_804N_SURGERY_CATALOG.temporaryExtraction
			: isRetracted
				? ORDER_804N_SURGERY_CATALOG.retractedExtraction
				: isMulti || options.isDifficultExtraction
					? ORDER_804N_SURGERY_CATALOG.complexExtraction
					: ORDER_804N_SURGERY_CATALOG.simpleExtraction;

		items.push(createItem(extraction, true));
		if (options.includeSutures) {
			items.push(createItem(ORDER_804N_SURGERY_CATALOG.sutureApplication, true));
		}
	} else if (icd.includes("ORTHO") || options.specialty === "orthopedics" || icd === "Z51.8") {
		// Ортопедия — коронка
		items.push(createItem(ORDER_804N_ORTHO_CATALOG.crownRestoration, true));
		items.push(createItem(ORDER_804N_ORTHO_CATALOG.crownPreparation, true));
		items.push(createItem(ORDER_804N_ORTHO_CATALOG.jawImpression, true, 2));
		items.push(createItem(ORDER_804N_ORTHO_CATALOG.provisionalCrown, true));
	} else {
		// Универсальный fallback на кариес дентина
		items.push(createItem(ORDER_804N_THERAPY_CATALOG.cariesPreparation, true));
		items.push(createItem(ORDER_804N_THERAPY_CATALOG.compositeFilling1Surface, true));
	}

	return items;
}

export interface Order804nBillingEstimateResult {
	readonly fdiNumber?: number | null;
	readonly icd10Code: string;
	readonly canalCount?: AnatomicalCanalCount | null;
	readonly items: readonly Order804nBillingLineItem[];
	readonly lineItems: readonly Order804nBillingLineItem[];
	readonly totalKopecks: Kopecks;
	readonly totalRub: number;
	readonly formattedTotal: string;
	readonly invoiceLines: readonly {
		readonly code: string;
		readonly title: string;
		readonly unitPriceRub: number;
		readonly quantity: number;
		readonly totalRub: number;
		readonly toothNumber?: string | null;
	}[];
}

/**
 * Расчет полной сметы и позиций счёта по номенклатуре Минздрава 804н с копеечной точностью.
 */
export function calculateOrder804nBillingEstimate(
	options: ClinicalCase804nOptions,
): Order804nBillingEstimateResult {
	const items = getOrder804nServicesForClinicalCase(options);
	const toothRaw = options.toothNumber ?? options.fdiNumber;
	const fdi = typeof toothRaw === "string" ? parseInt(toothRaw, 10) : (toothRaw ?? null);
	const validFdi = fdi !== null && !Number.isNaN(fdi) ? fdi : null;
	const canalOverride = options.canalCount ?? options.clinicalCanalCount;
	const canalCount = validFdi
		? getAnatomicalRootCanalCount(validFdi, canalOverride ?? undefined)
		: (canalOverride ? (Math.min(4, Math.max(1, Math.round(canalOverride))) as AnatomicalCanalCount) : 1);

	const totalKopecks = sumKopecks(items.map((i) => i.totalKopecks));
	const totalRub = totalKopecks / 100;
	const rubles = Math.floor(totalKopecks / 100);
	const kopecks = totalKopecks % 100;
	const formattedTotal = `${rubles.toLocaleString("ru-RU")},${kopecks.toString().padStart(2, "0")} ₽`;

	const invoiceLines = items.map((item) => ({
		code: item.code,
		title: item.title,
		unitPriceRub: item.priceRub,
		quantity: item.quantity,
		totalRub: item.totalRub,
		toothNumber: validFdi ? String(validFdi) : null,
	}));

	return {
		fdiNumber: validFdi,
		icd10Code: options.icd10Code,
		canalCount,
		items,
		lineItems: items,
		totalKopecks,
		totalRub,
		formattedTotal,
		invoiceLines,
	};
}


