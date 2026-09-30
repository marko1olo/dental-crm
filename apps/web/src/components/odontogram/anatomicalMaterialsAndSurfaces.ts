/**
 * DENTE Dental CRM — Anatomical Materials, Surfaces & Periodontal Markers
 */

import type { ToothState } from "./ToothChart";
import type {
	AnatomicalSurfaceKey,
	CanalObturationMaterial,
	FurcationGrade,
	FurcationMarkerSvg,
	IcdasClassificationDetail,
	IcdasCode,
	PeriodontalBoneLossPattern,
	RestorativeMaterialKey,
	SurfaceShadingProperties,
} from "./anatomicalGeometriesTypes";

/**
 * Проверить, относится ли номер FDI к верхней челюсти.
 */
export function isMaxillaryArch(fdiNumber: number): boolean {
	const quad = Math.floor(fdiNumber / 10);
	return quad === 1 || quad === 2 || quad === 5 || quad === 6;
}

/**
 * Проверить, относится ли номер FDI к левой стороне пациента (правая на экране).
 */
export function isPatientLeftSide(fdiNumber: number): boolean {
	const quad = Math.floor(fdiNumber / 10);
	return quad === 2 || quad === 3 || quad === 6 || quad === 7;
}

/**
 * ICDAS II Caries Classification (International Caries Detection and Assessment System)
 * Полная клиническая шкала от 0 (здоровая эмаль) до 6 (обширная кариозная полость).
 */
export const ICDAS_CLASSIFICATIONS: Record<IcdasCode, IcdasClassificationDetail> = {
	0: {
		code: 0,
		nameRu: "ICDAS 0: Здоровая эмаль",
		descriptionRu: "Интактная поверхность зуба без признаков кариеса.",
		histologicalDepthRu: "Эмаль интактна",
		visualCharacteristics: "Естественный блеск, отсутствие белых пятен и микродефектов",
		badgeColor: "#10b981",
		badgeBg: "rgba(16, 185, 129, 0.12)",
		surfaceFillColor: "transparent",
		surfaceOpacity: 0,
	},
	1: {
		code: 1,
		nameRu: "ICDAS 1: Начальные изменения эмали (сухое пятно)",
		descriptionRu: "Первые визуальные изменения эмали, видимые только после высушивания воздухом.",
		histologicalDepthRu: "Наружная 1/2 толщины эмали",
		visualCharacteristics: "Очаговая деминерализация в области фиссур / ямок, меловидный оттенок",
		badgeColor: "#facc15",
		badgeBg: "rgba(250, 204, 21, 0.15)",
		surfaceFillColor: "#fef08a",
		surfaceOpacity: 0.45,
	},
	2: {
		code: 2,
		nameRu: "ICDAS 2: Отчётливые изменения эмали (влажное пятно)",
		descriptionRu: "Отчётливое меловидное или коричневатое пятно, видимое на влажной поверхности.",
		histologicalDepthRu: "Внутренняя 1/2 эмали до эмалево-дентинной границы",
		visualCharacteristics: "Широкое белое/желтоватое пятно без нарушения целостности поверхности",
		badgeColor: "#eab308",
		badgeBg: "rgba(234, 179, 8, 0.18)",
		surfaceFillColor: "#fde047",
		surfaceOpacity: 0.65,
	},
	3: {
		code: 3,
		nameRu: "ICDAS 3: Микродеструкция эмали (поверхностный кариес)",
		descriptionRu: "Локальное разрушение эмали без видимого обнажения дентина.",
		histologicalDepthRu: "Эмалево-дентинное соединение и наружный дентин",
		visualCharacteristics: "Микрокавитация эмали, потеря гладкости, шероховатость зондом",
		badgeColor: "#f97316",
		badgeBg: "rgba(249, 115, 22, 0.18)",
		surfaceFillColor: "#f59e0b",
		surfaceOpacity: 0.8,
	},
	4: {
		code: 4,
		nameRu: "ICDAS 4: Тёмная тень от подлежащего дентина",
		descriptionRu: "Серая, синяя или коричневая тень деминерализованного дентина под интактной эмалью.",
		histologicalDepthRu: "Средняя треть дентина",
		visualCharacteristics: "Тенеобразование при боковом освещении, дентинный кариозный очаг",
		badgeColor: "#ea580c",
		badgeBg: "rgba(234, 88, 12, 0.2)",
		surfaceFillColor: "#d97706",
		surfaceOpacity: 0.88,
	},
	5: {
		code: 5,
		nameRu: "ICDAS 5: Отчётливая полость с обнажением дентина",
		descriptionRu: "Кариозная полость с разрушением эмали и визуализируемым дентином (средний кариес).",
		histologicalDepthRu: "Глубокая треть дентина",
		visualCharacteristics: "Дефект твердых тканей, дно заполнено размягченным пигментированным дентином",
		badgeColor: "#ef4444",
		badgeBg: "rgba(239, 68, 68, 0.2)",
		surfaceFillColor: "#dc2626",
		surfaceOpacity: 0.92,
	},
	6: {
		code: 6,
		nameRu: "ICDAS 6: Обширная кариозная полость (глубокий кариес)",
		descriptionRu: "Обширная полость, охватывающая более половины поверхности зуба с риском вскрытия пульпы.",
		histologicalDepthRu: "Околопульпарный дентин / угроза пульпита",
		visualCharacteristics: "Широкий кратерообразный дефект, нависающие края эмали, размягчение",
		badgeColor: "#991b1b",
		badgeBg: "rgba(153, 27, 27, 0.25)",
		surfaceFillColor: "#7f1d1d",
		surfaceOpacity: 0.98,
	},
};

