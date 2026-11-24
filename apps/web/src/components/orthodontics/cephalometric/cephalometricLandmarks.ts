/**
 * @dental/web/components/orthodontics/cephalometric/cephalometricLandmarks.ts
 *
 * Канонический SSOT анатомических ориентиров, пресетов и ролей ТРГ (Мандаты 8b, 8e, 8x).
 * Консолидированный модуль анатомической разметки боковой телерентгенографии.
 */

export interface Point2D {
	x: number;
	y: number;
}

export type LandmarkKey =
	| "S"
	| "N"
	| "Or"
	| "Po"
	| "ANS"
	| "PNS"
	| "A"
	| "B"
	| "Pog"
	| "Gn"
	| "Me"
	| "Go"
	| "Ba"
	| "Ar"
	| "Pt"
	| "Prn"
	| "Ls"
	| "Li"
	| "Pog_prime"
	| "U1t"
	| "U1a"
	| "L1t"
	| "L1a"
	| "Mo";

export interface LandmarkDefinition {
	key: LandmarkKey;
	code: string;
	nameRu: string;
	latinName: string;
	anatomicalDescription: string;
	category: "cranial" | "maxillary" | "mandibular" | "dental" | "soft_tissue";
	color: string;
}

export type LandmarkMap = Partial<Record<LandmarkKey, Point2D>>;

export interface CephalometricMeasurement {
	id: string;
	nameRu: string;
	normMin: number;
	normMax: number;
	unit: "deg" | "mm";
	value: number | null;
	status: "normal" | "deviation_high" | "deviation_low" | "unmeasured";
	clinicalInterpretation: string;
	category: "skeletal_sagittal" | "skeletal_vertical" | "dental_upper" | "dental_lower" | "interincisal" | "soft_tissue";
	readonly symbol?: string | undefined;
}

export interface CephalometricDiagnosis {
	skeletalClass: "Class I" | "Class II" | "Class III" | "Undefined";
	skeletalClassRu: string;
	maxillaryPosition: "Normal" | "Prognathism" | "Retrognathism" | "Undefined";
	maxillaryPositionRu: string;
	mandibularPosition: "Normal" | "Prognathism" | "Retrognathism" | "Undefined";
	mandibularPositionRu: string;
	growthPattern: "Dolichofacial (Hyperdivergent)" | "Mesofacial" | "Brachyfacial (Hypodivergent)" | "Undefined";
	growthPatternRu: string;
	upperIncisorInclination: "Normal" | "Proclination" | "Retroclination" | "Undefined";
	upperIncisorInclinationRu: string;
	lowerIncisorInclination: "Normal" | "Proclination" | "Retroclination" | "Undefined";
	lowerIncisorInclinationRu: string;
	rickettsELineRu?: string | undefined;
	witsRelationshipRu: string;
	downsConvexityRu: string;
	mcnamaraRelationshipRu: string;
	u1NaRelationshipRu: string;
	l1NbRelationshipRu: string;
	summaryRu: string;
	protocol043Text: string;
}

export interface CephalometricAnalysisResult {
	measurements: CephalometricMeasurement[];
	diagnosis: CephalometricDiagnosis;
	landmarks: LandmarkMap;
	scaleMmPerPixel: number;
	isComplete: boolean;
	placedCount: number;
	totalCount: number;
	completionPercentage: number;
	readonly sna?: number | undefined;
	readonly snb?: number | undefined;
	readonly anb?: number | undefined;
	readonly u1NaDeg?: number | undefined;
	readonly l1NbDeg?: number | undefined;
	readonly fmaDeg?: number | undefined;
}

