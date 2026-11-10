/**
 * @dental/shared/hardware - Layer 1: Standard 12-shot Dental Clinical Photo Protocol.
 *
 * Compliance: THE HAMMER, Mandates 2 (Zero Mocks), 8e (Doctor Autonomy), 8s (Anti-bloat), 8n (Solo Doctor Sovereignty).
 */

import type { PhotoProtocolSlot } from "./types.js";

export const DENTAL_PHOTO_PROTOCOL_12: readonly PhotoProtocolSlot[] = [
	{
		index: 1,
		id: "extraoral_portrait_rest",
		titleRu: "Портрет в покое (анфас)",
		descriptionRu: "Лицо пациента в покое, губы сомкнуты, взгляд прямо перед собой",
		category: "extraoral",
		matchPatterns: ["portrait_rest", "face_rest", "анфас_покой", "портрет_покой", "slot1", "slot_1", "01_"],
	},
	{
		index: 2,
		id: "extraoral_portrait_smile",
		titleRu: "Портрет с улыбкой (анфас)",
		descriptionRu: "Естественная широкая улыбка, обнажение резцов и десневого края",
		category: "extraoral",
		matchPatterns: ["portrait_smile", "face_smile", "smile", "анфас_улыбка", "портрет_улыбка", "slot2", "slot_2", "02_"],
	},
	{
		index: 3,
		id: "extraoral_profile_right",
		titleRu: "Профиль справа (90°)",
		descriptionRu: "Боковой профиль под прямым углом, франкфуртская горизонталь",
		category: "extraoral",
		matchPatterns: ["profile_right", "profile_90", "profile", "профиль_справа", "профиль", "slot3", "slot_3", "03_"],
	},
	{
		index: 4,
		id: "extraoral_profile_45",
		titleRu: "Полупрофиль 45°",
		descriptionRu: "Ракурс три четверти с естественной улыбкой",
		category: "extraoral",
		matchPatterns: ["profile_45", "semi_profile", "three_quarter", "полупрофиль", "45deg", "slot4", "slot_4", "04_"],
	},
	{
		index: 5,
		id: "intraoral_anterior_occlusion",
		titleRu: "Фронт в окклюзии",
		descriptionRu: "Внутриротовой снимок передних зубов в привычном прикусе с ретракторами",
		category: "intraoral",
		matchPatterns: [
			"anterior_occlusion",
			"front_occlusion",
			"front_bite",
			"frontal_occlusion",
			"intraoral_frontal_occlusion",
			"фронтальная_окклюзия",
			"фронт_окклюзия",
			"фронт_прикус",
			"slot5",
			"slot_5",
			"05_",
		],
	},
	{
		index: 6,
		id: "intraoral_anterior_open",
		titleRu: "Фронт с разомкнутыми зубами",
		descriptionRu: "Разомкнутые резцовые края для оценки истираемости и анатомии",
		category: "intraoral",
		matchPatterns: [
			"anterior_open",
			"front_open",
			"open_bite",
			"frontal_disclusion",
			"intraoral_frontal_disclusion",
			"дизокклюзия",
			"разобщение",
			"фронт_разомкнут",
			"разомкнутый_фронт",
			"slot6",
			"slot_6",
			"06_",
		],
	},
	{
		index: 7,
		id: "intraoral_buccal_right",
		titleRu: "Боковой вид справа (окклюзия)",
		descriptionRu: "Смыкание клыков и моляров справа по I/II/III классу Энгля",
		category: "intraoral",
		matchPatterns: [
			"buccal_right",
			"lateral_right",
			"right_bite",
			"right_buccal",
			"intraoral_right_buccal",
			"боковой_справа",
			"бок_справа",
			"правый_бок",
			"slot7",
			"slot_7",
			"07_",
		],
	},
	{
		index: 8,
		id: "intraoral_buccal_left",
		titleRu: "Боковой вид слева (окклюзия)",
		descriptionRu: "Смыкание клыков и моляров слева по I/II/III классу Энгля",
		category: "intraoral",
		matchPatterns: [
			"buccal_left",
			"lateral_left",
			"left_bite",
			"left_buccal",
			"intraoral_left_buccal",
			"боковой_слева",
			"бок_слева",
			"левый_бок",
			"slot8",
			"slot_8",
			"08_",
		],
	},
	{
		index: 9,
		id: "intraoral_occlusal_maxillary",
		titleRu: "Окклюзия верхней челюсти",
		descriptionRu: "Зеркальный снимок зубного ряда верхней челюсти от 17 до 27",
		category: "intraoral",
		matchPatterns: [
			"occlusal_maxillary",
			"occlusal_upper",
			"upper_arch",
			"maxillary_occlusal",
			"intraoral_maxillary_occlusal",
			"окклюзия_верх",
			"верхняя_челюсть",
			"вч_зеркало",
			"slot9",
			"slot_9",
			"09_",
		],
	},
	{
		index: 10,
		id: "intraoral_occlusal_mandibular",
		titleRu: "Окклюзия нижней челюсти",
		descriptionRu: "Зеркальный снимок зубного ряда нижней челюсти от 37 до 47",
		category: "intraoral",
		matchPatterns: [
			"occlusal_mandibular",
			"occlusal_lower",
			"lower_arch",
			"mandibular_occlusal",
			"intraoral_mandibular_occlusal",
			"окклюзия_низ",
			"нижняя_челюсть",
			"нч_зеркало",
			"slot10",
			"slot_10",
			"10_",
		],
	},
	{
		index: 11,
		id: "intraoral_anterior_overjet",
		titleRu: "Резцовое перекрытие (Overjet / Overbite)",
		descriptionRu: "Крупный план сагиттальной щели и вертикального резцового перекрытия",
		category: "intraoral",
		matchPatterns: [
			"anterior_overjet",
			"overbite",
			"overjet",
			"intraoral_overjet",
			"сагиттальная_щель",
			"оверджет",
			"перекрытие",
			"slot11",
			"slot_11",
			"11_",
		],
	},
	{
		index: 12,
		id: "intraoral_smile_aesthetic",
		titleRu: "Эстетика улыбки (макро без ретракторов)",
		descriptionRu: "Губной коридор, линия улыбки, резцовый край и десневые зениты",
		category: "intraoral",
		matchPatterns: [
			"smile_aesthetic",
			"macro_smile",
			"aesthetic_smile",
			"intraoral_enamel_macro",
			"enamel_macro",
			"эстетика_улыбки",
			"макро_улыбка",
			"макро_эмаль",
			"slot12",
			"slot_12",
			"12_",
		],
	},
];

