/**
 * packages/shared/src/clinical/dentalFormulaSurfaces.ts
 *
 * DENTE Dental CRM — Canonical Tooth Surfaces SSOT (Bidirectional RU <-> FDI Parser).
 *
 * Invariants & Standards:
 * - 5 International Anatomical Surfaces (M, D, O, V, L) + Cervical (C).
 * - Full Bidirectional Mapping: Russian (О, В/Щ, Я/Н, М, Д, П/Ц) <-> FDI / International (O, V, L/P, M, D, C).
 * - Compound Black Classification acronym expansion (MOD, MO, DO, Class V).
 * - Zero cartoon emojis (Mandate 8d Item 7).
 */

import { isMaxillaryTooth } from "./dentalFormulaFdi.js";

// ============================================================================
// 1. CANONICAL TOOTH SURFACES SSOT (ОБОЗНАЧЕНИЯ ПОВЕРХНОСТЕЙ)
// ============================================================================

/**
 * 6 канонических анатомических поверхностей:
 * - O: Occlusal / Incisal (окклюзионная / жевательная / режущий край)
 * - V: Vestibular / Buccal / Labial (вестибулярная / щечная / губная)
 * - L: Lingual / Palatal (язычная на нижней челюсти, нёбная на верхней)
 * - M: Mesial (медиальная / мезиальная / передняя контактная)
 * - D: Distal (дистальная / задняя контактная)
 * - C: Cervical (пришеечная / цервикальная область)
 */
export const CANONICAL_SURFACES = ["O", "V", "L", "M", "D", "C"] as const;
export type CanonicalSurfaceKey = (typeof CANONICAL_SURFACES)[number];

/**
 * Канонический тип поверхности зуба (5 международных граней + пришеечная C).
 * M — медиальная (mesial)
 * O — окклюзионная / режущая (occlusal / incisal)
 * D — дистальная (distal)
 * V — вестибулярная / щечная / губная (vestibular / buccal / labial)
 * L — язычная / нёбная (lingual / palatal)
 * C — цервикальная / пришеечная (cervical)
 */
export type ToothSurfaceKey = "M" | "O" | "D" | "V" | "L" | "C";

/**
 * Канонический клинический статус анатомической поверхности:
 * - healthy: здоровая / интактная ткань
 * - caries: кариозное поражение (стадия пятна, поверхностный, средний, глубокий)
 * - filling: состоятельная реставрация / пломба
 * - secondary_caries: вторичный кариес по границе ранее установленной пломбы
 * - defect: дефект реставрации / краевая разгерметизация / скол эмали
 * - inlay: керамическая/композитная вкладка (Inlay/Onlay/Overlay)
 * - fracture: перелом / трещина поверхности
 */
export type SurfaceClinicalStatus =
	| "healthy"
	| "caries"
	| "filling"
	| "secondary_caries"
	| "defect"
	| "inlay"
	| "fracture";

/**
 * Каноническая карта состояний поверхностей зуба.
 * Изоляция поверхностей (Мандат 8ar/8as): кариес на окклюзии никогда не затирает пломбу на медиальной грани.
 */
export type ToothSurfaceStateMap = Partial<Record<ToothSurfaceKey, SurfaceClinicalStatus>>;

/**
 * Битовые маски поверхностей зуба (0..63) для мгновенной битовой фильтрации и изоляции:
 * M: 1 << 0 (1)
 * O: 1 << 1 (2)
 * D: 1 << 2 (4)
 * V: 1 << 3 (8)
 * L: 1 << 4 (16)
 * C: 1 << 5 (32)
 */
export const SURFACE_BIT_MASKS: Readonly<Record<ToothSurfaceKey, number>> = Object.freeze({
	M: 1 << 0, // 1
	O: 1 << 1, // 2
	D: 1 << 2, // 4
	V: 1 << 3, // 8
	L: 1 << 4, // 16
	C: 1 << 5, // 32
});

/** Канонический порядок перечисления поверхностей (MODVLC) */
export const CANONICAL_SURFACE_ORDER: readonly ToothSurfaceKey[] = Object.freeze([
	"M",
	"O",
	"D",
	"V",
	"L",
	"C",
] as const);