export const CEPHALOMETRIC_LANDMARKS: LandmarkDefinition[] = [
	{ key: "S", code: "S", nameRu: "Sella (Седло)", latinName: "Sella turcica", anatomicalDescription: "Турецкое седло", category: "cranial", color: "var(--primary)" },
	{ key: "N", code: "N", nameRu: "Nasion (Назион)", latinName: "Nasion", anatomicalDescription: "Лобно-носовой шов", category: "cranial", color: "var(--primary)" },
	{ key: "Or", code: "Or", nameRu: "Orbitale (Орбитале)", latinName: "Orbitale", anatomicalDescription: "Орбитале (нижний край глазницы, FH)", category: "cranial", color: "var(--primary)" },
	{ key: "Po", code: "Po", nameRu: "Porion (Порион)", latinName: "Porion", anatomicalDescription: "Порион (верхний край слухового прохода, FH)", category: "cranial", color: "var(--primary)" },
	{ key: "ANS", code: "ANS", nameRu: "ANS (Передняя носовая ость)", latinName: "Spina nasalis anterior", anatomicalDescription: "Передняя носовая ость", category: "maxillary", color: "var(--primary)" },
	{ key: "PNS", code: "PNS", nameRu: "PNS (Задняя носовая ость)", latinName: "Spina nasalis posterior", anatomicalDescription: "Задняя носовая ость (край твердого нёба)", category: "maxillary", color: "var(--primary)" },
	{ key: "A", code: "A", nameRu: "Точка A (Субспинале)", latinName: "Subspinale", anatomicalDescription: "Точка А (вогнутость базиса ВЧ)", category: "maxillary", color: "var(--primary)" },
	{ key: "B", code: "B", nameRu: "Точка B (Супраментале)", latinName: "Supramentale", anatomicalDescription: "Точка В (вогнутость базиса НЧ)", category: "mandibular", color: "var(--primary)" },
	{ key: "Pog", code: "Pog", nameRu: "Pogonion (Погонион)", latinName: "Pogonion", anatomicalDescription: "Погонион (передняя точка подбородка)", category: "mandibular", color: "var(--primary)" },
	{ key: "Gn", code: "Gn", nameRu: "Gnathion (Гнатион)", latinName: "Gnathion", anatomicalDescription: "Гнатион (передне-нижняя точка симфиза)", category: "mandibular", color: "var(--primary)" },
	{ key: "Me", code: "Me", nameRu: "Menton (Ментон)", latinName: "Menton", anatomicalDescription: "Ментон (нижняя точка подбородочного симфиза)", category: "mandibular", color: "var(--primary)" },
	{ key: "Go", code: "Go", nameRu: "Gonion (Гонион)", latinName: "Gonion", anatomicalDescription: "Гонион (вершина угла нижней челюсти)", category: "mandibular", color: "var(--primary)" },
	{ key: "Ba", code: "Ba", nameRu: "Basion (Базион)", latinName: "Basion", anatomicalDescription: "Задняя граница основания черепа (передний край foramen magnum)", category: "cranial", color: "var(--primary)" },
	{ key: "Ar", code: "Ar", nameRu: "Articulare (Артикуляре)", latinName: "Articulare", anatomicalDescription: "Пересечение основания черепа и заднего контура ветви НЧ", category: "cranial", color: "var(--primary)" },
	{ key: "Pt", code: "Pt", nameRu: "Pterygoid (Птеригоид)", latinName: "Pterygoid", anatomicalDescription: "Верхняя точка крыловидно-челюстной щели", category: "cranial", color: "var(--primary)" },
	{ key: "Prn", code: "Prn", nameRu: "Pronasale (Проназале)", latinName: "Pronasale", anatomicalDescription: "Наиболее выступающая точка кончика носа (линия Риккетса E-line)", category: "soft_tissue", color: "#f43f5e" },
	{ key: "Ls", code: "Ls", nameRu: "Labrale superius (Верхняя губа)", latinName: "Labrale superius", anatomicalDescription: "Наиболее выступающая точка красной каймы верхней губы", category: "soft_tissue", color: "#f43f5e" },
	{ key: "Li", code: "Li", nameRu: "Labrale inferius (Нижняя губа)", latinName: "Labrale inferius", anatomicalDescription: "Наиболее выступающая точка красной каймы нижней губы", category: "soft_tissue", color: "#f43f5e" },
	{ key: "Pog_prime", code: "Pog'", nameRu: "Pog' (Кожный погонион)", latinName: "Pogonion cutaneum", anatomicalDescription: "Наиболее передняя точка мягких тканей подбородка", category: "soft_tissue", color: "#f43f5e" },
	{ key: "U1t", code: "U1-tip", nameRu: "U1 Tip (Край верхнего резца)", latinName: "Incisor superior incisal", anatomicalDescription: "Режущий край центрального резца ВЧ", category: "dental", color: "#22c55e" },
	{ key: "U1a", code: "U1-apex", nameRu: "U1 Apex (Корень верхнего резца)", latinName: "Incisor superior apical", anatomicalDescription: "Верхушка корня центрального резца ВЧ", category: "dental", color: "#22c55e" },
	{ key: "L1t", code: "L1-tip", nameRu: "L1 Tip (Край нижнего резца)", latinName: "Incisor inferior incisal", anatomicalDescription: "Режущий край центрального резца НЧ", category: "dental", color: "#22c55e" },
	{ key: "L1a", code: "L1-apex", nameRu: "L1 Apex (Корень нижнего резца)", latinName: "Incisor inferior apical", anatomicalDescription: "Верхушка корня центрального резца НЧ", category: "dental", color: "#22c55e" },
	{ key: "Mo", code: "Mo", nameRu: "Mo (Смыкание моляров)", latinName: "Molaris occlusalis", anatomicalDescription: "Точка фиссурно-бугоркового смыкания первых моляров (дистальный ориентир окклюзионной плоскости)", category: "dental", color: "#22c55e" },
];

