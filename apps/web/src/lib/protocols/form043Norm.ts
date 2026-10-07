import type {
	FdiToothRecord,
	OralMucosaStatus,
	DentalBiteType,
} from "@dental/shared";

/**
 * Каноническая физиологическая норма осмотра и анамнеза Формы 043/у.
 * Мандат 8e: Все осмотры и анамнез заполняются физиологической нормой в 1 клик
 * (Соматически здоров / норма). Врач правит только патологию!
 */
export interface Form043PhysiologicalNormData {
	readonly chiefComplaint: string;
	readonly historyOfPresentIllness: string;
	readonly allergologicalHistory: string;
	readonly concomitantDiseases: string;
	readonly currentMedications: string;
	readonly pregnancyLactationStatus: string;
	readonly pastDentalInterventions: string;
	readonly biteType: DentalBiteType;
	readonly biteDescription: string;
	readonly oralMucosaStatus: OralMucosaStatus;
	readonly hygieneIndexOhiS: string;
	readonly cpitnSummary: string;
	readonly xrayFindingsDescription: string;
	readonly generalTreatmentPlan: string;
}

export const FORM_043_PHYSIOLOGICAL_NORM: Form043PhysiologicalNormData = {
	chiefComplaint: "Жалоб на момент осмотра не предъявляет (профилактический осмотр и гигиена).",
	historyOfPresentIllness: "Ранее санирован, последнее посещение стоматолога более 6 месяцев назад. Острых болей и температурных реакций не отмечает.",
	allergologicalHistory: "Аллергологический анамнез не отягощен. Аллергии на местные анестетики (артикаин, мепивакаин), антибиотики и латекс отрицает.",
	concomitantDiseases: "Сопутствующие соматические заболевания отрицает. ВИЧ, вирусные гепатиты B и C, туберкулез отрицает. Сердечно-сосудистая система компенсирована.",
	currentMedications: "Постоянный прием лекарственных препаратов (антикоагулянтов, дезагрегантов, бисфосфонатов) отрицает.",
	pregnancyLactationStatus: "Нет",
	pastDentalInterventions: "Ранее проводилось плановое терапевтическое лечение кариеса и профессиональная гигиена полости рта без осложнений.",
	biteType: "orthognathic",
	biteDescription: "Прикус ортогнатический, смыкание зубных рядов по I классу Энгля, межрезцовое перекрытие на 1/3 высоты коронки.",
	oralMucosaStatus: {
		color: "pale_pink_normal",
		moisture: "normal",
		pathologicalElements: null,
		gingivalPapillae: "normal_pointed",
		bleedingPBI: "grade_0",
		tongueStatus: "Язык чистый, влажный, розовый, сосочки выражены умеренно, патологического налета и десквамаций нет.",
		regionalLymphNodes: "Подчелюстные, шейные и затылочные лимфатические узлы не увеличены, мягкоэластичные, безболезненные при пальпации, подвижные.",
		tmjFunction: "Открывание рта в полном объеме (>40 мм), свободное, безболезненное, девиации и суставных шумов (щелчков/хруста) в ВНЧС нет.",
	},
	hygieneIndexOhiS: "OHI-S = 0.0 (Отличная гигиена полости рта)",
	cpitnSummary: "CPITN = Код 0 по всем 6 секстантам (здоровый пародонт, глубина зондирования <3 мм, кровоточивость и зубной камень отсутствуют, TN 0).",
	xrayFindingsDescription: "На прицельных радиовизиограммах/ОПТГ костная ткань межзубных перегородок сохранена на уровне эмалево-цементной границы, периодонтальная щель равномерная, периапикальных деструктивных изменений не выявлено.",
	generalTreatmentPlan: "1. Индивидуальные рекомендации по гигиене полости рта;\n2. Профилактический контрольный осмотр через 6 месяцев.",
};

/** Создает чистую копию канонической нормы 043/у */
export function createForm043PhysiologicalNorm(): Form043PhysiologicalNormData {
	return {
		...FORM_043_PHYSIOLOGICAL_NORM,
		oralMucosaStatus: {
			...FORM_043_PHYSIOLOGICAL_NORM.oralMucosaStatus,
		},
	};
}

const ALL_32_FDI_TEETH = [
	18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28,
	48, 47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37, 38,
];

/** Создает зубную формулу нормы: все 32 зуба интактны (healthy) */
export function createIntactOdontogramRecords(): Record<number, FdiToothRecord> {
	const map: Record<number, FdiToothRecord> = {};
	for (const toothNumber of ALL_32_FDI_TEETH) {
		map[toothNumber] = {
			toothNumber,
			statusCode: "healthy",
			surfaces: [],
			mobility: "none",
			furcationInvolvement: "none",
		};
	}
	return map;
}

/** Создает зубную формулу санированного пациента: моляры 16, 26, 36, 46 запломбированы, остальные здоровы */
export function createSanitizedOdontogramRecords(): Record<number, FdiToothRecord> {
	const map = createIntactOdontogramRecords();
	const filledTeeth = [16, 26, 36, 46];
	for (const t of filledTeeth) {
		map[t] = {
			toothNumber: t,
			statusCode: "filled_satisfactory",
			surfaces: ["occlusal"],
			mobility: "none",
			furcationInvolvement: "none",
		};
	}
	return map;
}

/** Создает зубную формулу без зубов мудрости: 18, 28, 38, 48 удалены/отсутствуют, остальные здоровы */
export function createWisdomExtractedOdontogramRecords(): Record<number, FdiToothRecord> {
	const map = createIntactOdontogramRecords();
	const wisdomTeeth = [18, 28, 38, 48];
	for (const t of wisdomTeeth) {
		map[t] = {
			toothNumber: t,
			statusCode: "extracted_absent",
			surfaces: [],
			mobility: "none",
			furcationInvolvement: "none",
		};
	}
	return map;
}