/**
 * Характеристики стоматологических реставрационных материалов и шейдеров.
 */
export const RESTORATIVE_MATERIALS: Record<
	RestorativeMaterialKey,
	{
		readonly nameRu: string;
		readonly descriptionRu: string;
		readonly shaderId: string;
		readonly shaderAliasId?: string;
		readonly collarShaderId?: string;
		readonly patternId?: string;
		readonly hexShaderId?: string;
		readonly microgroovePatternId?: string;
		readonly strokeColor: string;
		readonly badgeColor: string;
	}
> = {
	composite: {
		nameRu: "Светоотверждаемый композит",
		descriptionRu: "Высоконаполненный наногибридный реставрационный композит (микрогибридная смола)",
		shaderId: "composite-fill-gradient",
		shaderAliasId: "dente-shader-composite",
		patternId: "composite-resin-pattern",
		strokeColor: "#0f766e",
		badgeColor: "#14b8a6",
	},
	amalgam: {
		nameRu: "Серебряная амальгама",
		descriptionRu: "Металлическая амальгама с высоким содержанием серебра и темным металлическим блеском",
		shaderId: "amalgam-metal-gradient",
		shaderAliasId: "dente-shader-amalgam",
		strokeColor: "#334155",
		badgeColor: "#64748b",
	},
	ceramic_emax: {
		nameRu: "Керамика IPS e.max",
		descriptionRu: "Дисиликат-литиевая стеклокерамика повышенной эстетики и опалесценции",
		shaderId: "ceramic-emax-gradient",
		shaderAliasId: "dente-shader-ceramic-emax",
		strokeColor: "#0284c7",
		badgeColor: "#38bdf8",
	},
	zirconia: {
		nameRu: "Диоксид циркония (3Y-TZP)",
		descriptionRu: "Монолитный диоксид циркония с циркулярным фрезерованным уступом и шелковистым блеском",
		shaderId: "zirconia-crown-gradient",
		shaderAliasId: "dente-shader-zirconia",
		strokeColor: "#1d4ed8",
		badgeColor: "#3b82f6",
	},
	pfm_crown: {
		nameRu: "Металлокерамика (PFM)",
		descriptionRu: "Металлокерамическая коронка с керамическим телом и пришеечным металлическим уступом",
		shaderId: "pfm-crown-gradient",
		shaderAliasId: "dente-shader-pfm",
		collarShaderId: "pfm-metal-collar",
		strokeColor: "#1e3a8a",
		badgeColor: "#2563eb",
	},
	gold: {
		nameRu: "Благородный золотой сплав",
		descriptionRu: "Литая золотая вкладка / коронка высокой точности с 24K металлическим блеском",
		shaderId: "gold-crown-gradient",
		shaderAliasId: "dente-shader-gold",
		strokeColor: "#b45309",
		badgeColor: "#f59e0b",
	},
	titanium_implant: {
		nameRu: "Титановый дентальный имплантат",
		descriptionRu: "Винтовой имплантат Grade 4/5 SLA с самонарезающей резьбой, микробороздками и шестигранным соединением",
		shaderId: "titanium-implant-gradient",
		shaderAliasId: "dente-shader-titanium-implant",
		hexShaderId: "implant-hex-gradient",
		microgroovePatternId: "implant-microgrooves-pattern",
		strokeColor: "#334155",
		badgeColor: "#6366f1",
	},
};