export const DEFAULT_CEPH_LANDMARKS_PRESET: LandmarkMap = {
	S: { x: 280, y: 190 },
	N: { x: 440, y: 155 },
	Or: { x: 415, y: 230 },
	Po: { x: 245, y: 245 },
	ANS: { x: 475, y: 310 },
	PNS: { x: 305, y: 325 },
	A: { x: 462, y: 342 },
	B: { x: 446, y: 440 },
	Pog: { x: 452, y: 490 },
	Gn: { x: 442, y: 520 },
	Me: { x: 420, y: 540 },
	Go: { x: 250, y: 435 },
	Ba: { x: 220, y: 290 },
	Ar: { x: 235, y: 310 },
	Pt: { x: 310, y: 270 },
	Prn: { x: 535, y: 295 },
	Ls: { x: 508, y: 380 },
	Li: { x: 498, y: 425 },
	Pog_prime: { x: 472, y: 490 },
	U1t: { x: 494, y: 395 },
	U1a: { x: 456, y: 325 },
	L1t: { x: 471, y: 400 },
	L1a: { x: 428, y: 495 },
	Mo: { x: 385, y: 385 },
};

export const CLASS_I_NORMAL_LANDMARKS_PRESET: LandmarkMap = {
	...DEFAULT_CEPH_LANDMARKS_PRESET,
	B: { x: 460, y: 440 },
	Pog: { x: 466, y: 490 },
	Gn: { x: 456, y: 520 },
	Me: { x: 435, y: 540 },
	Pog_prime: { x: 486, y: 490 },
};

export const CLASS_II_DISTAL_LANDMARKS_PRESET: LandmarkMap = {
	...DEFAULT_CEPH_LANDMARKS_PRESET,
	B: { x: 440, y: 440 },
	Pog: { x: 446, y: 490 },
	Gn: { x: 436, y: 520 },
	Me: { x: 415, y: 540 },
	Pog_prime: { x: 466, y: 490 },
	Li: { x: 490, y: 425 },
};

export const CLASS_III_MESIAL_LANDMARKS_PRESET: LandmarkMap = {
	...DEFAULT_CEPH_LANDMARKS_PRESET,
	B: { x: 485, y: 440 },
	Pog: { x: 491, y: 490 },
	Gn: { x: 480, y: 520 },
	Me: { x: 460, y: 540 },
	Pog_prime: { x: 510, y: 490 },
	Li: { x: 512, y: 425 },
};

