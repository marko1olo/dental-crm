/**
 * DENTE Dental CRM — Anatomical Tooth Geometries & SVG Morphology
 *
 * Provides anatomical SVG paths, multi-root profiles, root canal paths,
 * 5-surface crown geometries (O, V/B, L/P, M, D), ICDAS II classification,
 * and restorative shader definitions for 32 adult + 20 pediatric teeth.
 */

export type ToothQuadrant = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;

export type ToothArch = "maxillary" | "mandibular";
export type ToothSide = "right" | "left";

export type ToothMorphologyGroup =
	| "incisor_central"
	| "incisor_lateral"
	| "canine"
	| "premolar_1"
	| "premolar_2"
	| "molar_1"
	| "molar_2"
	| "molar_3"
	| "primary_incisor"
	| "primary_canine"
	| "primary_molar_1"
	| "primary_molar_2";

import type { ToothState } from "./ToothChart";

export type AnatomicalSurfaceKey = "O" | "V" | "L" | "M" | "D" | "C";

export type CanalObturationMaterial =
	| "gutta_percha"
	| "bioceramic"
	| "calcium_hydroxide"
	| "fiber_post"
	| "cast_core_post"
	| "titanium_post"
	| "unfilled";

export type RestorativeMaterialKey =
	| "composite"
	| "amalgam"
	| "ceramic_emax"
	| "zirconia"
	| "pfm_crown"
	| "gold"
	| "titanium_implant";

export type PostCoreType = "fiber" | "cast_core" | "titanium";

/**
 * Стадии физиологической резорбции корней временных (молочных) зубов.
 * 0% — полный интактный корень
 * 25% — I степень: сглаживание и резорбция апикальной трети
 * 50% — II степень: резорбция до средней трети, полупрозрачность и штриховка
 * 75% — III степень: сохранена только пришеечная треть
 * 100% — IV степень: полная резорбция / эксфолиация (корень отсутствует)
 */
export type RootResorptionStage = 0 | 25 | 50 | 75 | 100;

export interface RootResorptionDetail {
	readonly stage: RootResorptionStage;
	readonly percent: number;
	readonly nameRu: string;
	readonly descriptionRu: string;
	readonly rootOpacity: number;
	readonly showHatch: boolean;
	readonly badgeColor: string;
	readonly badgeBg: string;
}

export const ROOT_RESORPTION_STAGES: Record<RootResorptionStage, RootResorptionDetail> = {
	0: {
		stage: 0,
		percent: 0,
		nameRu: "Интактный корень (0%)",
		descriptionRu: "Корень полностью сформирован, физиологическая резорбция отсутствует",
		rootOpacity: 1.0,
		showHatch: false,
		badgeColor: "#10b981",
		badgeBg: "rgba(16, 185, 129, 0.12)",
	},
	25: {
		stage: 25,
		percent: 25,
		nameRu: "I стадия: Апикальная резорбция (25%)",
		descriptionRu: "Сглаживание и укорочение апикальной трети корня",
		rootOpacity: 0.9,
		showHatch: false,
		badgeColor: "#0284c7",
		badgeBg: "rgba(2, 132, 199, 0.15)",
	},
	50: {
		stage: 50,
		percent: 50,
		nameRu: "II стадия: Средняя резорбция (50%)",
		descriptionRu: "Резорбция половины длины корня, полупрозрачность и резорбтивная штриховка",
		rootOpacity: 0.65,
		showHatch: true,
		badgeColor: "#f59e0b",
		badgeBg: "rgba(245, 158, 11, 0.15)",
	},
	75: {
		stage: 75,
		percent: 75,
		nameRu: "III стадия: Пришеечная резорбция (75%)",
		descriptionRu: "Сохранена только пришеечная треть корня перед выпадением",
		rootOpacity: 0.35,
		showHatch: true,
		badgeColor: "#ea580c",
		badgeBg: "rgba(234, 88, 12, 0.18)",
	},
	100: {
		stage: 100,
		percent: 100,
		nameRu: "IV стадия: Полная резорбция / Эксфолиация (100%)",
		descriptionRu: "Корень полностью резорбирован, коронка удерживается в мягких тканях (эксфолиация)",
		rootOpacity: 0.0,
		showHatch: false,
		badgeColor: "#e11d48",
		badgeBg: "rgba(225, 29, 72, 0.2)",
	},
};

export interface PhysiologicalResorptionGeometry {
	readonly stage: RootResorptionStage;
	readonly isResorbed: boolean;
	readonly rootPath: string;
	readonly resorptionLinePath?: string | undefined;
	readonly resorptionHatchAreaPath?: string | undefined;
	readonly opacity: number;
	readonly showCanals: boolean;
	readonly canals: readonly CanalDefinition[];
	readonly stageInfo: RootResorptionDetail;
}

export type FurcationGrade = 0 | 1 | 2 | 3 | 4;

export interface FurcationSite {
	readonly id: string;
	readonly nameRu: string;
	readonly position: { readonly x: number; readonly y: number };
	readonly type:
		| "bifurcation"
		| "trifurcation_buccal"
		| "trifurcation_mesial"
		| "trifurcation_distal";
}

export interface PeriodontalMarkers {
	readonly boneCrestNormal: string;
	readonly boneResorptionMild: string;
	readonly boneResorptionModerate: string;
	readonly boneResorptionSevere: string;
	readonly furcationSites: readonly FurcationSite[];
}

export interface FurcationMarkerSvg {
	readonly path: string;
	readonly fill: string;
	readonly stroke: string;
	readonly strokeWidth: number;
	readonly labelRu: string;
}

export type PeriodontalBoneLossPattern =
	| "horizontal"
	| "vertical"
	| "furcation"
	| "none";

export type PeriodontalSeverity = "mild" | "moderate" | "severe" | "none";

export interface PeriodontalStatus {
	readonly boneLossLevelPercent: number; // 0..100%
	readonly boneLossMm: number; // e.g. 1..9 mm
	readonly pattern: PeriodontalBoneLossPattern;
	readonly severity: PeriodontalSeverity;
	readonly gingivalRecessionMm: number; // 0..6 mm
	readonly furcationInvolvement?: 1 | 2 | 3 | undefined;
}

export type PeriapicalLesionType = "granuloma" | "cyst" | "abscess" | "none";

export interface PeriapicalPathology {
	readonly type: PeriapicalLesionType;
	readonly sizeMm: number;
	readonly apexIndex?: number | undefined;
	readonly isDiffused?: boolean | undefined;
}

export type IcdasCode = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export interface IcdasClassificationDetail {
	readonly code: IcdasCode;
	readonly nameRu: string;
	readonly descriptionRu: string;
	readonly histologicalDepthRu: string;
	readonly visualCharacteristics: string;
	readonly badgeColor: string;
	readonly badgeBg: string;
	readonly surfaceFillColor: string;
	readonly surfaceOpacity: number;
}

export interface CanalDefinition {
	readonly id: string;
	readonly nameRu: string;
	readonly path: string;
	readonly apex: { readonly x: number; readonly y: number };
	readonly defaultLengthMm: number;
}