/**
 * Русскоязычные клинические названия и описания анатомических поверхностей коронки зуба.
 */
export const ANATOMICAL_SURFACE_LABELS_RU: Record<
	AnatomicalSurfaceKey,
	{
		readonly nameRu: string;
		readonly shortRu: string;
		readonly descriptionRu: string;
	}
> = {
	O: {
		nameRu: "Окклюзионная (жевательная) / режущий край",
		shortRu: "Оккл.",
		descriptionRu: "Жевательная или режущая поверхность коронки зуба (I класс по Блэку)",
	},
	V: {
		nameRu: "Вестибулярная (щечная / губная)",
		shortRu: "Вестиб.",
		descriptionRu: "Наружная щечная или губная поверхность коронки",
	},
	L: {
		nameRu: "Язычная / нёбная (оральная)",
		shortRu: "Язычн./Нёбн.",
		descriptionRu: "Внутренняя язычная или нёбная поверхность коронки",
	},
	M: {
		nameRu: "Медиальная (мезиальная / передняя контактная)",
		shortRu: "Медиал.",
		descriptionRu: "Передняя апроксимальная контактная поверхность (II, III, IV класс по Блэку)",
	},
	D: {
		nameRu: "Дистальная (задняя контактная)",
		shortRu: "Дистал.",
		descriptionRu: "Задняя апроксимальная контактная поверхность (II, III, IV класс по Блэку)",
	},
	C: {
		nameRu: "Пришеечная (цервикальная / десневая треть)",
		shortRu: "Пришееч.",
		descriptionRu: "Пришеечная область коронки зуба у границы эмаль-цемент (V класс по Блэку)",
	},
};

/**
 * Нормализация ключа поверхности зуба из произвольной строки.
 */
export function normalizeSurfaceKey(surface: string): AnatomicalSurfaceKey | null {
	const s = surface.trim().toUpperCase();
	if (["O", "OCC", "OCCLUSAL", "I", "INCISAL", "О", "ОККЛ", "РЕЖ", "РЕЖУЩИЙ"].includes(s)) return "O";
	if (["V", "B", "BUCCAL", "VESTIBULAR", "В", "Щ", "ВЕСТ", "ЩЕЧ", "ЩЕЧНАЯ", "ГУБНАЯ"].includes(s)) return "V";
	if (["L", "P", "LINGUAL", "PALATAL", "Я", "Н", "ЯЗ", "НЕБ", "НЁБ", "ЯЗЫЧНАЯ", "НЕБНАЯ", "НЁБНАЯ"].includes(s)) return "L";
	if (["M", "MESIAL", "М", "МЕД", "МЕЗ", "МЕДИАЛЬНАЯ", "МЕЗИАЛЬНАЯ"].includes(s)) return "M";
	if (["D", "DISTAL", "Д", "ДИСТ", "ДИСТАЛЬНАЯ"].includes(s)) return "D";
	if (["C", "CERVICAL", "П", "ПРИШ", "ЦЕРВ", "ПРИШЕЕЧНАЯ", "ЦЕРВИКАЛЬНАЯ"].includes(s)) return "C";
	return null;
}

/**
 * Проверяет, активна ли заданная анатомическая поверхность в списке поверхностей зуба.
 */
export function isSurfaceActive(
	surfKey: AnatomicalSurfaceKey,
	activeSurfaces?: readonly string[] | string | undefined,
): boolean {
	if (!activeSurfaces) return false;
	const normalized = normalizeAnatomicalSurfaces(activeSurfaces);
	return normalized.includes(surfKey);
}

/**
 * Получить параметры шейдинга и текстурирования для отдельной поверхности коронки.
 */
