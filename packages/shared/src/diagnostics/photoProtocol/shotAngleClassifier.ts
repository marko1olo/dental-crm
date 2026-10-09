/**
 * shotAngleClassifier.ts — Layer 1: Canonical 8-Angle Registry, Stage Metadata & Angle Classification (@dental/shared)
 *
 * Compliant with:
 * - ABO (American Board of Orthodontics) photographic standards
 * - СтАР клинические рекомендации по ортодонтической диагностике
 */

import type {
	OrthodonticAngleId,
	OrthodonticAngleDefinition,
	OrthodonticStageMetadata,
	OrthodonticSessionStage,
	AngleClass,
	SmileArcType,
	MidlineShiftDirection,
	OrthodonticPhotoSession,
	OrthodonticPhotoSlotRecord,
	OrthodonticProtocolCompleteness,
} from "./types.js";

// ─────────────────────────────────────────────────────────────────────────────
// 1. CANONICAL REGISTRY: 8 ORTHODONTIC ANGLES
// ─────────────────────────────────────────────────────────────────────────────

export const ORTHODONTIC_8_ANGLES: readonly OrthodonticAngleDefinition[] = [
	// ─── Extraoral ───
	{
		id: "extraoral_face_rest",
		category: "extraoral",
		sequenceNumber: 1,
		titleRu: "Анфас в покое",
		shortLabelRu: "Анфас (покой)",
		descriptionRu: "Фронтальный портрет лица с расслабленной мускулатурой губ",
		clinicalInstructionsRu: "Голова в естественном положении (NHP), взгляд строго вперед, губы сомкнуты без напряжения. Оценка симметрии, пропорций третей лица и контура губ.",
		requiredEquipmentRu: "Нейтральный фон (белый/серый), биполярная или портретная вспышка",
		recommendedAspectRatio: "3:2",
		framingLandmarks: ["Зрачковая линия", "Срединно-лицевая линия", "Крылья носа", "Подбородок"],
		svgPath: "M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-3.5-9c.83 0 1.5-.67 1.5-1.5S9.33 8 8.5 8 7 8.67 7 9.5 7.67 11 8.5 11zm7 0c.83 0 1.5-.67 1.5-1.5S16.33 8 15.5 8 14 8.67 14 9.5s.67 1.5 1.5 1.5zm-3.5 4c-1.66 0-3 1.34-3 3h6c0-1.66-1.34-3-3-3z",
	},
	{
		id: "extraoral_face_smile",
		category: "extraoral",
		sequenceNumber: 2,
		titleRu: "Анфас с улыбкой",
		shortLabelRu: "Анфас (улыбка)",
		descriptionRu: "Фронтальный портрет с максимальной естественной улыбкой (Social / Duchenne smile)",
		clinicalInstructionsRu: "Пациент естественно улыбается. Оценка дуги улыбки, экспозиции резцов и десневого края, щечных коридоров (buccal corridors).",
		requiredEquipmentRu: "Нейтральный фон, фронтальный свет, объектив 85-105 мм",
		recommendedAspectRatio: "3:2",
		framingLandmarks: ["Край верхней губы", "Режущие края резцов", "Кривизна нижней губы", "Щечные коридоры"],
		svgPath: "M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-3.5-9c.83 0 1.5-.67 1.5-1.5S9.33 8 8.5 8 7 8.67 7 9.5 7.67 11 8.5 11zm7 0c.83 0 1.5-.67 1.5-1.5S16.33 8 15.5 8 14 8.67 14 9.5s.67 1.5 1.5 1.5zm-7 3.5c1.1 1.5 3 2.5 5 2.5s3.9-1 5-2.5h-10z",
	},
	{
		id: "extraoral_profile",
		category: "extraoral",
		sequenceNumber: 3,
		titleRu: "Профиль лица",
		shortLabelRu: "Профиль (покой)",
		descriptionRu: "Латеральный портрет лица строго под 90° в естественном положении",
		clinicalInstructionsRu: "Правый профиль, ухо открыто, естественная посадка головы (Франкфуртская горизонталь параллельна полу). Оценка носогубного угла, профиля Риккетса и подбородочной складки.",
		requiredEquipmentRu: "Однородный фон, боковое позиционирование, убранные назад волосы",
		recommendedAspectRatio: "3:2",
		framingLandmarks: ["Франкфуртская горизонталь", "Глабелла", "Субназале", "Погонион", "Линия Риккетса"],
		svgPath: "M9 2C5.13 2 2 5.13 2 9c0 2.38 1.19 4.47 3 5.74V22h14v-6.5c1.86-1.39 3-3.6 3-6.5 0-3.87-3.13-7-7-7H9zm5 10.5V14h-4v-1.5c-1.5-.5-2.5-1.9-2.5-3.5 0-2.21 1.79-4 4-4s4 1.79 4 4c0 1.6-1 3-2.5 3.5z",
	},
	// ─── Intraoral ───
	{
		id: "intraoral_frontal_occlusion",
		category: "intraoral",
		sequenceNumber: 4,
		titleRu: "Фронт в окклюзии",
		shortLabelRu: "Фронт в окклюзии",
		descriptionRu: "Внутриротовой снимок переднего сегмента в положении привычной максимальной окклюзии",
		clinicalInstructionsRu: "Двусторонние ретракторы губ и щек. Окклюзионная плоскость строго по центру кадра. Совпадение верхне- и нижнечелюстной средних линий, оценка перекрытия (overbite).",
		requiredEquipmentRu: "Двусторонние ретракторы, макрообъектив 1:1, кольцевая/секционная вспышка",
		recommendedAspectRatio: "4:3",
		framingLandmarks: ["Срединная линия резцов", "Окклюзионная плоскость", "Десневой зенит 11, 21", "Клыковые контакты"],
		svgPath: "M3 5v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2zm16 14H5V5h14v14zM8 7h8v2H8zm0 4h8v2H8zm0 4h8v2H8z",
	},
	{
		id: "intraoral_right_lateral",
		category: "intraoral",
		sequenceNumber: 5,
		titleRu: "Правый боковой сегмент",
		shortLabelRu: "Правый боковой",
		descriptionRu: "Смыкание клыков и моляров справа в привычной окклюзии",
		clinicalInstructionsRu: "Широкий ретрактор справа, ослабление слева. Съемка перпендикулярно вестибулярной поверхности первого моляра. Оценка классов по Энглю (моляры и клыки).",
		requiredEquipmentRu: "Ретракторы щечные, боковое зеркало при необходимости, макросвет",
		recommendedAspectRatio: "4:3",
		framingLandmarks: ["Бугры 16 и 46", "Смыкание 13 и 43", "Кривая Шпее", "Десневые сосочки"],
		svgPath: "M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 14H4V6h16v12zM6 10h4v4H6zm6 0h6v4h-6z",
	},
	{
		id: "intraoral_left_lateral",
		category: "intraoral",
		sequenceNumber: 6,
		titleRu: "Левый боковой сегмент",
		shortLabelRu: "Левый боковой",
		descriptionRu: "Смыкание клыков и моляров слева в привычной окклюзии",
		clinicalInstructionsRu: "Широкий ретрактор слева, ослабление справа. Съемка перпендикулярно щечной поверхности первого моляра слева (26 и 36). Оценка класса по Энглю.",
		requiredEquipmentRu: "Ретракторы щечные, боковое зеркало, антифог-спрей / обдув зеркала",
		recommendedAspectRatio: "4:3",
		framingLandmarks: ["Бугры 26 и 36", "Смыкание 23 и 33", "Кривая Шпее", "Вестибулярный контакт"],
		svgPath: "M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 14H4V6h16v12zM6 10h6v4H6zm8 0h4v4h-4z",
	},
	{
		id: "intraoral_upper_arch",
		category: "intraoral",
		sequenceNumber: 7,
		titleRu: "Верхний зубной ряд",
		shortLabelRu: "Верхний ряд",
		descriptionRu: "Окклюзионная поверхность всех верхних зубов от резцов до вторых моляров",
		clinicalInstructionsRu: "Большое окклюзионное зеркало с подогревом / обдувом. В кадре виден весь зубной ряд (17–27) и небный шов по центральной оси кадра.",
		requiredEquipmentRu: "Окклюзионное зеркало верхнее, ретракторы 'V', теплый обдув зеркала",
		recommendedAspectRatio: "4:3",
		framingLandmarks: ["Срединный небный шов", "Форма дуги (эллипс/трапеция/V-образная)", "Торк резцов", "Вторые моляры 17, 27"],
		svgPath: "M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z",
	},
	{
		id: "intraoral_lower_arch",
		category: "intraoral",
		sequenceNumber: 8,
		titleRu: "Нижний зубной ряд",
		shortLabelRu: "Нижний ряд",
		descriptionRu: "Окклюзионная поверхность всех нижних зубов (37–47) с отведением языка",
		clinicalInstructionsRu: "Окклюзионное зеркало нижнее, пациент поднимает подбородок, язык отведен назад за зеркало. В кадре видны все зубы от 47 до 37 без наложения мягких тканей.",
		requiredEquipmentRu: "Окклюзионное зеркало нижнее, ретракторы щечные, обдув воздухом",
		recommendedAspectRatio: "4:3",
		framingLandmarks: ["Форма нижней дуги (парабола)", "Скученность резцов 31-42", "Моляры 37, 47", "Кривая Вильсона"],
		svgPath: "M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8 0-.55.45-1 1-1h14c.55 0 1 .45 1 1 0 4.41-3.59 8-8 8z",
	},
];

