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
		matchPatterns: ["anterior_occlusion", "front_occlusion", "front_bite", "фронт_окклюзия", "фронт_прикус", "slot5", "slot_5", "05_"],
	},
	{
		index: 6,
		id: "intraoral_anterior_open",
		titleRu: "Фронт с разомкнутыми зубами",
		descriptionRu: "Разомкнутые резцовые края для оценки истираемости и анатомии",
		category: "intraoral",
		matchPatterns: ["anterior_open", "front_open", "open_bite", "фронт_разомкнут", "разомкнутый_фронт", "slot6", "slot_6", "06_"],
	},
	{
		index: 7,
		id: "intraoral_buccal_right",
		titleRu: "Боковой вид справа (окклюзия)",
		descriptionRu: "Смыкание клыков и моляров справа по I/II/III классу Энгля",
		category: "intraoral",
		matchPatterns: ["buccal_right", "lateral_right", "right_bite", "боковой_справа", "бок_справа", "slot7", "slot_7", "07_"],
	},
	{
		index: 8,
		id: "intraoral_buccal_left",
		titleRu: "Боковой вид слева (окклюзия)",
		descriptionRu: "Смыкание клыков и моляров слева по I/II/III классу Энгля",
		category: "intraoral",
		matchPatterns: ["buccal_left", "lateral_left", "left_bite", "боковой_слева", "бок_слева", "slot8", "slot_8", "08_"],
	},
	{
		index: 9,
		id: "intraoral_occlusal_maxillary",
		titleRu: "Окклюзия верхней челюсти",
		descriptionRu: "Зеркальный снимок зубного ряда верхней челюсти от 17 до 27",
		category: "intraoral",
		matchPatterns: ["occlusal_maxillary", "occlusal_upper", "upper_arch", "окклюзия_верх", "вч_зеркало", "slot9", "slot_9", "09_"],
	},
	{
		index: 10,
		id: "intraoral_occlusal_mandibular",
		titleRu: "Окклюзия нижней челюсти",
		descriptionRu: "Зеркальный снимок зубного ряда нижней челюсти от 37 до 47",
		category: "intraoral",
		matchPatterns: ["occlusal_mandibular", "occlusal_lower", "lower_arch", "окклюзия_низ", "нч_зеркало", "slot10", "slot_10", "10_"],
	},
	{
		index: 11,
		id: "intraoral_anterior_overjet",
		titleRu: "Резцовое перекрытие (Overjet / Overbite)",
		descriptionRu: "Крупный план сагиттальной щели и вертикального резцового перекрытия",
		category: "intraoral",
		matchPatterns: ["anterior_overjet", "overbite", "overjet", "сагиттальная_щель", "оверджет", "перекрытие", "slot11", "slot_11", "11_"],
	},
	{
		index: 12,
		id: "intraoral_smile_aesthetic",
		titleRu: "Эстетика улыбки (макро без ретракторов)",
		descriptionRu: "Губной коридор, линия улыбки, резцовый край и десневые зениты",
		category: "intraoral",
		matchPatterns: ["smile_aesthetic", "macro_smile", "aesthetic_smile", "эстетика_улыбки", "макро_улыбка", "slot12", "slot_12", "12_"],
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