/** 5 стандартных поверхностей по международному стандарту ВОЗ/СтАР */
export const STANDARD_5_SURFACES = ["O", "V", "L", "M", "D"] as const;
export type Standard5SurfaceKey = (typeof STANDARD_5_SURFACES)[number];

/**
 * 5 Standard tooth surfaces in M, D, O, V, L sequence (Wave 131 & Odontogram Engine contract):
 * - M: Mesial (медиальная / к средней линии)
 * - D: Distal (дистальная / от средней линии)
 * - O: Occlusal / Incisal (окклюзионная / режущий край)
 * - V: Vestibular (вестибулярная / щёчная / губная)
 * - L: Lingual / Palatal (язычная / нёбная)
 */
export const TOOTH_SURFACES = ["M", "D", "O", "V", "L"] as const;
export type Surface = (typeof TOOTH_SURFACES)[number];

export const SURFACE_NAMES_RU: Readonly<Record<Surface, string>> = Object.freeze({
	M: "Медиальная (M)",
	D: "Дистальная (D)",
	O: "Окклюзионная/Режущая (O)",
	V: "Вестибулярная (V)",
	L: "Язычная/Нёбная (L)",
});

export const TOP_SURFACE_KEYS = ["O", "V", "P", "M", "D", "C"] as const;
export const BOTTOM_SURFACE_KEYS = ["O", "V", "L", "M", "D", "C"] as const;

export interface SurfaceDescriptor {
	readonly key: CanonicalSurfaceKey;
	readonly nameRu: string;
	readonly shortRu: string;
	readonly letterRu: string;
	readonly letterEn: string;
	readonly descriptionRu: string;
	readonly blackClassDefault?: string;
}

export const CANONICAL_SURFACE_DESCRIPTORS: Readonly<Record<CanonicalSurfaceKey, SurfaceDescriptor>> = Object.freeze({
	O: {
		key: "O",
		nameRu: "Окклюзионная (жевательная) / режущий край",
		shortRu: "Оккл.",
		letterRu: "О",
		letterEn: "O",
		descriptionRu: "Жевательная или режущая поверхность коронки зуба (I класс по Блэку)",
		blackClassDefault: "class_I",
	},
	V: {
		key: "V",
		nameRu: "Вестибулярная (щечная / губная)",
		shortRu: "Вестиб.",
		letterRu: "В",
		letterEn: "V",
		descriptionRu: "Наружная щечная или губная поверхность коронки (V класс по Блэку)",
		blackClassDefault: "class_V",
	},
	L: {
		key: "L",
		nameRu: "Язычная / нёбная (оральная)",
		shortRu: "Орал.",
		letterRu: "Я",
		letterEn: "L",
		descriptionRu: "Внутренняя язычная или нёбная поверхность коронки",
		blackClassDefault: "class_V",
	},
	M: {
		key: "M",
		nameRu: "Медиальная (мезиальная / передняя контактная)",
		shortRu: "Медиал.",
		letterRu: "М",
		letterEn: "M",
		descriptionRu: "Передняя апроксимальная контактная поверхность (II, III, IV класс по Блэку)",
		blackClassDefault: "class_II",
	},
	D: {
		key: "D",
		nameRu: "Дистальная (задняя контактная)",
		shortRu: "Дистал.",
		letterRu: "Д",
		letterEn: "D",
		descriptionRu: "Задняя апроксимальная контактная поверхность (II, III, IV класс по Блэку)",
		blackClassDefault: "class_II",
	},
	C: {
		key: "C",
		nameRu: "Пришеечная (цервикальная / десневая треть)",
		shortRu: "Пришееч.",
		letterRu: "П",
		letterEn: "C",
		descriptionRu: "Пришеечная область коронки зуба у границы эмаль-цемент (V класс по Блэку)",
		blackClassDefault: "class_V",
	},
});

// ============================================================================
// 2. ДВУНАПРАВЛЕННЫЙ ПАРСЕР И НОРМАЛИЗАТОР ПОВЕРХНОСТЕЙ (RU <-> FDI)
// ============================================================================