export function getSurfaceShading(
	state: ToothState,
	material?: RestorativeMaterialKey | undefined,
): SurfaceShadingProperties {
	switch (state) {
		case "Caries":
			return {
				fill: "url(#dente-caries-grad)",
				stroke: "#991b1b",
				opacity: 0.95,
				strokeWidth: 1.2,
			};
		case "Pulpitis":
			return {
				fill: "url(#dente-pulpitis-grad)",
				stroke: "#991b1b",
				opacity: 0.95,
				strokeWidth: 1.2,
			};
		case "Periodontitis":
			return {
				fill: "url(#dente-periodontitis-grad)",
				stroke: "#c2410c",
				opacity: 0.95,
				strokeWidth: 1.2,
			};
		case "Filled":
			if (material === "amalgam") {
				return {
					fill: "url(#amalgam-metal-gradient)",
					stroke: "#334155",
					pattern: "url(#amalgam-burnish-pattern)",
					opacity: 0.95,
					strokeWidth: 1.2,
				};
			}
			if (material === "ceramic_emax") {
				return {
					fill: "url(#ceramic-emax-gradient)",
					stroke: "#0284c7",
					pattern: "url(#ceramic-glaze-specular)",
					opacity: 0.95,
					strokeWidth: 1.2,
				};
			}
			if (material === "gold") {
				return {
					fill: "url(#gold-crown-gradient)",
					stroke: "#b45309",
					opacity: 0.95,
					strokeWidth: 1.2,
				};
			}
			return {
				fill: "url(#composite-fill-gradient)",
				stroke: "#0f766e",
				pattern: "url(#composite-resin-pattern)",
				opacity: 0.95,
				strokeWidth: 1.2,
			};
		case "Crown":
			if (material === "gold") {
				return {
					fill: "url(#gold-crown-gradient)",
					stroke: "#b45309",
					opacity: 1,
					strokeWidth: 1.4,
				};
			}
			if (material === "pfm_crown") {
				return {
					fill: "url(#pfm-crown-gradient)",
					stroke: "#1e3a8a",
					opacity: 1,
					strokeWidth: 1.4,
				};
			}
			if (material === "ceramic_emax") {
				return {
					fill: "url(#ceramic-emax-gradient)",
					stroke: "#0284c7",
					opacity: 1,
					strokeWidth: 1.4,
				};
			}
			return {
				fill: "url(#zirconia-crown-gradient)",
				stroke: "#1d4ed8",
				opacity: 1,
				strokeWidth: 1.4,
			};
		case "Retained":
			return {
				fill: "url(#dente-enamel-healthy)",
				stroke: "#8b5cf6",
				opacity: 0.85,
				strokeWidth: 1.2,
			};
		case "Root":
			return {
				fill: "url(#dente-root-dentin)",
				stroke: "#dc2626",
				opacity: 1,
				strokeWidth: 1.4,
			};
		case "Healthy":
		default:
			return {
				fill: "url(#dente-enamel-healthy)",
				stroke: "var(--tooth-enamel-stroke, var(--tooth-root-stroke, #94a3b8))",
				opacity: 1,
				strokeWidth: 1.0,
			};
	}
}

/**
 * Описания и цвета материалов корневых каналов.
 */
export const CANAL_OBTURATIONS: Record<
	CanalObturationMaterial,
	{
		readonly nameRu: string;
		readonly strokeColor: string;
		readonly coreColor: string;
		readonly shaderId?: string;
		readonly shaderAliasId?: string;
		readonly glowId?: string;
		readonly apicalSealColor?: string;
	}
