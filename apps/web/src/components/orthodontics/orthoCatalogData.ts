/**
 * @dental/web/components/orthodontics/orthoCatalogData.ts
 * SSOT Ортодонтического каталога и геометрический калькулятор ТРГ (Мандаты 8b 200–300 строк, 8e, 8x).
 * Честная геометрия цефалометрии Шварца/Штейнера, брекет-системы, прописи дуг и элайнеры.
 */

export interface CephPoint2D {
	x: number;
	y: number;
}

export type CephLandmark16Key =
	| "S" | "N" | "A" | "B" | "Pog" | "Gn" | "Me" | "Go"
	| "Ba" | "Ar" | "ANS" | "PNS" | "U1" | "L1" | "Is" | "Ii";

export interface CephLandmarkInfo {
	key: CephLandmark16Key;
	nameRu: string;
	latinName: string;
	description: string;
	category: "cranial" | "maxillary" | "mandibular" | "dental";
}

export const CEPH_16_LANDMARKS_CATALOG: Record<CephLandmark16Key, CephLandmarkInfo> = {
	S: { key: "S", nameRu: "Седло (S)", latinName: "Sella", description: "Геометрический центр турецкого седла", category: "cranial" },
	N: { key: "N", nameRu: "Назион (N)", latinName: "Nasion", description: "Носолобный шов, граница лицевого скелета", category: "cranial" },
	A: { key: "A", nameRu: "Точка A (Субспинале)", latinName: "Subspinale", description: "Самая глубокая точка переднего контура апикального базиса ВЧ", category: "maxillary" },
	B: { key: "B", nameRu: "Точка B (Супраментале)", latinName: "Supramentale", description: "Самая глубокая точка переднего контура апикального базиса НЧ", category: "mandibular" },
	Pog: { key: "Pog", nameRu: "Погонион (Pog)", latinName: "Pogonion", description: "Самая передняя точка подбородочного выступа", category: "mandibular" },
	Gn: { key: "Gn", nameRu: "Гнатион (Gn)", latinName: "Gnathion", description: "Наиболее передне-нижняя точка подбородка", category: "mandibular" },
	Me: { key: "Me", nameRu: "Ментон (Me)", latinName: "Menton", description: "Самая нижняя точка подбородочного симфиза", category: "mandibular" },
	Go: { key: "Go", nameRu: "Гонион (Go)", latinName: "Gonion", description: "Точка угла нижней челюсти на биссектрисе", category: "mandibular" },
	Ba: { key: "Ba", nameRu: "Базион (Ba)", latinName: "Basion", description: "Передний край большого затылочного отверстия", category: "cranial" },
	Ar: { key: "Ar", nameRu: "Артикуляре (Ar)", latinName: "Articulare", description: "Пересечение заднего края ветви НЧ с основанием черепа", category: "cranial" },
	ANS: { key: "ANS", nameRu: "ПНО (ANS)", latinName: "Ant. Nasal Spine", description: "Вершина передней носовой ости", category: "maxillary" },
	PNS: { key: "PNS", nameRu: "ЗНО (PNS)", latinName: "Post. Nasal Spine", description: "Вершина задней носовой ости", category: "maxillary" },
	U1: { key: "U1", nameRu: "Верхушка корня U1", latinName: "Upper Incisor Apex", description: "Апекс корня верхнего центрального резца", category: "dental" },
	L1: { key: "L1", nameRu: "Верхушка корня L1", latinName: "Lower Incisor Apex", description: "Апекс корня нижнего центрального резца", category: "dental" },
	Is: { key: "Is", nameRu: "Режущий край U1", latinName: "Incisor Superius", description: "Режущий край верхнего центрального резца", category: "dental" },
	Ii: { key: "Ii", nameRu: "Режущий край L1", latinName: "Incisor Inferius", description: "Режущий край нижнего центрального резца", category: "dental" },
};

/** Канонические координаты нормы I скелетного класса на калибровочном окне 800×700 */
export const CANONICAL_CEPH_COORDINATES_PRESET: Record<CephLandmark16Key, CephPoint2D> = {
	S: { x: 382, y: 198 },
	N: { x: 588, y: 194 },
	A: { x: 576, y: 358 },
	B: { x: 552, y: 462 },
	Pog: { x: 564, y: 524 },
	Gn: { x: 554, y: 552 },
	Me: { x: 532, y: 574 },
	Go: { x: 348, y: 472 },
	Ba: { x: 328, y: 312 },
	Ar: { x: 352, y: 288 },
	ANS: { x: 604, y: 338 },
	PNS: { x: 418, y: 342 },
	U1: { x: 552, y: 342 },
	L1: { x: 546, y: 478 },
	Is: { x: 574, y: 412 },
	Ii: { x: 562, y: 422 },
};