/**
 * Единый канонический нормализатор поверхности зуба (Двунаправленный RU <-> FDI парсер).
 * Обрабатывает:
 * - O: 'O', 'OCC', 'OCCLUSAL', 'I', 'INCISAL', 'О', 'ОККЛ', 'РЕЖ', 'РЕЖУЩИЙ', 'ЖЕВАТЕЛЬНАЯ'
 * - V: 'V', 'B', 'BUCCAL', 'VESTIBULAR', 'LABIAL', 'В', 'Щ', 'ВЕСТ', 'ЩЕЧ', 'ЩЕЧНАЯ', 'ГУБНАЯ'
 * - L: 'L', 'P', 'LINGUAL', 'PALATAL', 'ORAL', 'Я', 'Н', 'ЯЗ', 'НЕБ', 'НЁБ', 'ЯЗЫЧНАЯ', 'НЕБНАЯ', 'НЁБНАЯ', 'ОРАЛЬНАЯ'
 * - M: 'M', 'MESIAL', 'М', 'МЕД', 'МЕЗ', 'МЕДИАЛЬНАЯ', 'МЕЗИАЛЬНАЯ'
 * - D: 'D', 'DISTAL', 'Д', 'ДИСТ', 'ДИСТАЛЬНАЯ'
 * - C: 'C', 'CERVICAL', 'П', 'Ц', 'ПРИШ', 'ЦЕРВ', 'ПРИШЕЕЧНАЯ', 'ЦЕРВИКАЛЬНАЯ'
 */
export function normalizeCanonicalSurface(surface: string | null | undefined): CanonicalSurfaceKey | null {
	if (!surface) return null;
	const s = surface.trim().toUpperCase().replace(/Ё/g, "Е");

	// 1. Окклюзионная / режущая
	if (
		s === "O" ||
		s === "О" ||
		s === "OCC" ||
		s === "OCCLUSAL" ||
		s === "I" ||
		s === "INCISAL" ||
		s === "ОККЛ" ||
		s === "РЕЖ" ||
		s === "РЕЖУЩИЙ" ||
		s === "РЕЖУЩИЙ КРАЙ" ||
		s === "ЖЕВАТЕЛЬНАЯ" ||
		s === "ОККЛЮЗИОННАЯ"
	) {
		return "O";
	}

	// 2. Вестибулярная / щечная / губная
	if (
		s === "V" ||
		s === "В" ||
		s === "B" ||
		s === "Щ" ||
		s === "BUCCAL" ||
		s === "VESTIBULAR" ||
		s === "LABIAL" ||
		s === "ВЕСТ" ||
		s === "ВЕСТИБ" ||
		s === "ЩЕЧ" ||
		s === "ЩЕЧН" ||
		s === "ЩЕЧНАЯ" ||
		s === "ГУБНАЯ" ||
		s === "ВЕСТИБУЛЯРНАЯ"
	) {
		return "V";
	}

	// 3. Язычная / нёбная / оральная
	if (
		s === "L" ||
		s === "Я" ||
		s === "P" ||
		s === "Н" ||
		s === "LINGUAL" ||
		s === "PALATAL" ||
		s === "ORAL" ||
		s === "ЯЗ" ||
		s === "ЯЗЫЧН" ||
		s === "НЕБ" ||
		s === "НЕБН" ||
		s === "ЯЗЫЧНАЯ" ||
		s === "НЕБНАЯ" ||
		s === "ОРАЛЬНАЯ"
	) {
		return "L";
	}

	// 4. Медиальная / мезиальная
	if (
		s === "M" ||
		s === "М" ||
		s === "MESIAL" ||
		s === "МЕД" ||
		s === "МЕЗ" ||
		s === "МЕДИАЛ" ||
		s === "МЕЗИАЛ" ||
		s === "МЕДИАЛЬНАЯ" ||
		s === "МЕЗИАЛЬНАЯ"
	) {
		return "M";
	}

	// 5. Дистальная
	if (
		s === "D" ||
		s === "Д" ||
		s === "DISTAL" ||
		s === "ДИСТ" ||
		s === "ДИСТАЛ" ||
		s === "ДИСТАЛЬНАЯ"
	) {
		return "D";
	}

	// 6. Пришеечная / цервикальная
	if (
		s === "C" ||
		s === "П" ||
		s === "Ц" ||
		s === "CERVICAL" ||
		s === "ПРИШ" ||
		s === "ПРИШЕЕЧ" ||
		s === "ЦЕРВ" ||
		s === "ЦЕРВИК" ||
		s === "ПРИШЕЕЧНАЯ" ||
		s === "ЦЕРВИКАЛЬНАЯ"
	) {
		return "C";
	}

	return null;
}

