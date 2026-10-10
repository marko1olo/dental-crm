/**
 * DENTE Dental CRM — Minzdrav Order 804n Nomenclature Matcher
 * Layer 2: Statutory Catalogs & Canal-to-Code Matching Rules
 */

import type {
	AnatomicalCanalCount,
	EndodonticOrder804nPair,
	Order804nEndoItem,
	Order804nNomenclatureCategory,
} from "./types.js";
import { getAnatomicalRootCanalCount } from "./toothCanalAnatomyMap.js";

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

export const ORDER_804N_COFFERDAM_ISOLATION = {
	code: "A16.07.082.001",
	title: "Изоляция рабочего поля коффердамом / раббердамом",
	category: "Терапевтическая стоматология",
	price: 800,
} as const;

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

/**
 * Сопоставляет количество корневых каналов с номенклатурным кодом Минздрава 804н
 */
export function mapCanalsTo804nCode(
	canalCount: number,
	procedureType: "instrumentation" | "obturation" | "package" = "obturation",
): string {
	const clamped = Math.min(4, Math.max(1, Math.round(canalCount))) as AnatomicalCanalCount;
	switch (procedureType) {
		case "instrumentation":
			return ORDER_804N_INSTRUMENTATION[clamped].code;
		case "package":
			return ORDER_804N_ENDODONTIC_PACKAGES[clamped].code;
		case "obturation":
		default:
			return ORDER_804N_OBTURATIONS[clamped].code;
	}
}

/**
 * Регулярное выражение для проверки соответствия коду Номенклатуры медицинских услуг Минздрава РФ (Приказ № 804н).
 * Форматы: A16.07.002, A16.07.002.001, B01.065.001, A06.07.003, A11.07.012.
 */
export const ORDER_804N_CODE_REGEX = /^[AB]\d{2}\.\d{2,3}(?:\.\d{3}){0,2}$/i;

/**
 * Проверяет, является ли переданная строка валидным кодом Номенклатуры Минздрава РФ 804н.
 */
export function isValidOrder804nCode(code: string): boolean {
	if (!code || typeof code !== "string") return false;
	return ORDER_804N_CODE_REGEX.test(code.trim());
}

/**
 * Автоматически определяет клиническую категорию услуги по префиксу кода 804н или названию.
 */
export function detectOrder804nCategory(code: string, title?: string): Order804nNomenclatureCategory {
	const trimmed = (code || "").trim().toUpperCase();
	const titleLower = (title || "").toLowerCase();

	if (
		trimmed.startsWith("PKG") ||
		trimmed.startsWith("CLINIC.") ||
		titleLower.includes("пакет") ||
		titleLower.includes("комплекс") ||
		titleLower.includes("сертификат") ||
		titleLower.includes("капа")
	) {
		return "package";
	}

	if (trimmed.startsWith("B01.065") || trimmed.startsWith("B01.066")) {
		return "consultation";
	}
	if (trimmed.startsWith("B01.003")) {
		return "anesthesia";
	}
	if (trimmed.startsWith("A06.07") || trimmed.startsWith("A02.07")) {
		return "radiology";
	}
	if (trimmed.startsWith("A16.07.051") || trimmed.startsWith("A11.07.012") || trimmed.startsWith("A16.07.050")) {
		return "hygiene";
	}
	if (
		trimmed.startsWith("A16.07.038") ||
		trimmed.startsWith("A16.07.039") ||
		trimmed.startsWith("A16.07.040") ||
		trimmed.startsWith("A16.07.019") ||
		trimmed.startsWith("A16.07.020") ||
		trimmed.startsWith("A11.07.010")
	) {
		return "periodontics";
	}
	if (trimmed.startsWith("A16.07.047") || trimmed.startsWith("A16.07.048") || trimmed.startsWith("A16.07.046")) {
		return "orthodontics";
	}
	if (
		trimmed.startsWith("A16.07.006") ||
		trimmed.startsWith("A16.07.035") ||
		trimmed.startsWith("A16.07.036") ||
		trimmed.startsWith("A16.07.037") ||
		trimmed.startsWith("A16.07.049") ||
		trimmed.startsWith("A16.07.053")
	) {
		return "orthopedics";
	}
	if (
		trimmed.startsWith("A16.07.001") ||
		trimmed.startsWith("A16.07.024") ||
		trimmed.startsWith("A16.07.054") ||
		trimmed.startsWith("A16.07.055") ||
		trimmed.startsWith("A16.07.007") ||
		trimmed.startsWith("A16.07.041") ||
		trimmed.startsWith("A16.07.017") ||
		trimmed.startsWith("A16.07.016") ||
		trimmed.startsWith("A16.07.011") ||
		trimmed.startsWith("A16.07.012")
	) {
		return "surgery";
	}
	if (
		trimmed.startsWith("A16.07.002") ||
		trimmed.startsWith("A16.07.008") ||
		trimmed.startsWith("A16.07.030") ||
		trimmed.startsWith("A16.07.082") ||
		trimmed.startsWith("A16.07.091") ||
		trimmed.startsWith("A16.07.003") ||
		trimmed.startsWith("A16.07.031")
	) {
		return "therapy";
	}
	return "other";
}