> = {
	gutta_percha: {
		nameRu: "Гуттаперча + эпоксидный силер (AH Plus)",
		shaderId: "gutta-percha-gradient",
		shaderAliasId: "dente-shader-gutta-percha",
		strokeColor: "#f43f5e",
		coreColor: "#fecdd3",
		glowId: "dente-glow-coral",
		apicalSealColor: "#be123c",
	},
	bioceramic: {
		nameRu: "Биокерамический силер (BioRoot RCS / TotalFill)",
		strokeColor: "#0d9488",
		coreColor: "#ccfbf1",
		glowId: "dente-glow-teal",
	},
	calcium_hydroxide: {
		nameRu: "Временная гидроокись кальция Ca(OH)2",
		strokeColor: "#eab308",
		coreColor: "#fef9c3",
	},
	fiber_post: {
		nameRu: "Стекловолоконный штифт (Fiber Post)",
		shaderId: "fiber-post-gradient",
		shaderAliasId: "dente-shader-fiber-post",
		strokeColor: "#6366f1",
		coreColor: "#e0e7ff",
		glowId: "dente-glow-indigo",
	},
	cast_core_post: {
		nameRu: "Литой культевой металлический штифт (Cast Core)",
		shaderId: "cast-core-post-gradient",
		shaderAliasId: "dente-shader-cast-core",
		strokeColor: "#334155",
		coreColor: "#cbd5e1",
		glowId: "dente-metallic-specular",
	},
	titanium_post: {
		nameRu: "Титановый анкерный штифт",
		shaderId: "cast-core-post-gradient",
		shaderAliasId: "dente-shader-cast-core",
		strokeColor: "#475569",
		coreColor: "#cbd5e1",
	},
	unfilled: {
		nameRu: "Инструментированный незаполненный канал",
		strokeColor: "#94a3b8",
		coreColor: "transparent",
	},
};

/**
 * Рассчитать SVG путь линии резорбции костной ткани альвеолярного отростка.
 */
export function getPeriodontalBoneLevelPath(
	fdiNumber: number,
	boneLossPercent: number,
	pattern: PeriodontalBoneLossPattern = "horizontal",
): { readonly boneLine: string; readonly resorptionArea: string } {
	if (boneLossPercent <= 0 || pattern === "none") {
		return { boneLine: "", resorptionArea: "" };
	}
	const isTop = isMaxillaryArch(fdiNumber);
	const clampedLoss = Math.max(0, Math.min(100, boneLossPercent));
	const factor = clampedLoss / 100;

	if (isTop) {
		const baseY = 96 - factor * 68;
		if (pattern === "vertical") {
			return {
				boneLine: `M 14 ${baseY + 12} L 36 ${baseY} L 64 ${baseY - 10} L 86 ${baseY + 6}`,
				resorptionArea: `M 14 96 L 14 ${baseY + 12} L 36 ${baseY} L 64 ${baseY - 10} L 86 ${baseY + 6} L 86 96 Z`,
			};
		}
		return {
			boneLine: `M 14 ${baseY} Q 50 ${baseY - 4} 86 ${baseY}`,
			resorptionArea: `M 14 96 L 14 ${baseY} Q 50 ${baseY - 4} 86 ${baseY} L 86 96 Z`,
		};
	}
	const baseY = 64 + factor * 68;
	if (pattern === "vertical") {
		return {
			boneLine: `M 14 ${baseY - 12} L 36 ${baseY} L 64 ${baseY + 10} L 86 ${baseY - 6}`,
			resorptionArea: `M 14 64 L 14 ${baseY - 12} L 36 ${baseY} L 64 ${baseY + 10} L 86 ${baseY - 6} L 86 64 Z`,
		};
	}
	return {
		boneLine: `M 14 ${baseY} Q 50 ${baseY + 4} 86 ${baseY}`,
		resorptionArea: `M 14 64 L 14 ${baseY} Q 50 ${baseY + 4} 86 ${baseY} L 86 64 Z`,
	};
}

/**
 * Рассчитать SVG путь линии рецессии десны (Gingival Recession).
 */
export function getGingivalRecessionPath(
	fdiNumber: number,
	recessionMm: number,
): string {
	if (recessionMm <= 0) {
		return "";
	}
	const isTop = isMaxillaryArch(fdiNumber);
	const offset = Math.min(26, Math.max(0, recessionMm * 3.2));
	if (isTop) {
		const y = 96 - offset;
		return `M 16 ${y + 3} Q 50 ${y - 4} 84 ${y + 3}`;
	}
	const y = 64 + offset;
	return `M 16 ${y - 3} Q 50 ${y + 4} 84 ${y - 3}`;
}

/**
 * Generate SVG marker path and styling for furcation involvement (Grade I..IV).
 */