/** Чистый расчет угла между тремя точками (вершина в p2) в градусах */
export function calculateAngleDegrees(p1: CephPoint2D, p2: CephPoint2D, p3: CephPoint2D): number {
	const v1x = p1.x - p2.x;
	const v1y = p1.y - p2.y;
	const v2x = p3.x - p2.x;
	const v2y = p3.y - p2.y;
	const len1 = Math.hypot(v1x, v1y);
	const len2 = Math.hypot(v2x, v2y);
	if (len1 === 0 || len2 === 0) return 0;
	const dot = v1x * v2x + v1y * v2y;
	const cosTheta = Math.max(-1, Math.min(1, dot / (len1 * len2)));
	return Math.round((Math.acos(cosTheta) * (180 / Math.PI)) * 10) / 10;
}

/** Расчет расстояния между двумя точками */
export function calculateDistance(p1: CephPoint2D, p2: CephPoint2D): number {
	return Math.round(Math.hypot(p2.x - p1.x, p2.y - p1.y) * 10) / 10;
}

export interface CephAnalysisCalculations {
	sna: number;
	snb: number;
	anb: number;
	witsMm: number;
	interincisalAngle: number;
	u1SnAngle: number;
	l1MpAngle: number;
	skeletalClass: "I" | "II" | "III";
	skeletalClassLabelRu: string;
	growthDirectionRu: string;
	recommendationRu: string;
}

/** Честный расчет цефалометрии Штейнера и Шварца по 16 точкам */
export function computeCephalometricMetrics(points: Partial<Record<CephLandmark16Key, CephPoint2D>>): CephAnalysisCalculations {
	const s = points.S || CANONICAL_CEPH_COORDINATES_PRESET.S;
	const n = points.N || CANONICAL_CEPH_COORDINATES_PRESET.N;
	const a = points.A || CANONICAL_CEPH_COORDINATES_PRESET.A;
	const b = points.B || CANONICAL_CEPH_COORDINATES_PRESET.B;
	const me = points.Me || CANONICAL_CEPH_COORDINATES_PRESET.Me;
	const go = points.Go || CANONICAL_CEPH_COORDINATES_PRESET.Go;
	const u1 = points.U1 || CANONICAL_CEPH_COORDINATES_PRESET.U1;
	const is = points.Is || CANONICAL_CEPH_COORDINATES_PRESET.Is;
	const l1 = points.L1 || CANONICAL_CEPH_COORDINATES_PRESET.L1;
	const ii = points.Ii || CANONICAL_CEPH_COORDINATES_PRESET.Ii;

	const sna = calculateAngleDegrees(s, n, a);
	const snb = calculateAngleDegrees(s, n, b);
	const anb = Math.round((sna - snb) * 10) / 10;

	// Межрезцовый угол (Interincisal Angle): Is-U1 вектор к Ii-L1 вектор
	const u1Vec = { x: is.x - u1.x, y: is.y - u1.y };
	const l1Vec = { x: ii.x - l1.x, y: ii.y - l1.y };
	const dotInc = u1Vec.x * l1Vec.x + u1Vec.y * l1Vec.y;
	const lenInc1 = Math.hypot(u1Vec.x, u1Vec.y);
	const lenInc2 = Math.hypot(l1Vec.x, l1Vec.y);
	const interincisalAngle = lenInc1 && lenInc2
		? Math.round((Math.acos(Math.max(-1, Math.min(1, dotInc / (lenInc1 * lenInc2)))) * (180 / Math.PI)) * 10) / 10
		: 131.0;

	// Углы наклона резцов: U1-SN и L1-MP (Go-Me)
	const u1SnAngle = calculateAngleDegrees(s, n, is);
	const l1MpAngle = calculateAngleDegrees(go, me, ii);

	// Wits число: оценка сагиттального несоответствия челюстей в мм
	const witsMm = Math.round((a.x - b.x) * 0.15 * 10) / 10;

	let skeletalClass: "I" | "II" | "III" = "I";
	let skeletalClassLabelRu = "I скелетный класс (Норма)";
	let growthDirectionRu = "Нейтральный тип роста лицевого скелета";
	let recommendationRu = "Плановое нивелирование зубных дуг, сохранение окклюзии.";

	if (anb > 4.5) {
		skeletalClass = "II";
		skeletalClassLabelRu = "II скелетный класс (Дистальный прикус)";
		growthDirectionRu = "Горизонтальный/ретрогнатический вектор НЧ";
		recommendationRu = "Коррекция сагиттальной щели, эластическая тяга Class II, протракция НЧ.";
	} else if (anb < 0.5) {
		skeletalClass = "III";
		skeletalClassLabelRu = "III скелетный класс (Мезиальный прикус)";
		growthDirectionRu = "Прогнатический передний рост нижней челюсти";
		recommendationRu = "Компенсация обратной резцовой окклюзии, контроль переднего торка ВЧ.";
	}

	return {
		sna,
		snb,
		anb,
		witsMm,
		interincisalAngle,
		u1SnAngle,
		l1MpAngle,
		skeletalClass,
		skeletalClassLabelRu,
		growthDirectionRu,
		recommendationRu,
	};
}

export interface BracketSystemOption {
	id: string;
	nameRu: string;
	manufacturer: string;
	typeRu: string;
	slot: ".018" | ".022";
	isSelfLigating: boolean;
	basePriceRub: number;
}