export const LANDMARK_CLINICAL_ROLES: Record<LandmarkKey, { depends: string; clinicalTip: string }> = {
	S: {
		depends: "Углы SNA (82°±2°), SNB (80°±2°), SN-GoGn (32°±3°), U1-SN (104°±2°), Y-ось Downs",
		clinicalTip: "Центр контура турецкого седла (гипофизарной ямки клиновидной кости).",
	},
	N: {
		depends: "Ключевая точка основания черепа: углы SNA, SNB, ANB (Класс I/II/III), 1-NA, 1-NB, Facial Angle, Convexity",
		clinicalTip: "Лобно-носовой шов на профильном контуре черепа (переход лобной кости в носовую).",
	},
	A: {
		depends: "Угол SNA (ВЧ к черепу), угол ANB (Скелетный класс), Wits-число, 1-NA (22°±2° и 4±1 мм), McNamara A-Nperp",
		clinicalTip: "Точка наибольшей вогнутости переднего контура апикального базиса верхней челюсти под остью ANS.",
	},
	B: {
		depends: "Угол SNB (НЧ к черепу), угол ANB (Скелетный класс), Wits-число, 1-NB (25°±2° и 4±1 мм)",
		clinicalTip: "Точка наибольшей вогнутости переднего контура альвеолярной части нижней челюсти над погонионом Pog.",
	},
	Pog: {
		depends: "Лицевой угол Downs (N-Pog to FH), угол выпуклости Downs (N-A-Pog), McNamara Pog-Nperp",
		clinicalTip: "Наиболее передняя точка подбородочного выступа на профиле симфиза нижней челюсти.",
	},
	Me: {
		depends: "Плоскость основания нижней челюсти MP, угол FMA (25°±3°), угол наклона SN-GoGn, наклон резцов L1-MP",
		clinicalTip: "Самая нижняя точка контура подбородочного симфиза нижней челюсти.",
	},
	Gn: {
		depends: "Гнатион: угол SN-GoGn, ось роста лица Y-Axis (Downs), угол FMA (Tweed)",
		clinicalTip: "Передне-нижняя точка контура подбородочного симфиза (между точками Pog и Me).",
	},
	Go: {
		depends: "Угол нижней челюсти: плоскость MP, угол FMA (Tweed), SN-GoGn (Steiner), межбазисный угол NL-ML",
		clinicalTip: "Вершина угла нижней челюсти (переход тела челюсти в восходящую ветвь).",
	},
	ANS: {
		depends: "Нёбная плоскость NL, межбазисный угол NL-ML (Ricketts, 25°±4°), Wits-ориентир",
		clinicalTip: "Вершина костного выступа передней носовой ости на дистальном крае грушевидного отверстия.",
	},
	PNS: {
		depends: "Нёбная плоскость NL, межбазисный угол NL-ML (Ricketts), окклюзионная плоскость",
		clinicalTip: "Задний дистальный край твердого нёба (вершина задней носовой ости).",
	},
	Or: {
		depends: "Франкфуртская горизонталь FH (FMA Tweed, Facial Angle Downs, Y-Axis, McNamara)",
		clinicalTip: "Самая нижняя точка инфраорбитального края глазницы на рентгенограмме.",
	},
	Po: {
		depends: "Франкфуртская горизонталь FH (FMA Tweed, Facial Angle Downs, Y-Axis, McNamara)",
		clinicalTip: "Верхний край наружного слухового прохода.",
	},
	Ba: {
		depends: "Основание черепа: плоскость Ba-N, краниальный угол Ba-S-N, анализ Jarabak и McNamara",
		clinicalTip: "Базион — самая нижняя и задняя точка переднего края большого затылочного отверстия.",
	},
	Ar: {
		depends: "Суставной угол S-Ar-Go, высота ветви нижней челюсти, полигон Бьёрка-Джарабака",
		clinicalTip: "Точка пересечения нижней границы основания черепа с задним контуром ветви нижней челюсти.",
	},
	Pt: {
		depends: "Ось лица Риккетса (Pt-Gn), наклон плоскости челюсти, цефалометрический анализ Ricketts",
		clinicalTip: "Верхняя точка крыловидно-челюстной щели на 12 часов овального контура.",
	},
	Prn: {
		depends: "Эстетическая линия Риккетса E-line (Prn - Pog'), носогубный угол, профиль лица",
		clinicalTip: "Наиболее выступающая вперед точка мягких тканей кончика носа.",
	},
	Ls: {
		depends: "Эстетическая линия Риккетса E-line (Ls to E-line: -4 мм), профиль мягких тканей",
		clinicalTip: "Наиболее выступающая вперед точка красной каймы верхней губы.",
	},
	Li: {
		depends: "Эстетическая линия Риккетса E-line (Li to E-line: -2 мм), профиль мягких тканей",
		clinicalTip: "Наиболее выступающая вперед точка красной каймы нижней губы.",
	},
	Pog_prime: {
		depends: "Эстетическая линия Риккетса E-line (Prn - Pog'), анализ Holdaway, толщина мягких тканей",
		clinicalTip: "Наиболее выступающая вперед точка мягких тканей подбородочного возвышения.",
	},
	U1t: {
		depends: "Инклинация 1-NA (22°±2°), расстояние 1-NA (4±1 мм), U1-SN (104°±2°), межрезцовый угол U1-L1",
		clinicalTip: "Режущий край наиболее выступающего центрального резца верхней челюсти (1.1 или 2.1).",
	},
	U1a: {
		depends: "Продольная ось верхнего резца: угол 1-NA (22°±2°), угол U1-SN (104°±2°), межрезцовый U1-L1",
		clinicalTip: "Верхушка корня центрального резца верхней челюсти.",
	},
	L1t: {
		depends: "Инклинация 1-NB (25°±2°), расстояние 1-NB (4±1 мм), L1-MP / IMPA (90°±3°), межрезцовый U1-L1",
		clinicalTip: "Режущий край наиболее выступающего центрального резца нижней челюсти (4.1 или 3.1).",
	},
	L1a: {
		depends: "Продольная ось нижнего резца: угол 1-NB (25°±2°), угол L1-MP / IMPA (90°±3°), межрезцовый U1-L1",
		clinicalTip: "Верхушка корня центрального резца нижней челюсти.",
	},
	Mo: {
		depends: "Окклюзионная плоскость OP, Wits-число (Jacobson), наклон окклюзионной плоскости Cant of OP (Downs)",
		clinicalTip: "Точка фиссурно-бугоркового смыкания первых постоянных моляров (дистальный ориентир окклюзионной плоскости).",
	},
};