/**
 * Matches a photo filename against the 12 standard dental photo protocol slots.
 */
export function matchPhotoProtocolSlot(fileName: string): PhotoProtocolSlot | undefined {
	if (!fileName || typeof fileName !== "string") return undefined;
	const normalized = fileName.toLowerCase().replace(/\\/g, "/");
	const baseName = normalized.split("/").pop() || normalized;

	// 1. Explicit slot index pattern: slot1..slot12, slot_1..slot_12, слот1..слот12
	const slotNumMatch = baseName.match(/(?:^|[_\W])(?:slot|слот)[_-]?(0?[1-9]|1[0-2])(?=[_\W]|$)/i);
	if (slotNumMatch) {
		const idx = parseInt(slotNumMatch[1]!, 10);
		const found = DENTAL_PHOTO_PROTOCOL_12.find((s) => s.index === idx);
		if (found) return found;
	}

	// 2. Leading or delimited index: 01_..12_ or _01.._12
	const delimitedNumMatch = baseName.match(/(?:^|[_\W])(0[1-9]|1[0-2])[_\W]/);
	if (delimitedNumMatch) {
		const idx = parseInt(delimitedNumMatch[1]!, 10);
		const found = DENTAL_PHOTO_PROTOCOL_12.find((s) => s.index === idx);
		if (found) return found;
	}

	// 3. Match semantic patterns (skipping slot numeric aliases handled above)
	for (const slot of DENTAL_PHOTO_PROTOCOL_12) {
		for (const pattern of slot.matchPatterns) {
			if (pattern.startsWith("slot") || pattern.startsWith("0") || pattern.startsWith("1")) {
				continue;
			}
			if (baseName.includes(pattern)) {
				return slot;
			}
		}
	}
	return undefined;
}

/**
 * Канонический словарь синонимов слотов фотопротокола (Мандаты 8bf, 8e).
 * Нормализует расхождения между каталогами (shared vs presets):
 * - frontal ↔ anterior
 * - right_buccal ↔ buccal_right ↔ right_lateral
 * - left_buccal ↔ buccal_left ↔ left_lateral
 * - maxillary_occlusal ↔ occlusal_maxillary ↔ upper_arch
 * - mandibular_occlusal ↔ occlusal_mandibular ↔ lower_arch
 * - overjet ↔ anterior_overjet
 * - enamel_macro ↔ smile_aesthetic
 * - portrait_rest ↔ extraoral_portrait_rest
 * - portrait_smile ↔ extraoral_portrait_smile
 */