export const normalizeSurfaceKey = normalizeCanonicalSurface;

/**
 * Нормализует список или строку поверхностей, разворачивая составные акронимы
 * (например, 'MOD' -> ['O', 'M', 'D'], 'MO' -> ['O', 'M'], 'Класс V' -> ['V', 'C']).
 */
export function normalizeCanonicalSurfaces(
	input?: readonly string[] | string | null | undefined,
): CanonicalSurfaceKey[] {
	if (!input) return [];

	const rawItems = Array.isArray(input) ? input : [input];
	const resultSet = new Set<CanonicalSurfaceKey>();

	for (const item of rawItems) {
		if (!item || typeof item !== "string") continue;
		const fullUpper = item.trim().toUpperCase().replace(/Ё/g, "Е");
		if (!fullUpper) continue;

		// 1. Проверка цельной строки на Class V / режущий край до разбиения по пробелам
		if (
			fullUpper === "CLASS V" ||
			fullUpper === "CLASS_V" ||
			fullUpper === "CLASSV" ||
			fullUpper.startsWith("КЛАСС V") ||
			fullUpper.startsWith("КЛАСС 5") ||
			fullUpper.startsWith("V КЛАСС") ||
			fullUpper === "V_CERVICAL" ||
			fullUpper === "GINGIVAL" ||
			fullUpper === "ШЕЙКА"
		) {
			resultSet.add("C");
			continue;
		}

		const directFull = normalizeCanonicalSurface(fullUpper);
		if (directFull) {
			resultSet.add(directFull);
			continue;
		}

		// 2. Разбиение по разделителям (запятые, точки с запятой, пробелы, слеши, плюсы)
		const tokens = fullUpper.split(/[,;\s/+]+/);
		for (const token of tokens) {
			const upper = token.trim();
			if (!upper) continue;

			if (
				upper === "CLASS_V" ||
				upper === "CLASSV" ||
				upper === "V_CERVICAL" ||
				upper === "GINGIVAL" ||
				upper === "ШЕЙКА"
			) {
				resultSet.add("C");
				continue;
			}

			const single = normalizeCanonicalSurface(upper);
			if (single) {
				resultSet.add(single);
				continue;
			}

			// 3. Составные клинические аббревиатуры поверхностей (MOD, MO, DO, OVD, МОД и др.)
			const cleanChars = upper.replace(/[^A-ZА-Я0-9]/g, "");
			if (
				cleanChars.length >= 2 &&
				cleanChars.length <= 6 &&
				/^[MODVLBPCIGМОДВЩЛПЯНСГИ]+$/.test(cleanChars)
			) {
				for (const char of cleanChars) {
					if (char === "M" || char === "М") resultSet.add("M");
					else if (char === "O" || char === "О" || char === "I" || char === "И") resultSet.add("O");
					else if (char === "D" || char === "Д") resultSet.add("D");
					else if (char === "V" || char === "В" || char === "B" || char === "Щ") resultSet.add("V");
					else if (char === "L" || char === "Л" || char === "P" || char === "Я" || char === "Н") resultSet.add("L");
					else if (char === "C" || char === "С" || char === "G") resultSet.add("C");
				}
			}
		}
	}

	return Array.from(resultSet);
}

export const normalizeAnatomicalSurfaces = normalizeCanonicalSurfaces;

/**
 * Проверяет, активна ли поверхность в списке поверхностей зуба.
 */
export function isSurfaceActive(
	surfKey: CanonicalSurfaceKey | string,
	activeSurfaces?: readonly string[] | string | null | undefined,
): boolean {
	if (!activeSurfaces) return false;
	const normKey = normalizeCanonicalSurface(surfKey);
	if (!normKey) return false;
	const normalized = normalizeCanonicalSurfaces(activeSurfaces);
	return normalized.includes(normKey);
}

