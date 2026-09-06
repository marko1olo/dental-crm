import type { DentalRadiologyStudyType, RadiologyReferralGoal } from "@dental/shared";

export interface ReferralPreset {
	readonly id: string;
	readonly title: string;
	readonly shortLabel: string;
	readonly badge: string;
	readonly studyType: DentalRadiologyStudyType;
	readonly studyGoal: RadiologyReferralGoal;
	readonly targetTeeth?: string;
	readonly diagnosisIcd10: string;
	readonly diagnosisTitle: string;
	readonly clinicalJustification: string;
	readonly areaDescription: string;
}

/**
 * Канонические 1-клик пресеты рентгенологических направлений в стоматологии (Mandate 8e — без задержек и бюрократии)
 */
export const CLINICAL_REFERRAL_PRESETS: readonly ReferralPreset[] = [
	{
		id: "cbct_both_jaws_preset",
		title: "КЛКТ двух челюстей 3D (фокус 8х8 / 10х10 см) для имплантации и ортодонтии",
		shortLabel: "КЛКТ 3D двух челюстей",
		badge: "3D КЛКТ",
		studyType: "cbct_jaw_8x8",
		studyGoal: "implantology",
		targetTeeth: "18–48 (Обе челюсти)",
		diagnosisIcd10: "K08.1",
		diagnosisTitle: "K08.1 Потеря зубов вследствие несчастного случая, удаления или локализованного пародонтита",
		clinicalJustification:
			"3D компьютерная томография обеих челюстей для планирования дентальной имплантации, синус-лифтинга и ортодонтии. Оценка объема и плотности альвеолярного гребня, толщины кортикальных пластинок, топографии нижнечелюстного канала и верхнечелюстных синусов.",
		areaDescription: "Зубные ряды верхней и нижней челюстей (FOV 8х8 / 10х10 см)",
	},
	{
		id: "cbct_segment_endo_preset",
		title: "КЛКТ сегмента 5х5 см (эндодонтия, скрытые каналы, периодонтит, кисты)",
		shortLabel: "КЛКТ сегмента 5х5 см",
		badge: "КЛКТ 5х5",
		studyType: "cbct_segment_5x5",
		studyGoal: "periapical_cyst",
		targetTeeth: "Сегмент 2-3 зубов",
		diagnosisIcd10: "K04.5",
		diagnosisTitle: "K04.5 Хронический апикальный периодонтит",
		clinicalJustification:
			"Прицельная компьютерная томография сегмента 5х5 см высокого разрешения для детальной визуализации анатомии корневых каналов (MB2, перешейки, дельты), оценки периапикальной деструкции, качества ранее проведенной обтурации и исключения трещин корня.",
		areaDescription: "Сегмент зубного ряда высокого разрешения (FOV 5х5 см)",
	},
	{
		id: "optg_panoramic_preset",
		title: "ОПТГ (ортопантомограмма) цифровая обзорная",
		shortLabel: "ОПТГ цифровая обзорная",
		badge: "ОПТГ 2D",
		studyType: "optg_digital_panoramic",
		studyGoal: "general_screening",
		targetTeeth: "18–48 (Зубные ряды)",
		diagnosisIcd10: "Z01.2",
		diagnosisTitle: "Z01.2 Стоматологическое обследование",
		clinicalJustification:
			"Цифровая обзорная ортопантомограмма для первичного скрининга зубочелюстной системы, выявления скрытых апроксимальных кариозных полостей, оценки состояния периодонта, краевой резорбции кости и положения зубов мудрости.",
		areaDescription: "Зубочелюстная система в панорамной проекции",
	},
	{
		id: "trg_lateral_preset",
		title: "ТРГ черепа в боковой проекции для ортодонтического расчета",
		shortLabel: "ТРГ боковая проекция",
		badge: "ТРГ черепа",
		studyType: "trg_cephalometric_lateral",
		studyGoal: "orthodontics",
		targetTeeth: "Череп (боковая проекция)",
		diagnosisIcd10: "K07.2",
		diagnosisTitle: "K07.2 Аномалии соотношений зубных дуг",
		clinicalJustification:
			"Телерентгенография черепа в боковой проекции для цефалометрического анализа сагиттальных и вертикальных аномалий прикуса, расчета углов лицевого скелета (SNA, SNB, ANB) и наклона резцов для ортодонтического перемещения зубов.",
		areaDescription: "Череп в боковой проекции (ТРГ)",
	},
	{
		id: "rvg_periapical_preset",
		title: "Прицельная радиовизиография (RVG) зуба",
		shortLabel: "Прицельный снимок (RVG)",
		badge: "RVG 1 зуб",
		studyType: "intraoral_radiovisiography",
		studyGoal: "endodontics",
		targetTeeth: "Прицельный зуб",
		diagnosisIcd10: "K04.0",
		diagnosisTitle: "K04.0 Пульпит",
		clinicalJustification:
			"Интраоральная прицельная радиовизиография для контроля длины эндодонтического инструмента, плотности и гомогенности обтурации корневого канала силером и гуттаперчей до физиологического апекса.",
		areaDescription: "Прицельная область альвеолярного отростка (1–2 зуба)",
	},
];