export function getFurcationMarkerSvg(
	grade: FurcationGrade,
	x: number,
	y: number,
	isTop: boolean,
	size = 7,
): FurcationMarkerSvg | null {
	if (grade <= 0) return null;

	const tipY = isTop ? y - size : y + size;
	const baseY = isTop ? y + size * 0.5 : y - size * 0.5;
	const leftX = x - size * 0.9;
	const rightX = x + size * 0.9;

	switch (grade) {
		case 1:
			return {
				path: `M ${leftX} ${baseY} L ${x} ${tipY} L ${rightX} ${baseY}`,
				fill: "none",
				stroke: "#f59e0b",
				strokeWidth: 1.8,
				labelRu: "Фуркация I ст. (начальная, зонд < 3 мм)",
			};
		case 2:
			return {
				path: `M ${leftX} ${baseY} L ${x} ${tipY} L ${rightX} ${baseY} Z`,
				fill: "rgba(245, 158, 11, 0.25)",
				stroke: "#f59e0b",
				strokeWidth: 2,
				labelRu: "Фуркация II ст. (частичная/тупиковая, зонд > 3 мм)",
			};
		case 3:
			return {
				path: `M ${leftX} ${baseY} L ${x} ${tipY} L ${rightX} ${baseY} Z`,
				fill: "#ef4444",
				stroke: "#991b1b",
				strokeWidth: 2,
				labelRu: "Фуркация III ст. (сквозной дефект бифуркации)",
			};
		case 4:
			return {
				path: `M ${x} ${y - size} L ${x + size} ${y} L ${x} ${y + size} L ${x - size} ${y} Z`,
				fill: "#dc2626",
				stroke: "#7f1d1d",
				strokeWidth: 2.2,
				labelRu: "Фуркация IV ст. (сквозная с обнажением рецессией)",
			};
		default:
			return null;
	}
}

/**
 * Русские названия анатомических поверхностей коронки зуба.
 */
export const ANATOMICAL_SURFACE_NAMES_RU: Record<AnatomicalSurfaceKey, string> = {
	O: "Окклюзионная / Режущий край (O/I)",
	V: "Вестибулярная / Щечная (V/B)",
	L: "Язычная / Нёбная (L/P)",
	M: "Медиальная (M)",
	D: "Дистальная (D)",
	C: "Пришеечная / V класс (C/G)",
};

/**
 * Нормализует список поверхностей зуба (MOD, MO, DO, Class V, B, P, V, L, M, D, O, C)
 * в массив стандартизированных ключей AnatomicalSurfaceKey ('O' | 'V' | 'L' | 'M' | 'D' | 'C').
 */
export function normalizeAnatomicalSurfaces(
	surfaces?: readonly string[] | string | null,
): AnatomicalSurfaceKey[] {
	if (!surfaces) return [];
	const rawList = Array.isArray(surfaces) ? surfaces : [surfaces];
	const set = new Set<AnatomicalSurfaceKey>();

	for (const item of rawList) {
		if (typeof item !== "string") continue;
		const upper = item.trim().toUpperCase();
		if (!upper) continue;

		// 1. Прямое сопоставление клинического термина или одиночной аббревиатуры
		const directKey = normalizeSurfaceKey(upper);
		if (directKey) {
			set.add(directKey);
			continue;
		}

		// 2. Вариации V класса по Блэку и десневой трети
		if (
			upper === "CLASS V" ||
			upper === "CLASS_V" ||
			upper === "CLASSV" ||
			upper.startsWith("КЛАСС V") ||
			upper.startsWith("V КЛАСС") ||
			upper === "V_CERVICAL" ||
			upper === "GINGIVAL" ||
			upper === "ШЕЙКА"
		) {
			set.add("C");
			continue;
		}

		// 3. Составные мультиповерхностные аббревиатуры (MOD, MO, DO, OVD, M+D, etc.)
		const cleanChars = upper.replace(/[^A-ZА-ЯЁ0-9]/g, "");
		for (const char of cleanChars) {
			if (char === "M" || char === "М") set.add("M");
			else if (char === "O" || char === "О" || char === "I" || char === "И") set.add("O");
			else if (char === "D" || char === "Д") set.add("D");
			else if (char === "V" || char === "В" || char === "B" || char === "Щ") set.add("V");
			else if (char === "L" || char === "Л" || char === "P" || char === "Я" || char === "Н") set.add("L");
			else if (char === "C" || char === "С" || char === "G") set.add("C");
		}
	}

	return Array.from(set);
}
