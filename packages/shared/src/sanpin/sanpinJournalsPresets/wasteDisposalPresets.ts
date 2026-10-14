/**
 * ============================================================================
 * SANPIN 2.1.3684-21 MEDICAL WASTE DISPOSAL & ACCUMULATION PRESETS
 * Нормативные пресеты обращения с медицинскими отходами классов А, Б, В, Г:
 * требования к таре, цвета маркировки, плотность, сроки хранения и регламенты утилизации.
 * ============================================================================
 */

import type {
	MedicalWasteDisposalClassCode,
	MedicalWasteDisposalPresetDefinition,
} from "./types.js";

// ─────────────────────────────────────────────────────────────────────────────
// 6. МЕДИЦИНСКИЕ ОТХОДЫ КЛАССОВ А, Б, В, Г (САНПИН 2.1.3684-21)
// ─────────────────────────────────────────────────────────────────────────────

export const SANPIN_MEDICAL_WASTE_PRESETS: readonly MedicalWasteDisposalPresetDefinition[] = [
	{
		classCode: "class_A",
		titleRu: "Класс А — Эпидемиологически безопасные отходы",
		colorCodeRu: "Белый",
		statutoryColorHex: "#FFFFFF",
		containerTypeRu: "Многоразовые баки или белые пакеты плотностью не менее 15–20 мкм",
		defaultTareWeightKg: 0.05,
		statutoryDensityKgPerLiter: 0.08,
		maxStorageWithoutColdHours: 24,
		typicalDentalItemsRu: [
			"Упаковка медикаментов и расходных материалов",
			"Канцелярский картон и бумага регистратуры",
			"Средства личной гигиены персонала без контакта с биожидкостями",
			"Пищевые отходы пищеблока/комнаты отдыха персонала",
		],
		mandatoryDisinfectionProtocolRu:
			"Обеззараживание не требуется. Сбор в белые мешки/урны, вывоз как ТКО.",
		sanpinClauseRu:
			"СанПиН 2.1.3684-21 п. 165 (Отходы, не имевшие контакта с биологическими жидкостями пациентов)",
	},
	{
		classCode: "class_B",
		titleRu: "Класс Б — Эпидемиологически опасные (инфицированные) отходы",
		colorCodeRu: "Желтый",
		statutoryColorHex: "#FACC15",
		containerTypeRu:
			"Желтые герметичные пакеты / одноразовые непрокалываемые контейнеры для острых предметов",
		defaultTareWeightKg: 0.12,
		statutoryDensityKgPerLiter: 0.12,
		maxStorageWithoutColdHours: 24,
		typicalDentalItemsRu: [
			"Ватные валики, марлевые турунды и салфетки с кровью/слюной",
			"Карпульные инъекционные иглы и одноразовые карпулы от анестетика",
			"Одноразовые скальпели, лезвия 15C, шовный материал и биоптаты",
			"Слюноотсосы, аспирационные наконечники, использованные маски и перчатки",
			"Удаленные зубы и фрагменты костных тканей",
		],
		mandatoryDisinfectionProtocolRu:
			"Обязательное химическое обеззараживание в дезрастворе (или автоклавирование) перед герметизацией и передачей лицензированной организации.",
		sanpinClauseRu:
			"СанПиН 2.1.3684-21 п. 168 (Инфицированные и потенциально инфицированные материалы)",
	},
	{
		classCode: "class_V",
		titleRu: "Класс В — Чрезвычайно эпидемиологически опасные отходы",
		colorCodeRu: "Красный",
		statutoryColorHex: "#EF4444",
		containerTypeRu: "Красные герметичные пакеты и жесткие непрокалываемые емкости",
		defaultTareWeightKg: 0.15,
		statutoryDensityKgPerLiter: 0.15,
		maxStorageWithoutColdHours: 12,
		typicalDentalItemsRu: [
			"Материалы и инструменты после приёма пациентов с туберкулезом",
			"Отходы при подозрении на карантинные и особо опасные инфекции (ООИ)",
			"Микробиологические культуры и патогенные биологические агенты (ПБА I–II групп)",
		],
		mandatoryDisinfectionProtocolRu:
			"Немедленная децентрализованная стерилизация/автоклавирование физическими методами на месте образования.",
		sanpinClauseRu:
			"СанПиН 2.1.3684-21 п. 175 (Отходы подразделений фтизиатрического и инфекционного профиля)",
	},
	{
		classCode: "class_G",
		titleRu: "Класс Г — Токсикологически опасные отходы",
		colorCodeRu: "Черный",
		statutoryColorHex: "#18181B",
		containerTypeRu: "Специализированные герметичные маркированные емкости для демеркуризации",
		defaultTareWeightKg: 0.25,
		statutoryDensityKgPerLiter: 0.25,
		maxStorageWithoutColdHours: 720,
		typicalDentalItemsRu: [
			"Отработанные бактерицидные ртутьсодержащие УФ-лампы (ДБ-15, TUV 15W/30W)",
			"Люминесцентные лампы освещения кабинетов",
			"Остатки ртутной амальгамы и капсул",
			"Просроченные лекарственные препараты и дезинфицирующие концентраты",
		],
		mandatoryDisinfectionProtocolRu:
			"Накопление в герметичной таре в отдельном помещении, демеркуризационный комплект, передача специализированной компании по утилизации отходов I–II классов опасности.",
		sanpinClauseRu:
			"СанПиН 2.1.3684-21 п. 182 (Ртутьсодержащие приборы, лампы и токсичные отходы)",
	},
];

export function getMedicalWastePreset(
	classCode: MedicalWasteDisposalClassCode,
): MedicalWasteDisposalPresetDefinition {
	const found = SANPIN_MEDICAL_WASTE_PRESETS.find((p) => p.classCode === classCode);
	return found || SANPIN_MEDICAL_WASTE_PRESETS[1]!; // Default: Class B
}