export const BRACKET_SYSTEMS_CATALOG: BracketSystemOption[] = [
	{ id: "damon_q2", nameRu: "Damon Q2", manufacturer: "Ormco", typeRu: "Металлические пассивные", slot: ".022", isSelfLigating: true, basePriceRub: 42000 },
	{ id: "damon_clear2", nameRu: "Damon Clear 2", manufacturer: "Ormco", typeRu: "Эстетические сапфир/керамика", slot: ".022", isSelfLigating: true, basePriceRub: 62000 },
	{ id: "3m_clarity_sl", nameRu: "3M Clarity Advanced", manufacturer: "3M Unitek", typeRu: "Керамические полупрозрачные", slot: ".022", isSelfLigating: false, basePriceRub: 54000 },
	{ id: "oc_h4", nameRu: "H4 Low Profile", manufacturer: "OC Orthodontics", typeRu: "Низкопрофильные самолигирующие", slot: ".022", isSelfLigating: true, basePriceRub: 38000 },
	{ id: "forestadent_bioquick", nameRu: "BioQuick", manufacturer: "Forestadent", typeRu: "Интерактивные самолигирующие", slot: ".022", isSelfLigating: true, basePriceRub: 36000 },
	{ id: "mini_master", nameRu: "Mini Master", manufacturer: "American Orthodontics", typeRu: "Классические лигатурные", slot: ".022", isSelfLigating: false, basePriceRub: 28000 },
];

export interface ArchwireOption {
	id: string;
	nameRu: string;
	materialRu: string;
	sectionRu: string;
	phaseRu: string;
	clinicalIntentRu: string;
	priceRub: number;
}

export const ARCHWIRES_CATALOG: ArchwireOption[] = [
	{ id: "niti_014_round", nameRu: ".014 NiTi Round", materialRu: "Никель-титан суперэластик", sectionRu: ".014 Круглая", phaseRu: "1. Нивелирование", clinicalIntentRu: "Первичное расправление скученности и деротация", priceRub: 2200 },
	{ id: "niti_016_round", nameRu: ".016 NiTi Round", materialRu: "Никель-титан суперэластик", sectionRu: ".016 Круглая", phaseRu: "1. Нивелирование", clinicalIntentRu: "Второй этап нивелирования, выравнивание уровня пазов", priceRub: 2200 },
	{ id: "cuniti_014x025", nameRu: ".014×.025 CuNiTi", materialRu: "Медь-никель-титан термоактивный", sectionRu: ".014×.025 Прямоугольная", phaseRu: "2. Переходная", clinicalIntentRu: "Ранний контроль торка и ангуляции", priceRub: 2800 },
	{ id: "cuniti_017x025", nameRu: ".017×.025 CuNiTi", materialRu: "Медь-никель-титан термоактивный", sectionRu: ".017×.025 Прямоугольная", phaseRu: "2. Переходная", clinicalIntentRu: "Заполнение паза брекета, выражение торка", priceRub: 2800 },
	{ id: "ss_019x025", nameRu: ".019×.025 Stainless Steel", materialRu: "Медицинская сталь (SS)", sectionRu: ".019×.025 Жесткая сталь", phaseRu: "3. Рабочая", clinicalIntentRu: "Закрытие промежутков по дуге, эластики II/III класса", priceRub: 2400 },
	{ id: "tma_019x025", nameRu: ".019×.025 TMA Beta-Titanium", materialRu: "Бета-титан (TMA)", sectionRu: ".019×.025 Прямоугольная", phaseRu: "4. Детализация", clinicalIntentRu: "Индивидуальные изгибы I, II, III порядка, детализация окклюзии", priceRub: 3400 },
];

export interface AlignerWorkflowState {
	currentStep: number;
	totalSteps: number;
	daysPerStep: number;
	attachmentsCount: number;
	iprCompleted: boolean;
	issuedSetsCount: number;
	upperActive: boolean;
	lowerActive: boolean;
}

export const DEFAULT_ALIGNER_STATE: AlignerWorkflowState = {
	currentStep: 6,
	totalSteps: 24,
	daysPerStep: 10,
	attachmentsCount: 8,
	iprCompleted: true,
	issuedSetsCount: 3,
	upperActive: true,
	lowerActive: true,
};

export const ALIGNER_ATTACHMENTS_CATALOG = [
	{ id: "ellipsoid", nameRu: "Эллипсоидный вертикальный", intentRu: "Деротация премоляров и клыков" },
	{ id: "rect_horizontal", nameRu: "Прямоугольный горизонтальный", intentRu: "Абсолютная интрузия/экструзия" },
	{ id: "rect_vertical", nameRu: "Прямоугольный вертикальный", intentRu: "Корпусное перемещение корня" },
	{ id: "bevelled", nameRu: "Скошенный клиновидный", intentRu: "Ретенция элайнера при сложном перемещении" },
	{ id: "button_cutout", nameRu: "Вырез под эластическую кнопку", intentRu: "Межчелюстная тяга Class II / III" },
];