export function getRequiredLandmarksForMeasurement(id: string): LandmarkKey[] {
	switch (id) {
		case "SNA": return ["S", "N", "A"];
		case "SNB": return ["S", "N", "B"];
		case "ANB": return ["S", "N", "A", "B"];
		case "Wits": return ["A", "B", "U1t", "L1t"];
		case "Downs-FA": return ["N", "Pog", "Po", "Or"];
		case "Downs-Conv": return ["N", "A", "Pog"];
		case "Downs-AB": return ["N", "Pog", "A", "B"];
		case "SN-GoGn": return ["S", "N", "Go", "Gn"];
		case "FMA": return ["Po", "Or", "Go", "Me"];
		case "FMIA": return ["Po", "Or", "Go", "Me", "L1t", "L1a"];
		case "Downs-YAxis": return ["S", "Gn", "Po", "Or"];
		case "Downs-CantOP": return ["Po", "Or", "U1t", "L1t"];
		case "U1-SN": return ["S", "N", "U1t", "U1a"];
		case "1-NA-Angle": return ["N", "A", "U1t", "U1a"];
		case "1-NA-Dist": return ["N", "A", "U1t"];
		case "L1-MP": return ["Go", "Me", "L1t", "L1a"];
		case "1-NB-Angle": return ["N", "B", "L1t", "L1a"];
		case "1-NB-Dist": return ["N", "B", "L1t"];
		case "U1-L1": return ["U1t", "U1a", "L1t", "L1a"];
		case "NL-ML": return ["ANS", "PNS", "Go", "Me"];
		case "McNamara-A-Nperp": return ["N", "A", "Po", "Or"];
		case "McNamara-Pog-Nperp": return ["N", "Pog", "Po", "Or"];
		case "Ricketts-E-Ls": return ["Prn", "Pog_prime", "Ls"];
		case "Ricketts-E-Li": return ["Prn", "Pog_prime", "Li"];
		default: return [];
	}
}