/**
 * Человекопонятное форматирование списка поверхностей на чистом русском языке для Формы 043/у.
 * Защищено от 'undefined', 'null' и пустых массивов.
 */
export function formatSurfacesRu(surfaces?: readonly string[] | null): string {
	const valid = (surfaces ?? [])
		.map((s) => (s ?? "").trim())
		.filter((s) => s.length > 0 && s.toLowerCase() !== "undefined" && s.toLowerCase() !== "null");

	if (valid.length === 0) return "коронковой части";

	const labels = valid.map((raw) => {
		const upper = raw.toUpperCase().replace(/Ё/g, "Е");
		if (upper === "P" || upper === "Н" || upper === "НЕБНАЯ") return "нёбная";
		if (upper === "B" || upper === "Щ" || upper === "ЩЕЧНАЯ") return "вестибулярная (щечная)";
		if (upper === "L" || upper === "Я" || upper === "ЯЗЫЧНАЯ") return "язычная";
		const norm = normalizeCanonicalSurface(upper);
		switch (norm) {
			case "O": return "окклюзионная (жевательная)";
			case "V": return "вестибулярная (щечная/губная)";
			case "L": return "язычная";
			case "M": return "мезиальная (медиальная)";
			case "D": return "дистальная";
			case "C": return "пришеечная";
			default: return raw;
		}
	});

	return labels.join(", ");
}

/**
 * Возвращает ориентацию язычной/нёбной поверхности в зависимости от челюсти:
 * На верхней челюсти оральная поверхность — нёбная (Palatal, P).
 * На нижней челюсти оральная поверхность — язычная (Lingual, L).
 */
export function getArchSpecificAspect(
	surfaceKey: CanonicalSurfaceKey,
	toothNumber: number,
): { key: string; labelRu: string; shortRu: string } {
	if (surfaceKey === "L") {
		if (isMaxillaryTooth(toothNumber)) {
			return { key: "P", labelRu: "Нёбная (P)", shortRu: "Нёбн." };
		}
		return { key: "L", labelRu: "Язычная (L)", shortRu: "Язычн." };
	}
	const desc = CANONICAL_SURFACE_DESCRIPTORS[surfaceKey];
	return { key: desc.key, labelRu: desc.nameRu, shortRu: desc.shortRu };
}

// ============================================================================
// 3. БИТОВЫЕ МАСКИ И ОПЕРАЦИИ ИЗОЛЯЦИИ ПОВЕРХНОСТЕЙ (MODBL / WHEELER 2.5D)
// ============================================================================

/**
 * Кодирует набор поверхностей в целое число — битовую маску (0..63).
 */
export function encodeSurfacesToBitMask(surfaces?: readonly (ToothSurfaceKey | string)[] | null): number {
	if (!surfaces || surfaces.length === 0) return 0;
	let mask = 0;
	for (const s of surfaces) {
		const norm = normalizeCanonicalSurface(s);
		if (norm && norm in SURFACE_BIT_MASKS) {
			mask |= SURFACE_BIT_MASKS[norm as ToothSurfaceKey];
		}
	}
	return mask;
}

/**
 * Декодирует битовую маску в канонический массив граней в порядке M, O, D, V, L, C.
 */
export function decodeSurfacesFromBitMask(mask: number): ToothSurfaceKey[] {
	if (!mask || mask <= 0) return [];
	const result: ToothSurfaceKey[] = [];
	for (const key of CANONICAL_SURFACE_ORDER) {
		if ((mask & SURFACE_BIT_MASKS[key]) !== 0) {
			result.push(key);
		}
	}
	return result;
}

/**
 * Слияние карт состояний поверхностей с сохранением анатомической изоляции.
 * Кариес на окклюзии никогда не затирает пломбу на медиальной или дистальной грани.
 */
export function mergeToothSurfaceStates(
	current: ToothSurfaceStateMap,
	incoming: ToothSurfaceStateMap,
): ToothSurfaceStateMap {
	return {
		...current,
		...incoming,
	};
}

// ============================================================================
// 4. РЕЗОЛВЕР УСЛУГ ПО БЛЭКУ (НОМЕНКЛАТУРА 804н МИНЗДРАВА РФ)
// ============================================================================