export const ORTHODONTIC_ANGLES_MAP: Record<OrthodonticAngleId, OrthodonticAngleDefinition> =
	Object.fromEntries(ORTHODONTIC_8_ANGLES.map((a) => [a.id, a])) as Record<
		OrthodonticAngleId,
		OrthodonticAngleDefinition
	>;

// ─────────────────────────────────────────────────────────────────────────────
// 2. STAGE METADATA & CLINICAL LABELS
// ─────────────────────────────────────────────────────────────────────────────

export const ORTHODONTIC_STAGE_METADATA: Record<OrthodonticSessionStage, OrthodonticStageMetadata> = {
	pre_treatment: {
		stage: "pre_treatment",
		code: "STAGE_PRE",
		labelRu: "До лечения (Исходный статус)",
		shortLabelRu: "До лечения",
		color: "#2563EB", // Blue
		descriptionRu: "Первичная ортодонтическая фиксация исходной окклюзии, пропорций лица и зубных рядов до установки аппаратуры.",
	},
	active_monitoring: {
		stage: "active_monitoring",
		code: "STAGE_ACTIVE",
		labelRu: "Контроль динамики (В процессе)",
		shortLabelRu: "Контроль",
		color: "#D97706", // Amber
		descriptionRu: "Промежуточный контроль перемещения зубов, юстировки брекет-системы, смены элайнеров или аппаратов.",
	},
	post_treatment: {
		stage: "post_treatment",
		code: "STAGE_POST",
		labelRu: "После лечения (Ретенция и финал)",
		shortLabelRu: "После лечения",
		color: "#059669", // Emerald
		descriptionRu: "Финальный клинический результат, оценка эстетики улыбки, стабильности окклюзии и фиксации ретейнеров.",
	},
};

