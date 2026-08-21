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