export interface AnatomicalTemplateData {
	readonly crown: string;
	readonly root: string;
	readonly cej: string;
	readonly fissures: string;
	readonly surfaces: Record<AnatomicalSurfaceKey, string>;
	readonly canals: readonly CanalDefinition[];
	readonly pulpChamber?: string;
	readonly apexHalos: readonly { readonly x: number; readonly y: number }[];
	readonly periodontal: PeriodontalMarkers;
	readonly viewBox: {
		readonly x: number;
		readonly y: number;
		readonly width: number;
		readonly height: number;
	};
	readonly standardWidthPx: number;
	readonly standardHeightPx: number;
}

export interface AnatomicalToothGeometry {
	readonly fdiNumber: number;
	readonly group: ToothMorphologyGroup;
	readonly arch: ToothArch;
	readonly side: ToothSide;
	readonly isPediatric: boolean;
	readonly rootsCount: number;
	readonly rootNamesRu: readonly string[];
	readonly crownPath: string;
	readonly rootPath: string;
	readonly cejPath: string;
	readonly fissurePath: string;
	readonly surfaces: Record<AnatomicalSurfaceKey, string>;
	readonly canals: readonly CanalDefinition[];
	readonly pulpChamberPath?: string | undefined;
	readonly apexHalos: readonly { readonly x: number; readonly y: number }[];
	readonly periodontal: PeriodontalMarkers;
	readonly viewBox: {
		readonly x: number;
		readonly y: number;
		readonly width: number;
		readonly height: number;
	};
	readonly standardWidthPx: number;
	readonly standardHeightPx: number;
	readonly touchTargetMinPx: number;
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
		badgeColor: "#64748b",
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
 * Нормализация ключа поверхности зуба из произвольной строки (O, V, B, L, P, M, D, C и их русскоязычные аналоги).
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
 * Поддерживает как индивидуальные ключи (O, V, L, M, D, C), так и составные клинические аббревиатуры (MOD, MO, DO, Class V).
 */
export function isSurfaceActive(
	surfKey: AnatomicalSurfaceKey,
	activeSurfaces?: readonly string[] | string | undefined,
): boolean {
	if (!activeSurfaces) return false;
	const normalized = normalizeAnatomicalSurfaces(activeSurfaces);
	return normalized.includes(surfKey);
}

export interface SurfaceShadingProperties {
	readonly fill: string;
	readonly stroke: string;
	readonly pattern?: string | undefined;
	readonly opacity: number;
	readonly strokeWidth: number;
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
		case "Healthy":
		default:
			return {
				fill: "url(#dente-enamel-healthy)",
				stroke: "var(--tooth-root-stroke, #64748b)",
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
 * Расчет физиологической резорбции корней молочных зубов (0%, 25%, 50%, 75%, 100%).
 * 25% — сглаживание апикальной части, укорочение апикальной трети
 * 50% — резорбция до средней трети, полупрозрачность и штриховка
 * 75% — сохранена только пришеечная часть корня
 * 100% — полное исчезновение корня (эксфолиация перед прорезыванием постоянного зуба)
 */
export function getPhysiologicalRootResorptionGeometry(
	fdiNumber: number,
	stage: RootResorptionStage = 0,
): PhysiologicalResorptionGeometry {
	const quadrant = Math.floor(fdiNumber / 10);
	const isPediatric = quadrant >= 5 && quadrant <= 8;
	const isTop = quadrant === 5 || quadrant === 6;
	const pos = fdiNumber % 10;
	const isMolar = pos === 4 || pos === 5;
	const stageInfo = ROOT_RESORPTION_STAGES[stage] ?? ROOT_RESORPTION_STAGES[0];

	if (!isPediatric || stage === 0) {
		const fullGeom = getAnatomicalToothGeometry(fdiNumber);
		return {
			stage,
			isResorbed: false,
			rootPath: fullGeom.rootPath,
			opacity: 1.0,
			showCanals: true,
			canals: fullGeom.canals,
			stageInfo,
		};
	}

	if (stage === 100) {
		return {
			stage: 100,
			isResorbed: true,
			rootPath: "",
			opacity: 0,
			showCanals: false,
			canals: [],
			stageInfo,
		};
	}

	if (isTop) {
		if (isMolar) {
			// Верхние молочные моляры (54, 55, 64, 65)
			if (stage === 25) {
				return {
					stage: 25,
					isResorbed: true,
					rootPath:
						"M 18 84 C 12 66, 12 48, 18 32 Q 26 32 30 42 C 34 52, 36 62, 38 68 C 42 54, 46 40, 50 28 Q 54 40, 58 54 C 60 62, 62 52, 66 42 Q 70 32 78 32 C 84 48, 84 66, 82 84 Z",
					resorptionLinePath: "M 18 32 Q 50 24 78 32",
					resorptionHatchAreaPath:
						"M 18 32 C 10 48, 10 64, 18 84 Q 50 80 82 84 C 90 64, 90 48, 78 32 Q 50 24 18 32 Z",
					opacity: 0.9,
					showCanals: true,
					canals: [
						{ id: "MB", nameRu: "MB (25% резорбция)", path: "M 36 92 C 30 76, 24 58, 20 36", apex: { x: 20, y: 36 }, defaultLengthMm: 12.0 },
						{ id: "P", nameRu: "P (25% резорбция)", path: "M 50 92 C 50 76, 50 54, 50 32", apex: { x: 50, y: 32 }, defaultLengthMm: 13.0 },
						{ id: "DB", nameRu: "DB (25% резорбция)", path: "M 64 92 C 70 76, 76 58, 80 36", apex: { x: 80, y: 36 }, defaultLengthMm: 12.0 },
					],
					stageInfo,
				};
			}
			if (stage === 50) {
				return {
					stage: 50,
					isResorbed: true,
					rootPath:
						"M 18 84 C 14 72, 16 60, 24 50 Q 36 50 42 64 C 44 58, 46 54, 50 46 Q 54 54, 56 64 C 62 50, 74 50, 76 50 C 82 60, 84 72, 82 84 Z",
					resorptionLinePath: "M 24 50 Q 50 42 76 50",
					resorptionHatchAreaPath:
						"M 24 50 C 18 64, 18 74, 18 84 Q 50 80 82 84 C 82 74, 82 64, 76 50 Q 50 42 24 50 Z",
					opacity: 0.65,
					showCanals: true,
					canals: [
						{ id: "MB", nameRu: "MB (50% резорбция)", path: "M 36 92 C 32 80, 28 66, 26 52", apex: { x: 26, y: 52 }, defaultLengthMm: 8.0 },
						{ id: "P", nameRu: "P (50% резорбция)", path: "M 50 92 C 50 80, 50 68, 50 48", apex: { x: 50, y: 48 }, defaultLengthMm: 8.5 },
						{ id: "DB", nameRu: "DB (50% резорбция)", path: "M 64 92 C 68 80, 72 66, 74 52", apex: { x: 74, y: 52 }, defaultLengthMm: 8.0 },
					],
					stageInfo,
				};
			}
			// 75%
			return {
				stage: 75,
				isResorbed: true,
				rootPath:
					"M 18 84 C 18 78, 22 68, 30 68 Q 50 64 70 68 C 78 68, 82 78, 82 84 Z",
				resorptionLinePath: "M 30 68 Q 50 64 70 68",
				resorptionHatchAreaPath:
					"M 30 68 C 22 78, 18 78, 18 84 Q 50 80 82 84 C 82 78, 78 78, 70 68 Q 50 64 30 68 Z",
				opacity: 0.35,
				showCanals: false,
				canals: [],
				stageInfo,
			};
		}
		// Верхние молочные резцы и клыки (51, 52, 53, 61, 62, 63)
		if (stage === 25) {
			return {
				stage: 25,
				isResorbed: true,
				rootPath:
					"M 26 84 C 28 66, 36 44, 44 28 Q 50 24 56 28 C 64 44, 72 66, 74 84 Z",
				resorptionLinePath: "M 44 28 Q 50 24 56 28",
				resorptionHatchAreaPath:
					"M 44 28 C 36 44, 28 66, 26 84 Q 50 80 74 84 C 72 66, 64 44, 56 28 Q 50 24 44 28 Z",
				opacity: 0.9,
				showCanals: true,
				canals: [
					{ id: "Main", nameRu: "Канал (25% резорбция)", path: "M 50 88 C 50 68, 50 48, 50 28", apex: { x: 50, y: 28 }, defaultLengthMm: 14.0 },
				],
				stageInfo,
			};
		}
		if (stage === 50) {
			return {
				stage: 50,
				isResorbed: true,
				rootPath:
					"M 26 84 C 30 70, 36 58, 42 48 Q 50 44 58 48 C 64 58, 70 70, 74 84 Z",
				resorptionLinePath: "M 42 48 Q 50 44 58 48",
				resorptionHatchAreaPath:
					"M 42 48 C 36 58, 30 70, 26 84 Q 50 80 74 84 C 70 70, 64 58, 58 48 Q 50 44 42 48 Z",
				opacity: 0.65,
				showCanals: true,
				canals: [
					{ id: "Main", nameRu: "Канал (50% резорбция)", path: "M 50 88 C 50 74, 50 62, 50 48", apex: { x: 50, y: 48 }, defaultLengthMm: 9.5 },
				],
				stageInfo,
			};
		}
		// 75%
		return {
			stage: 75,
			isResorbed: true,
			rootPath:
				"M 26 84 C 28 76, 36 68, 42 66 Q 50 64 58 66 C 64 68, 72 76, 74 84 Z",
			resorptionLinePath: "M 42 66 Q 50 64 58 66",
			resorptionHatchAreaPath:
				"M 42 66 C 36 68, 28 76, 26 84 Q 50 80 74 84 C 72 76, 64 68, 58 66 Q 50 64 42 66 Z",
			opacity: 0.35,
			showCanals: false,
			canals: [],
			stageInfo,
		};
	} else {
		// Нижняя челюсть (71..75, 81..85)
		if (isMolar) {
			// Нижние молочные моляры (74, 75, 84, 85)
			if (stage === 25) {
				return {
					stage: 25,
					isResorbed: true,
					rootPath:
						"M 18 76 C 12 94, 12 112, 18 126 Q 26 126 30 116 C 36 104, 42 96, 50 88 C 58 96, 64 104, 70 116 Q 74 126 82 126 C 88 112, 88 94, 82 76 Z",
					resorptionLinePath: "M 18 126 Q 50 134 82 126",
					resorptionHatchAreaPath:
						"M 18 76 C 10 96, 10 112, 18 126 Q 50 134 82 126 C 90 112, 90 96, 82 76 Z",
					opacity: 0.9,
					showCanals: true,
					canals: [
						{ id: "M", nameRu: "M (25% резорбция)", path: "M 36 68 C 28 84, 22 104, 20 124", apex: { x: 20, y: 124 }, defaultLengthMm: 12.0 },
						{ id: "D", nameRu: "D (25% резорбция)", path: "M 64 68 C 72 84, 78 104, 80 124", apex: { x: 80, y: 124 }, defaultLengthMm: 12.0 },
					],
					stageInfo,
				};
			}
			if (stage === 50) {
				return {
					stage: 50,
					isResorbed: true,
					rootPath:
						"M 18 76 C 14 88, 16 98, 24 108 Q 36 108 42 96 C 44 100, 46 104, 50 112 C 54 104, 56 100, 58 96 Q 64 108 76 108 C 84 98, 86 88, 82 76 Z",
					resorptionLinePath: "M 24 108 Q 50 116 76 108",
					resorptionHatchAreaPath:
						"M 18 76 C 16 88, 18 98, 24 108 Q 50 116 76 108 C 82 98, 84 88, 82 76 Z",
					opacity: 0.65,
					showCanals: true,
					canals: [
						{ id: "M", nameRu: "M (50% резорбция)", path: "M 36 68 C 30 80, 26 94, 26 106", apex: { x: 26, y: 106 }, defaultLengthMm: 8.0 },
						{ id: "D", nameRu: "D (50% резорбция)", path: "M 64 68 C 70 80, 74 94, 74 106", apex: { x: 74, y: 106 }, defaultLengthMm: 8.0 },
					],
					stageInfo,
				};
			}
			// 75%
			return {
				stage: 75,
				isResorbed: true,
				rootPath:
					"M 18 76 C 18 82, 22 92, 30 92 Q 50 96 70 92 C 78 92, 82 82, 82 76 Z",
				resorptionLinePath: "M 30 92 Q 50 96 70 92",
				resorptionHatchAreaPath:
					"M 18 76 C 18 82, 22 92, 30 92 Q 50 96 70 92 C 78 92, 82 82, 82 76 Z",
				opacity: 0.35,
				showCanals: false,
				canals: [],
				stageInfo,
			};
		}
		// Нижние молочные резцы и клыки (71, 72, 73, 81, 82, 83)
		if (stage === 25) {
			return {
				stage: 25,
				isResorbed: true,
				rootPath:
					"M 28 64 C 30 84, 36 108, 44 130 Q 50 134 56 130 C 64 108, 70 84, 72 64 Z",
				resorptionLinePath: "M 44 130 Q 50 134 56 130",
				resorptionHatchAreaPath:
					"M 28 64 C 28 86, 36 108, 44 130 Q 50 134 56 130 C 64 108, 72 86, 72 64 Z",
				opacity: 0.9,
				showCanals: true,
				canals: [
					{ id: "Main", nameRu: "Канал (25% резорбция)", path: "M 50 68 C 50 88, 50 108, 50 128", apex: { x: 50, y: 128 }, defaultLengthMm: 12.5 },
				],
				stageInfo,
			};
		}
		if (stage === 50) {
			return {
				stage: 50,
				isResorbed: true,
				rootPath:
					"M 28 64 C 30 78, 36 94, 42 108 Q 50 112 58 108 C 64 94, 70 78, 72 64 Z",
				resorptionLinePath: "M 42 108 Q 50 112 58 108",
				resorptionHatchAreaPath:
					"M 28 64 C 30 78, 36 94, 42 108 Q 50 112 58 108 C 64 94, 70 78, 72 64 Z",
				opacity: 0.65,
				showCanals: true,
				canals: [
					{ id: "Main", nameRu: "Канал (50% резорбция)", path: "M 50 68 C 50 82, 50 96, 50 106", apex: { x: 50, y: 106 }, defaultLengthMm: 8.5 },
				],
				stageInfo,
			};
		}
		// 75%
		return {
			stage: 75,
			isResorbed: true,
			rootPath:
				"M 28 64 C 30 72, 36 78, 42 84 Q 50 88 58 84 C 64 78, 70 72, 72 64 Z",
			resorptionLinePath: "M 42 84 Q 50 88 58 84",
			resorptionHatchAreaPath:
				"M 28 64 C 30 72, 36 78, 42 84 Q 50 88 58 84 C 64 78, 70 72, 72 64 Z",
			opacity: 0.35,
			showCanals: false,
			canals: [],
			stageInfo,
		};
	}
}

/* =========================================================================
 * Базовые анатомические шаблоны (Anatomical SVG Geometries)
 * ========================================================================= */

// --- 1. ВЕРХНИЕ МОЛЯРЫ (16, 17, 18, 26, 27, 28) ---
// 3 мощных удлиненных корня: MB (Медиально-щечный), DB (Дистально-щечный), P (Нёбный - самый длинный)
const UPPER_MOLAR_GEOMETRY: AnatomicalTemplateData = {
	crown:
		"M 16 96 C 10 110, 8 138, 24 148 C 34 153, 48 150, 50 142 C 52 150, 66 153, 76 148 C 92 138, 90 110, 84 96 Q 50 92 16 96 Z",
	root:
		"M 16 96 C 11 72, 14 38, 22 14 C 28 22, 34 46, 36 66 C 42 46, 46 22, 50 6 C 54 22, 58 46, 64 66 C 66 46, 72 22, 78 18 C 86 38, 89 72, 84 96 Z",
	cej: "M 16 96 Q 50 92 84 96",
	fissures: "M 28 132 Q 50 140 72 132 M 50 118 L 50 142 M 36 122 Q 50 126 64 122",
	pulpChamber: "M 28 126 C 26 116, 32 102, 36 96 C 42 90, 58 90, 64 96 C 68 102, 74 116, 72 126 C 66 130, 56 122, 50 126 C 44 122, 34 130, 28 126 Z",
	canals: [
		{
			id: "MB1",
			nameRu: "Медиально-щечный 1 (MB1)",
			path: "M 36 104 C 32 82, 22 46, 22 14",
			apex: { x: 22, y: 14 },
			defaultLengthMm: 21.0,
		},
		{
			id: "MB2",
			nameRu: "Медиально-щечный 2 (MB2)",
			path: "M 40 104 C 36 82, 27 48, 26 20",
			apex: { x: 26, y: 20 },
			defaultLengthMm: 20.5,
		},
		{
			id: "P",
			nameRu: "Нёбный (Palatal)",
			path: "M 50 104 C 50 74, 50 36, 50 6",
			apex: { x: 50, y: 6 },
			defaultLengthMm: 22.0,
		},
		{
			id: "DB",
			nameRu: "Дистально-щечный (DB)",
			path: "M 64 104 C 68 82, 78 48, 78 18",
			apex: { x: 78, y: 18 },
			defaultLengthMm: 20.0,
		},
	],
	apexHalos: [
		{ x: 22, y: 14 },
		{ x: 50, y: 6 },
		{ x: 78, y: 18 },
	],
	periodontal: {
		boneCrestNormal: "M 12 86 Q 50 82 88 86",
		boneResorptionMild: "M 12 76 Q 50 72 88 76",
		boneResorptionModerate: "M 12 62 Q 50 58 88 62",
		boneResorptionSevere: "M 12 44 Q 50 40 88 44",
		furcationSites: [
			{
				id: "MB_DB_Buccal",
				nameRu: "Щечная трифуркация",
				position: { x: 50, y: 66 },
				type: "trifurcation_buccal" as const,
			},
			{
				id: "MB_P_Mesial",
				nameRu: "Медиально-нёбная фуркация",
				position: { x: 36, y: 68 },
				type: "trifurcation_mesial" as const,
			},
			{
				id: "DB_P_Distal",
				nameRu: "Дистально-нёбная фуркация",
				position: { x: 64, y: 68 },
				type: "trifurcation_distal" as const,
			},
		],
	},
	surfaces: {
		O: "M 30 122 Q 50 128 70 122 L 66 142 Q 50 146 34 142 Z",
		V: "M 16 96 C 32 93, 68 93, 84 96 L 70 122 Q 50 128 30 122 Z",
		L: "M 34 142 Q 50 146 66 142 L 76 148 C 66 153, 34 153, 24 148 Z",
		M: "M 16 96 L 30 122 L 34 142 L 24 148 C 10 138, 10 110, 16 96 Z",
		D: "M 84 96 C 90 110, 90 138, 76 148 L 66 142 L 70 122 Z",
		C: "M 16 96 Q 50 92 84 96 L 78 108 Q 50 104 22 108 Z",
	},
	viewBox: { x: 0, y: 0, width: 100, height: 160 },
	standardWidthPx: 80,
	standardHeightPx: 128,
};

// --- 2. ВЕРХНИЕ ПРЕМОЛЯРЫ (14, 15, 24, 25) ---
// 14/24 имеют 2 стройных корня (щечный и небный с выраженной бифуркацией)
const UPPER_PREMOLAR_GEOMETRY: AnatomicalTemplateData = {
	crown:
		"M 22 96 C 16 108, 16 136, 32 146 C 42 150, 58 150, 68 146 C 84 136, 84 108, 78 96 Q 50 92 22 96 Z",
	root:
		"M 22 96 C 19 74, 24 44, 34 10 C 40 26, 46 46, 50 62 C 54 46, 60 26, 66 10 C 76 44, 81 74, 78 96 Z",
	cej: "M 22 96 Q 50 92 78 96",
	fissures: "M 34 130 Q 50 134 66 130 M 50 120 L 50 140",
	pulpChamber: "M 36 122 C 34 114, 38 102, 42 96 C 46 92, 54 92, 58 96 C 62 102, 66 114, 64 122 C 58 126, 54 118, 50 122 C 46 118, 42 126, 36 122 Z",
	canals: [
		{
			id: "B",
			nameRu: "Щечный (Buccal)",
			path: "M 42 102 C 38 76, 34 40, 34 10",
			apex: { x: 34, y: 10 },
			defaultLengthMm: 21.5,
		},
		{
			id: "P",
			nameRu: "Нёбный (Palatal)",
			path: "M 58 102 C 62 76, 66 40, 66 10",
			apex: { x: 66, y: 10 },
			defaultLengthMm: 21.5,
		},
	],
	apexHalos: [
		{ x: 34, y: 10 },
		{ x: 66, y: 10 },
	],
	periodontal: {
		boneCrestNormal: "M 20 86 Q 50 81 80 86",
		boneResorptionMild: "M 20 74 Q 50 70 80 74",
		boneResorptionModerate: "M 20 60 Q 50 56 80 60",
		boneResorptionSevere: "M 20 42 Q 50 38 80 42",
		furcationSites: [
			{
				id: "B_P_Bifurcation",
				nameRu: "Бифуркация верхнего премоляра",
				position: { x: 50, y: 62 },
				type: "bifurcation" as const,
			},
		],
	},
	surfaces: {
		O: "M 34 122 Q 50 126 66 122 L 62 138 Q 50 142 38 138 Z",
		V: "M 22 96 C 36 93, 64 93, 78 96 L 66 122 Q 50 126 34 122 Z",
		L: "M 38 138 Q 50 142 62 138 L 68 146 C 58 150, 42 150, 32 146 Z",
		M: "M 22 96 L 34 122 L 38 138 L 32 146 C 16 136, 16 108, 22 96 Z",
		D: "M 78 96 C 84 108, 84 136, 68 146 L 62 138 L 66 122 Z",
		C: "M 22 96 Q 50 92 78 96 L 74 108 Q 50 104 26 108 Z",
	},
	viewBox: { x: 10, y: 0, width: 80, height: 160 },
	standardWidthPx: 64,
	standardHeightPx: 128,
};

// --- 3. ВЕРХНИЕ КЛЫКИ (13, 23) ---
// Мощнейший удлиненный одиночный корень, выраженный рвущий бугор
const UPPER_CANINE_GEOMETRY: AnatomicalTemplateData = {
	crown:
		"M 26 96 C 20 110, 18 134, 50 154 C 82 134, 80 110, 74 96 Q 50 92 26 96 Z",
	root: "M 26 96 C 23 72, 34 32, 50 4 C 66 32, 77 72, 74 96 Z",
	cej: "M 26 96 Q 50 92 74 96",
	fissures: "M 50 120 L 50 150",
	pulpChamber: "M 42 124 C 40 114, 42 100, 46 72 C 48 40, 49 14, 50 4 C 51 14, 52 40, 54 72 C 58 100, 60 114, 58 124 C 54 132, 46 132, 42 124 Z",
	canals: [
		{
			id: "Main",
			nameRu: "Основной корневой канал",
			path: "M 50 120 C 50 88, 50 44, 50 4",
			apex: { x: 50, y: 4 },
			defaultLengthMm: 26.0,
		},
	],
	apexHalos: [{ x: 50, y: 4 }],
	periodontal: {
		boneCrestNormal: "M 22 86 Q 50 81 78 86",
		boneResorptionMild: "M 22 74 Q 50 69 78 74",
		boneResorptionModerate: "M 22 58 Q 50 53 78 58",
		boneResorptionSevere: "M 22 36 Q 50 31 78 36",
		furcationSites: [],
	},
	surfaces: {
		O: "M 38 124 Q 50 128 62 124 L 50 154 Z",
		V: "M 26 96 C 38 93, 62 93, 74 96 L 62 124 Q 50 128 38 124 Z",
		L: "M 38 124 L 50 154 L 62 124 Q 50 136 38 124 Z",
		M: "M 26 96 L 38 124 L 50 154 C 28 138, 22 114, 26 96 Z",
		D: "M 74 96 C 78 114, 72 138, 50 154 L 62 124 Z",
		C: "M 26 96 Q 50 92 74 96 L 68 108 Q 50 104 32 108 Z",
	},
	viewBox: { x: 12, y: 0, width: 76, height: 160 },
	standardWidthPx: 60,
	standardHeightPx: 128,
};

// --- 4. ВЕРХНИЕ РЕЗЦЫ (11, 21, 12, 22) ---
// Лопатообразная коронка, прямой режущий край, длинный стройный конусовидный корень
const UPPER_INCISOR_GEOMETRY: AnatomicalTemplateData = {
	crown:
		"M 26 96 C 20 110, 18 138, 24 150 C 36 153, 64 153, 76 150 C 82 138, 80 110, 74 96 Q 50 92 26 96 Z",
	root: "M 26 96 C 25 70, 36 36, 50 8 C 64 36, 75 70, 74 96 Z",
	cej: "M 26 96 Q 50 92 74 96",
	fissures: "M 34 146 L 66 146",
	pulpChamber: "M 40 122 C 38 114, 40 100, 46 72 C 48 44, 49 20, 50 8 C 51 20, 52 44, 54 72 C 60 100, 62 114, 60 122 C 56 126, 44 126, 40 122 Z",
	canals: [
		{
			id: "Main",
			nameRu: "Центральный канал",
			path: "M 50 120 C 50 88, 50 44, 50 8",
			apex: { x: 50, y: 8 },
			defaultLengthMm: 22.5,
		},
	],
	apexHalos: [{ x: 50, y: 8 }],
	periodontal: {
		boneCrestNormal: "M 22 86 Q 50 82 78 86",
		boneResorptionMild: "M 22 74 Q 50 70 78 74",
		boneResorptionModerate: "M 22 60 Q 50 56 78 60",
		boneResorptionSevere: "M 22 40 Q 50 36 78 40",
		furcationSites: [],
	},
	surfaces: {
		O: "M 32 136 L 68 136 L 76 150 L 24 150 Z",
		V: "M 26 96 C 38 93, 62 93, 74 96 L 68 136 L 32 136 Z",
		L: "M 32 136 L 68 136 L 60 148 L 40 148 Z",
		M: "M 26 96 L 32 136 L 24 150 C 18 136, 20 110, 26 96 Z",
		D: "M 74 96 C 80 110, 82 136, 76 150 L 68 136 Z",
		C: "M 26 96 Q 50 92 74 96 L 68 108 Q 50 104 32 108 Z",
	},
	viewBox: { x: 12, y: 0, width: 76, height: 160 },
	standardWidthPx: 58,
	standardHeightPx: 128,
};

// --- 5. НИЖНИЕ МОЛЯРЫ (36, 37, 38, 46, 47, 48) ---
// 2 мощных изогнутых корня: M (Медиальный, 2 канала: MB, ML) и D (Дистальный)
const LOWER_MOLAR_GEOMETRY: AnatomicalTemplateData = {
	crown:
		"M 16 64 C 10 50, 8 22, 24 12 C 34 7, 48 10, 50 18 C 52 10, 66 7, 76 12 C 92 22, 90 50, 84 64 Q 50 68 16 64 Z",
	root:
		"M 16 64 C 11 88, 14 124, 22 154 C 28 142, 38 120, 50 96 C 62 120, 72 142, 78 150 C 86 124, 89 88, 84 64 Z",
	cej: "M 16 64 Q 50 68 84 64",
	fissures: "M 28 28 Q 50 20 72 28 M 50 42 L 50 18 M 36 38 Q 50 32 64 38",
	pulpChamber: "M 28 34 C 26 44, 32 58, 36 64 C 42 70, 58 70, 64 64 C 68 58, 74 44, 72 34 C 66 30, 56 38, 50 34 C 44 38, 34 30, 28 34 Z",
	canals: [
		{
			id: "MB",
			nameRu: "Медиально-щечный (MB)",
			path: "M 36 56 C 32 84, 22 122, 22 154",
			apex: { x: 22, y: 154 },
			defaultLengthMm: 21.0,
		},
		{
			id: "ML",
			nameRu: "Медиально-язычный (ML)",
			path: "M 42 56 C 38 84, 28 120, 26 148",
			apex: { x: 26, y: 148 },
			defaultLengthMm: 21.0,
		},
		{
			id: "D",
			nameRu: "Дистальный (Distal)",
			path: "M 64 56 C 68 84, 78 120, 78 150",
			apex: { x: 78, y: 150 },
			defaultLengthMm: 21.5,
		},
	],
	apexHalos: [
		{ x: 22, y: 154 },
		{ x: 78, y: 150 },
	],
	periodontal: {
		boneCrestNormal: "M 12 74 Q 50 78 88 74",
		boneResorptionMild: "M 12 84 Q 50 88 88 84",
		boneResorptionModerate: "M 12 98 Q 50 102 88 98",
		boneResorptionSevere: "M 12 118 Q 50 122 88 118",
		furcationSites: [
			{
				id: "M_D_Bifurcation_Buccal",
				nameRu: "Щечная бифуркация нижнего моляра",
				position: { x: 50, y: 96 },
				type: "bifurcation" as const,
			},
			{
				id: "M_D_Bifurcation_Lingual",
				nameRu: "Язычная бифуркация нижнего моляра",
				position: { x: 50, y: 98 },
				type: "bifurcation" as const,
			},
		],
	},
	surfaces: {
		O: "M 30 38 Q 50 32 70 38 L 66 18 Q 50 14 34 18 Z",
		V: "M 16 64 C 32 67, 68 67, 84 64 L 70 38 Q 50 32 30 38 Z",
		L: "M 34 18 Q 50 14 66 18 L 76 12 C 66 7, 34 7, 24 12 Z",
		M: "M 16 64 L 30 38 L 34 18 L 24 12 C 10 22, 10 50, 16 64 Z",
		D: "M 84 64 C 90 50, 90 22, 76 12 L 66 18 L 70 38 Z",
		C: "M 16 64 Q 50 68 84 64 L 78 52 Q 50 56 22 52 Z",
	},
	viewBox: { x: 0, y: 0, width: 100, height: 160 },
	standardWidthPx: 80,
	standardHeightPx: 128,
};

// --- 6. НИЖНИЕ ПРЕМОЛЯРЫ (34, 35, 44, 45) ---
// Одиночный крепкий длинный корень, выраженный щечный бугор
const LOWER_PREMOLAR_GEOMETRY: AnatomicalTemplateData = {
	crown:
		"M 24 64 C 18 52, 18 22, 34 12 C 44 8, 56 8, 66 12 C 82 22, 82 52, 76 64 Q 50 68 24 64 Z",
	root: "M 24 64 C 23 88, 35 124, 50 154 C 65 124, 77 88, 76 64 Z",
	cej: "M 24 64 Q 50 68 76 64",
	fissures: "M 36 30 Q 50 26 64 30 M 50 40 L 50 20",
	pulpChamber: "M 42 36 C 40 46, 42 60, 46 88 C 48 116, 49 140, 50 154 C 51 140, 52 116, 54 88 C 58 60, 60 46, 58 36 C 54 28, 46 28, 42 36 Z",
	canals: [
		{
			id: "Main",
			nameRu: "Основной корневой канал",
			path: "M 50 40 C 50 72, 50 116, 50 154",
			apex: { x: 50, y: 154 },
			defaultLengthMm: 22.0,
		},
	],
	apexHalos: [{ x: 50, y: 154 }],
	periodontal: {
		boneCrestNormal: "M 20 74 Q 50 78 80 74",
		boneResorptionMild: "M 20 86 Q 50 90 80 86",
		boneResorptionModerate: "M 20 102 Q 50 106 80 102",
		boneResorptionSevere: "M 20 122 Q 50 126 80 122",
		furcationSites: [],
	},
	surfaces: {
		O: "M 36 38 Q 50 34 64 38 L 60 20 Q 50 16 40 20 Z",
		V: "M 24 64 C 36 67, 64 67, 76 64 L 64 38 Q 50 34 36 38 Z",
		L: "M 40 20 Q 50 16 60 20 L 66 12 C 56 8, 44 8, 34 12 Z",
		M: "M 24 64 L 36 38 L 40 20 L 34 12 C 18 22, 18 52, 24 64 Z",
		D: "M 76 64 C 82 52, 82 22, 66 12 L 60 20 L 64 38 Z",
		C: "M 24 64 Q 50 68 76 64 L 70 52 Q 50 56 30 52 Z",
	},
	viewBox: { x: 10, y: 0, width: 80, height: 160 },
	standardWidthPx: 64,
	standardHeightPx: 128,
};

// --- 7. НИЖНИЕ КЛЫКИ (33, 43) ---
const LOWER_CANINE_GEOMETRY: AnatomicalTemplateData = {
	crown:
		"M 26 64 C 20 50, 18 26, 50 8 C 82 26, 80 50, 74 64 Q 50 68 26 64 Z",
	root: "M 26 64 C 23 88, 34 126, 50 156 C 66 126, 77 88, 74 64 Z",
	cej: "M 26 64 Q 50 68 74 64",
	fissures: "M 50 42 L 50 12",
	pulpChamber: "M 42 36 C 40 46, 42 60, 46 88 C 48 120, 49 146, 50 156 C 51 146, 52 120, 54 88 C 58 60, 60 46, 58 36 C 54 28, 46 28, 42 36 Z",
	canals: [
		{
			id: "Main",
			nameRu: "Основной канал клыка",
			path: "M 50 40 C 50 72, 50 118, 50 156",
			apex: { x: 50, y: 156 },
			defaultLengthMm: 25.5,
		},
	],
	apexHalos: [{ x: 50, y: 156 }],
	periodontal: {
		boneCrestNormal: "M 22 74 Q 50 79 78 74",
		boneResorptionMild: "M 22 86 Q 50 91 78 86",
		boneResorptionModerate: "M 22 104 Q 50 109 78 104",
		boneResorptionSevere: "M 22 126 Q 50 131 78 126",
		furcationSites: [],
	},
	surfaces: {
		O: "M 38 38 Q 50 34 62 38 L 50 8 Z",
		V: "M 26 64 C 38 67, 62 67, 74 64 L 62 38 Q 50 34 38 38 Z",
		L: "M 38 38 L 50 8 L 62 38 Q 50 24 38 38 Z",
		M: "M 26 64 L 38 38 L 50 8 C 28 22, 22 46, 26 64 Z",
		D: "M 74 64 C 78 46, 72 22, 50 8 L 62 38 Z",
		C: "M 26 64 Q 50 68 74 64 L 68 52 Q 50 56 32 52 Z",
	},
	viewBox: { x: 12, y: 0, width: 76, height: 160 },
	standardWidthPx: 60,
	standardHeightPx: 128,
};

// --- 8. НИЖНИЕ РЕЗЦЫ (31, 32, 41, 42) ---
// Тонкие, сжатые с боков корни
const LOWER_INCISOR_GEOMETRY: AnatomicalTemplateData = {
	crown:
		"M 28 64 C 22 50, 20 22, 26 12 C 38 10, 62 10, 74 12 C 80 22, 78 50, 72 64 Q 50 68 28 64 Z",
	root: "M 28 64 C 27 88, 38 122, 50 152 C 62 122, 73 88, 72 64 Z",
	cej: "M 28 64 Q 50 68 72 64",
	fissures: "M 34 16 L 66 16",
	pulpChamber: "M 42 38 C 40 46, 42 60, 46 88 C 48 116, 49 140, 50 152 C 51 140, 52 116, 54 88 C 58 60, 60 46, 58 38 C 54 32, 46 32, 42 38 Z",
	canals: [
		{
			id: "Main",
			nameRu: "Центральный канал",
			path: "M 50 40 C 50 72, 50 114, 50 152",
			apex: { x: 50, y: 152 },
			defaultLengthMm: 20.5,
		},
	],
	apexHalos: [{ x: 50, y: 152 }],
	periodontal: {
		boneCrestNormal: "M 24 74 Q 50 78 76 74",
		boneResorptionMild: "M 24 86 Q 50 90 76 86",
		boneResorptionModerate: "M 24 102 Q 50 106 76 102",
		boneResorptionSevere: "M 24 122 Q 50 126 76 122",
		furcationSites: [],
	},
	surfaces: {
		O: "M 32 24 L 68 24 L 74 12 L 26 12 Z",
		V: "M 28 64 C 38 67, 62 67, 72 64 L 68 24 L 32 24 Z",
		L: "M 32 24 L 68 24 L 60 14 L 40 14 Z",
		M: "M 28 64 L 32 24 L 26 12 C 20 24, 22 50, 28 64 Z",
		D: "M 72 64 C 78 50, 80 24, 74 12 L 68 24 Z",
		C: "M 28 64 Q 50 68 72 64 L 68 52 Q 50 56 32 52 Z",
	},
	viewBox: { x: 12, y: 0, width: 76, height: 160 },
	standardWidthPx: 54,
	standardHeightPx: 128,
};

// --- 9. МОЛОЧНЫЕ ВЕРХНИЕ МОЛЯРЫ (54, 55, 64, 65) ---
// 3 широко расставленных корня для зачатка премоляра
const PEDIATRIC_UPPER_MOLAR_GEOMETRY: AnatomicalTemplateData = {
	crown:
		"M 18 84 C 12 96, 10 128, 28 138 C 36 142, 48 140, 50 134 C 52 140, 64 142, 72 138 C 90 128, 88 96, 82 84 Q 50 80 18 84 Z",
	root:
		"M 18 84 C 10 64, 10 38, 16 18 C 24 30, 32 48, 36 66 C 42 48, 46 28, 50 14 C 54 28, 58 48, 64 66 C 68 48, 76 30, 84 18 C 90 38, 90 64, 82 84 Z",
	cej: "M 18 84 Q 50 80 82 84",
	fissures: "M 30 124 Q 50 130 70 124 M 50 110 L 50 132",
	pulpChamber: "M 30 114 C 28 104, 32 94, 38 86 C 44 82, 56 82, 62 86 C 68 94, 72 104, 70 114 C 64 118, 36 118, 30 114 Z",
	canals: [
		{
			id: "MB",
			nameRu: "Медиально-щечный (MB)",
			path: "M 36 92 C 30 70, 20 44, 16 18",
			apex: { x: 16, y: 18 },
			defaultLengthMm: 16.5,
		},
		{
			id: "P",
			nameRu: "Нёбный (Palatal)",
			path: "M 50 92 C 50 70, 50 38, 50 14",
			apex: { x: 50, y: 14 },
			defaultLengthMm: 17.5,
		},
		{
			id: "DB",
			nameRu: "Дистально-щечный (DB)",
			path: "M 64 92 C 70 70, 80 44, 84 18",
			apex: { x: 84, y: 18 },
			defaultLengthMm: 16.0,
		},
	],
	apexHalos: [
		{ x: 16, y: 18 },
		{ x: 50, y: 14 },
		{ x: 84, y: 18 },
	],
	periodontal: {
		boneCrestNormal: "M 14 76 Q 50 72 86 76",
		boneResorptionMild: "M 14 66 Q 50 62 86 66",
		boneResorptionModerate: "M 14 54 Q 50 50 86 54",
		boneResorptionSevere: "M 14 38 Q 50 34 86 38",
		furcationSites: [
			{
				id: "Pediatric_Trifurcation",
				nameRu: "Дивергирующая трифуркация молочного моляра",
				position: { x: 50, y: 66 },
				type: "trifurcation_buccal" as const,
			},
		],
	},
	surfaces: {
		O: "M 32 110 Q 50 116 68 110 L 64 130 Q 50 134 36 130 Z",
		V: "M 18 84 C 32 81, 68 81, 82 84 L 68 110 Q 50 116 32 110 Z",
		L: "M 36 130 Q 50 134 64 130 L 72 138 C 64 142, 36 142, 28 138 Z",
		M: "M 18 84 L 32 110 L 36 130 L 28 138 C 12 128, 12 96, 18 84 Z",
		D: "M 82 84 C 88 96, 88 128, 72 138 L 64 130 L 68 110 Z",
		C: "M 18 84 Q 50 80 82 84 L 76 96 Q 50 92 24 96 Z",
	},
	viewBox: { x: 0, y: 0, width: 100, height: 160 },
	standardWidthPx: 72,
	standardHeightPx: 116,
};

// --- 10. МОЛОЧНЫЕ НИЖНИЕ МОЛЯРЫ (74, 75, 84, 85) ---
// 2 широко дивергирующих корня
const PEDIATRIC_LOWER_MOLAR_GEOMETRY: AnatomicalTemplateData = {
	crown:
		"M 18 76 C 12 64, 10 32, 28 22 C 36 18, 48 20, 50 26 C 52 20, 64 18, 72 22 C 90 32, 88 64, 82 76 Q 50 80 18 76 Z",
	root:
		"M 18 76 C 10 96, 10 122, 16 142 C 26 130, 36 110, 50 90 C 64 110, 74 130, 84 142 C 90 122, 90 96, 82 76 Z",
	cej: "M 18 76 Q 50 80 82 76",
	fissures: "M 30 36 Q 50 30 70 36 M 50 50 L 50 28",
	pulpChamber: "M 30 46 C 28 56, 32 66, 38 74 C 44 78, 56 78, 62 74 C 68 66, 72 56, 70 46 C 64 42, 36 42, 30 46 Z",
	canals: [
		{
			id: "M",
			nameRu: "Медиальный канал (M)",
			path: "M 36 68 C 28 88, 20 116, 16 142",
			apex: { x: 16, y: 142 },
			defaultLengthMm: 16.0,
		},
		{
			id: "D",
			nameRu: "Дистальный канал (D)",
			path: "M 64 68 C 72 88, 80 116, 84 142",
			apex: { x: 84, y: 142 },
			defaultLengthMm: 16.0,
		},
	],
	apexHalos: [
		{ x: 16, y: 142 },
		{ x: 84, y: 142 },
	],
	periodontal: {
		boneCrestNormal: "M 14 84 Q 50 88 86 84",
		boneResorptionMild: "M 14 94 Q 50 98 86 94",
		boneResorptionModerate: "M 14 106 Q 50 110 86 106",
		boneResorptionSevere: "M 14 122 Q 50 126 86 122",
		furcationSites: [
			{
				id: "Pediatric_Bifurcation",
				nameRu: "Дивергирующая бифуркация нижнего молочного моляра",
				position: { x: 50, y: 90 },
				type: "bifurcation" as const,
			},
		],
	},
	surfaces: {
		O: "M 32 50 Q 50 44 68 50 L 64 30 Q 50 26 36 30 Z",
		V: "M 18 76 C 32 79, 68 79, 82 76 L 68 50 Q 50 44 32 50 Z",
		L: "M 36 30 Q 50 26 64 30 L 72 22 C 64 18, 36 18, 28 22 Z",
		M: "M 18 76 L 32 50 L 36 30 L 28 22 C 12 32, 12 64, 18 76 Z",
		D: "M 82 76 C 88 64, 88 32, 72 22 L 64 30 L 68 50 Z",
		C: "M 18 76 Q 50 80 82 76 L 76 64 Q 50 68 24 64 Z",
	},
	viewBox: { x: 0, y: 0, width: 100, height: 160 },
	standardWidthPx: 72,
	standardHeightPx: 116,
};

/**
 * Получить морфологическую группу зуба по номеру FDI.
 */
export function getAnatomicalGroup(fdiNumber: number): ToothMorphologyGroup {
	const quadrant = Math.floor(fdiNumber / 10);
	const pos = fdiNumber % 10;
	const isPediatric = quadrant >= 5 && quadrant <= 8;

	if (isPediatric) {
		if (pos === 1 || pos === 2) return "primary_incisor";
		if (pos === 3) return "primary_canine";
		if (pos === 4) return "primary_molar_1";
		return "primary_molar_2";
	}

	if (pos === 1) return "incisor_central";
	if (pos === 2) return "incisor_lateral";
	if (pos === 3) return "canine";
	if (pos === 4) return "premolar_1";
	if (pos === 5) return "premolar_2";
	if (pos === 6) return "molar_1";
	if (pos === 7) return "molar_2";
	return "molar_3";
}

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
 * Получить полную анатомическую модель для конкретного зуба FDI.
 */
export function getAnatomicalToothGeometry(
	fdiNumber: number,
): AnatomicalToothGeometry {
	const group = getAnatomicalGroup(fdiNumber);
	const arch: ToothArch = isMaxillaryArch(fdiNumber) ? "maxillary" : "mandibular";
	const side: ToothSide = isPatientLeftSide(fdiNumber) ? "left" : "right";
	const isPediatric = Math.floor(fdiNumber / 10) >= 5;

	// Выбираем шаблон геометрии
	let template: AnatomicalTemplateData;
	let rootNamesRu: readonly string[];
	let rootsCount: number;

	if (isPediatric) {
		if (arch === "maxillary") {
			if (group === "primary_molar_1" || group === "primary_molar_2") {
				template = PEDIATRIC_UPPER_MOLAR_GEOMETRY;
				rootNamesRu = ["Медиально-щечный", "Дистально-щечный", "Нёбный"];
				rootsCount = 3;
			} else if (group === "primary_canine") {
				template = UPPER_CANINE_GEOMETRY;
				rootNamesRu = ["Одиночный конусовидный корень"];
				rootsCount = 1;
			} else {
				template = UPPER_INCISOR_GEOMETRY;
				rootNamesRu = ["Одиночный резечный корень"];
				rootsCount = 1;
			}
		} else {
			if (group === "primary_molar_1" || group === "primary_molar_2") {
				template = PEDIATRIC_LOWER_MOLAR_GEOMETRY;
				rootNamesRu = ["Медиальный", "Дистальный"];
				rootsCount = 2;
			} else if (group === "primary_canine") {
				template = LOWER_CANINE_GEOMETRY;
				rootNamesRu = ["Одиночный корень клыка"];
				rootsCount = 1;
			} else {
				template = LOWER_INCISOR_GEOMETRY;
				rootNamesRu = ["Одиночный тонкий корень"];
				rootsCount = 1;
			}
		}
	} else {
		// Постоянные зубы
		if (arch === "maxillary") {
			if (group === "molar_1" || group === "molar_2" || group === "molar_3") {
				template = UPPER_MOLAR_GEOMETRY;
				rootNamesRu = ["Медиально-щечный (MB)", "Дистально-щечный (DB)", "Нёбный (P)"];
				rootsCount = 3;
			} else if (group === "premolar_1" || group === "premolar_2") {
				template = UPPER_PREMOLAR_GEOMETRY;
				rootNamesRu = group === "premolar_1"
					? ["Щечный (B)", "Нёбный (P)"]
					: ["Одиночный бороздчатый корень"];
				rootsCount = group === "premolar_1" ? 2 : 1;
			} else if (group === "canine") {
				template = UPPER_CANINE_GEOMETRY;
				rootNamesRu = ["Одиночный массивный корень"];
				rootsCount = 1;
			} else {
				template = UPPER_INCISOR_GEOMETRY;
				rootNamesRu = ["Одиночный конусовидный корень"];
				rootsCount = 1;
			}
		} else {
			if (group === "molar_1" || group === "molar_2" || group === "molar_3") {
				template = LOWER_MOLAR_GEOMETRY;
				rootNamesRu = ["Медиальный (M)", "Дистальный (D)"];
				rootsCount = 2;
			} else if (group === "premolar_1" || group === "premolar_2") {
				template = LOWER_PREMOLAR_GEOMETRY;
				rootNamesRu = ["Одиночный округлый корень"];
				rootsCount = 1;
			} else if (group === "canine") {
				template = LOWER_CANINE_GEOMETRY;
				rootNamesRu = ["Одиночный корень клыка"];
				rootsCount = 1;
			} else {
				template = LOWER_INCISOR_GEOMETRY;
				rootNamesRu = ["Одиночный сжатый корень"];
				rootsCount = 1;
			}
		}
	}

	return {
		fdiNumber,
		group,
		arch,
		side,
		isPediatric,
		rootsCount,
		rootNamesRu,
		crownPath: template.crown,
		rootPath: template.root,
		cejPath: template.cej,
		fissurePath: template.fissures,
		surfaces: template.surfaces,
		canals: template.canals,
		pulpChamberPath: template.pulpChamber,
		apexHalos: template.apexHalos,
		periodontal: template.periodontal,
		viewBox: template.viewBox,
		standardWidthPx: template.standardWidthPx,
		standardHeightPx: template.standardHeightPx,
		touchTargetMinPx: 44, // Sterile glove touch target safety floor
	};
}

/**
 * Все 32 постоянных зуба взрослого человека (FDI).
 */
export const ADULT_UPPER_TEETH = [
	18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28,
] as const;

export const ADULT_LOWER_TEETH = [
	48, 47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37, 38,
] as const;

/**
 * Все 20 молочных зубов ребенка (FDI).
 */
export const PEDIATRIC_UPPER_TEETH = [55, 54, 53, 52, 51, 61, 62, 63, 64, 65] as const;
export const PEDIATRIC_LOWER_TEETH = [85, 84, 83, 82, 81, 71, 72, 73, 74, 75] as const;

/**
 * Сменный прикус (Mixed Dentition).
 */
export const MIXED_UPPER_TEETH = [
	16, 55, 54, 53, 52, 51, 61, 62, 63, 64, 65, 26,
] as const;

export const MIXED_LOWER_TEETH = [
	46, 85, 84, 83, 82, 81, 71, 72, 73, 74, 75, 36,
] as const;

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