export const ANGLE_CLASS_LABELS_RU: Record<AngleClass, string> = {
	class_1: "I класс по Энглю (Нейтроокклюзия)",
	class_2_div_1: "II класс, 1 подкласс (Дистоокклюзия с протрузией резцов)",
	class_2_div_2: "II класс, 2 подкласс (Дистоокклюзия с ретрузией резцов)",
	class_3: "III класс по Энглю (Мезиоокклюзия)",
};

export const SMILE_ARC_LABELS_RU: Record<SmileArcType, string> = {
	consonant: "Консонантная (Параллельна кривизне нижней губы — эстетический идеал)",
	flat: "Уплощенная (Прямая линия режущих краев)",
	reverse: "Реверсивная (Инвертированная кривизна — эстетический дефект)",
};

export const MIDLINE_SHIFT_LABELS_RU: Record<MidlineShiftDirection, string> = {
	none: "В норме (Совпадает со срединно-лицевой линией)",
	left: "Смещение влево",
	right: "Смещение вправо",
};

// ─────────────────────────────────────────────────────────────────────────────
// 3. COMPLETENESS METRICS & CLASSIFICATION HELPERS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Calculates completeness metrics for an orthodontic photo protocol (8 slots total).
 */
export function calculateOrthodonticProtocolCompleteness(
	sessionOrSlots: OrthodonticPhotoSession | Record<string, Partial<OrthodonticPhotoSlotRecord> | undefined>,
): OrthodonticProtocolCompleteness {
	const rawSlots = "slots" in sessionOrSlots ? sessionOrSlots.slots : sessionOrSlots;
	const slots = (rawSlots || {}) as Partial<Record<OrthodonticAngleId, OrthodonticPhotoSlotRecord>>;

	const missingAngles: OrthodonticAngleId[] = [];
	const missingAngleNamesRu: string[] = [];
	let uploadedCount = 0;
	let intraoralCompleted = 0;
	let extraoralCompleted = 0;

	for (const angle of ORTHODONTIC_8_ANGLES) {
		const slot = slots[angle.id];
		const hasImage = Boolean(slot && slot.imageUrl && slot.imageUrl.trim().length > 0);
		if (hasImage) {
			uploadedCount += 1;
			if (angle.category === "intraoral") intraoralCompleted += 1;
			if (angle.category === "extraoral") extraoralCompleted += 1;
		} else {
			missingAngles.push(angle.id);
			missingAngleNamesRu.push(angle.titleRu);
		}
	}

	const totalRequired = 8;
	const completionPercentage = Math.round((uploadedCount / totalRequired) * 100);
	const isComplete = uploadedCount === totalRequired;
	// Ready for consultation if at least 6 core shots are present (e.g. 4 intraoral + 2 extraoral)
	const isReadyForConsultation = uploadedCount >= 6 && intraoralCompleted >= 3 && extraoralCompleted >= 2;

	return {
		totalRequired,
		uploadedCount,
		completionPercentage,
		isComplete,
		isReadyForConsultation,
		missingAngles,
		missingAngleNamesRu,
		intraoralCompleted,
		extraoralCompleted,
	};
}

/**
 * Checks whether an angle is an extraoral portrait projection.
 */
export function isAngleExtraoral(angleId: OrthodonticAngleId): boolean {
	const def = ORTHODONTIC_ANGLES_MAP[angleId];
	return def ? def.category === "extraoral" : false;
}

/**
 * Checks whether an angle is an intraoral projection.
 */
export function isAngleIntraoral(angleId: OrthodonticAngleId): boolean {
	const def = ORTHODONTIC_ANGLES_MAP[angleId];
	return def ? def.category === "intraoral" : false;
}

/**
 * Retrieves the angle definition by ID.
 */
export function getAngleDefinition(angleId: OrthodonticAngleId): OrthodonticAngleDefinition | undefined {
	return ORTHODONTIC_ANGLES_MAP[angleId];
}