export interface BlackRestorationServiceResolution {
	readonly serviceCode: "A16.07.002.001" | "A16.07.002.002";
	readonly code804n: "A16.07.002.001" | "A16.07.002.002";
	readonly nameRu: string;
	readonly priceKopecks: number; // 450 000 или 550 000 копеек
	readonly blackClass: "I" | "II" | "III" | "IV" | "V" | "VI";
	readonly involvesContactSurfaces: boolean;
	readonly surfaces: readonly ToothSurfaceKey[];
}

/**
 * Канонический резолвер услуг по Блэку (Номенклатура Минздрава 804н).
 * - A16.07.002.001 (450 000 коп.) — Восстановление зуба пломбой I, V, VI класс по Блэку
 * - A16.07.002.002 (550 000 коп.) — Восстановление зуба пломбой с нарушением контактного пункта зуба (II, III, IV класс по Блэку при поражении M/D граней)
 */
export function resolveBlackRestorationService(
	surfaces: readonly (ToothSurfaceKey | string)[],
): BlackRestorationServiceResolution {
	const normalized = normalizeCanonicalSurfaces(surfaces) as ToothSurfaceKey[];
	const hasMesial = normalized.includes("M");
	const hasDistal = normalized.includes("D");
	const hasOcclusal = normalized.includes("O");
	const hasCervical = normalized.includes("C");
	const hasVestibular = normalized.includes("V");
	const hasLingual = normalized.includes("L");

	// Поражение контактных пунктов M или D (II, III, IV класс по Блэку)
	if (hasMesial || hasDistal) {
		const blackClass = hasOcclusal ? "II" : "III";
		return {
			serviceCode: "A16.07.002.002",
			code804n: "A16.07.002.002",
			nameRu: "Восстановление зуба пломбой с нарушением контактного пункта зуба (II, III, IV класс по Блэку)",
			priceKopecks: 550_000,
			blackClass,
			involvesContactSurfaces: true,
			surfaces: normalized,
		};
	}

	// Поражение без вовлечения контактных пунктов: I, V, VI классы
	let blackClass: "I" | "V" | "VI" = "I";
	if (hasCervical || (hasVestibular && !hasOcclusal) || (hasLingual && !hasOcclusal)) {
		blackClass = "V";
	} else if (hasOcclusal) {
		blackClass = "I";
	}

	return {
		serviceCode: "A16.07.002.001",
		code804n: "A16.07.002.001",
		nameRu: "Восстановление зуба пломбой I, V, VI класс по Блэку с использованием материалов из фотополимеров",
		priceKopecks: 450_000,
		blackClass,
		involvesContactSurfaces: false,
		surfaces: normalized,
	};
}

// ============================================================================
// 5. СОСТАВНОЙ МКБ-10 КОД С КАНОНИЧЕСКИМ ПОРЯДКОМ ГРАНЕЙ (MODVLC)
// ============================================================================

/**
 * Формирует составной код диагноза МКБ-10 с каноническим порядком граней M, O, D, V, L, C.
 * Пример: buildCompositeIcd10Code("K02.1", ["O", "D", "M"]) -> "K02.1/MOD"
 */
export function buildCompositeIcd10Code(
	baseIcd: string,
	surfaces?: readonly (ToothSurfaceKey | string)[] | null,
): string {
	const trimmed = (baseIcd ?? "").trim();
	if (!trimmed) return "";
	if (!surfaces || surfaces.length === 0) return trimmed;

	const normalized = normalizeCanonicalSurfaces(surfaces) as ToothSurfaceKey[];
	if (normalized.length === 0) return trimmed;

	const orderMap: Record<ToothSurfaceKey, number> = {
		M: 0,
		O: 1,
		D: 2,
		V: 3,
		L: 4,
		C: 5,
	};

	const sorted = normalized
		.filter((k): k is ToothSurfaceKey => k in orderMap)
		.sort((a, b) => orderMap[a] - orderMap[b]);

	if (sorted.length === 0) return trimmed;
	const acronym = sorted.join("");

	if (trimmed.includes(`/${acronym}`) || trimmed.endsWith(`.${acronym}`)) {
		return trimmed;
	}
	const sep = trimmed.endsWith("/") ? "" : "/";
	return `${trimmed}${sep}${acronym}`;
}