export const SLOT_CANONICAL_ALIASES: Readonly<Record<string, string>> = {
	// Extraoral / Портрет
	extraoral_portrait_rest: "portrait_rest",
	portrait_rest: "portrait_rest",
	face_rest: "portrait_rest",
	rest: "portrait_rest",

	extraoral_portrait_smile: "portrait_smile",
	portrait_smile: "portrait_smile",
	face_smile: "portrait_smile",
	smile: "portrait_smile",

	extraoral_portrait_smile_wide: "portrait_smile_wide",
	portrait_smile_wide: "portrait_smile_wide",
	smile_wide: "portrait_smile_wide",

	extraoral_profile_right: "profile_90_rest",
	profile_90_rest: "profile_90_rest",
	profile_90_smile: "profile_90_smile",
	profile_90: "profile_90_rest",
	profile_right: "profile_90_rest",

	extraoral_profile_45: "portrait_45_smile",
	portrait_45_smile: "portrait_45_smile",
	profile_45: "portrait_45_smile",
	semi_profile: "portrait_45_smile",
	three_quarter: "portrait_45_smile",

	// Intraoral Frontal
	intraoral_anterior_occlusion: "intraoral_frontal_occlusion",
	intraoral_frontal_occlusion: "intraoral_frontal_occlusion",
	anterior_occlusion: "intraoral_frontal_occlusion",
	frontal_occlusion: "intraoral_frontal_occlusion",
	front_occlusion: "intraoral_frontal_occlusion",
	front_bite: "intraoral_frontal_occlusion",

	intraoral_anterior_open: "intraoral_frontal_disclusion",
	intraoral_frontal_disclusion: "intraoral_frontal_disclusion",
	intraoral_frontal_open: "intraoral_frontal_disclusion",
	anterior_open: "intraoral_frontal_disclusion",
	frontal_disclusion: "intraoral_frontal_disclusion",
	frontal_open: "intraoral_frontal_disclusion",
	open_bite: "intraoral_frontal_disclusion",

	// Intraoral Buccal / Lateral
	intraoral_buccal_right: "intraoral_right_buccal",
	intraoral_right_buccal: "intraoral_right_buccal",
	intraoral_right_lateral: "intraoral_right_buccal",
	buccal_right: "intraoral_right_buccal",
	right_buccal: "intraoral_right_buccal",
	lateral_right: "intraoral_right_buccal",
	right_bite: "intraoral_right_buccal",

	intraoral_buccal_left: "intraoral_left_buccal",
	intraoral_left_buccal: "intraoral_left_buccal",
	intraoral_left_lateral: "intraoral_left_buccal",
	buccal_left: "intraoral_left_buccal",
	left_buccal: "intraoral_left_buccal",
	lateral_left: "intraoral_left_buccal",
	left_bite: "intraoral_left_buccal",

	// Intraoral Occlusal
	intraoral_occlusal_maxillary: "intraoral_maxillary_occlusal",
	intraoral_maxillary_occlusal: "intraoral_maxillary_occlusal",
	intraoral_upper_occlusal: "intraoral_maxillary_occlusal",
	intraoral_upper_arch: "intraoral_maxillary_occlusal",
	occlusal_maxillary: "intraoral_maxillary_occlusal",
	maxillary_occlusal: "intraoral_maxillary_occlusal",
	upper_arch: "intraoral_maxillary_occlusal",
	occlusal_upper: "intraoral_maxillary_occlusal",
	upper_occlusal: "intraoral_maxillary_occlusal",

	intraoral_occlusal_mandibular: "intraoral_mandibular_occlusal",
	intraoral_mandibular_occlusal: "intraoral_mandibular_occlusal",
	intraoral_lower_occlusal: "intraoral_mandibular_occlusal",
	intraoral_lower_arch: "intraoral_mandibular_occlusal",
	occlusal_mandibular: "intraoral_mandibular_occlusal",
	mandibular_occlusal: "intraoral_mandibular_occlusal",
	lower_arch: "intraoral_mandibular_occlusal",
	occlusal_lower: "intraoral_mandibular_occlusal",
	lower_occlusal: "intraoral_mandibular_occlusal",

	// Intraoral Overjet
	intraoral_anterior_overjet: "intraoral_overjet",
	intraoral_overjet: "intraoral_overjet",
	anterior_overjet: "intraoral_overjet",
	overjet: "intraoral_overjet",
	overbite: "intraoral_overjet",

	// Intraoral Enamel / Aesthetic Macro
	intraoral_smile_aesthetic: "intraoral_enamel_macro",
	intraoral_enamel_macro: "intraoral_enamel_macro",
	smile_aesthetic: "intraoral_enamel_macro",
	enamel_macro: "intraoral_enamel_macro",
	macro_smile: "intraoral_enamel_macro",
	aesthetic_smile: "intraoral_enamel_macro",
};

/**
 * Нормализует идентификатор слота к единому каноническому виду.
 */
export function normalizeSlotId(slotId: string): string {
	if (!slotId || typeof slotId !== "string") return "";
	const cleaned = slotId.toLowerCase().trim().replace(/[\s-]+/g, "_");
	if (SLOT_CANONICAL_ALIASES[cleaned]) {
		return SLOT_CANONICAL_ALIASES[cleaned]!;
	}
	const stripped = cleaned.replace(/^(?:extraoral_|intraoral_)/, "");
	if (SLOT_CANONICAL_ALIASES[stripped]) {
		return SLOT_CANONICAL_ALIASES[stripped]!;
	}
	return cleaned;
}

/**
 * Проверяет эквивалентность двух идентификаторов слотов с учетом словаря синонимов.
 */
export function isSlotMatching(slotIdA: string, slotIdB: string): boolean {
	if (!slotIdA || !slotIdB) return false;
	const normA = normalizeSlotId(slotIdA);
	const normB = normalizeSlotId(slotIdB);
	if (normA === normB) return true;

	const strippedA = normA.replace(/^(?:extraoral_|intraoral_)/, "");
	const strippedB = normB.replace(/^(?:extraoral_|intraoral_)/, "");
	return strippedA === strippedB;
}

