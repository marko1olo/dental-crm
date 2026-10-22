import type { MedicalWasteClassDefinition, MedicalWasteClassId } from "./medicalWasteTypes.js";

export const SANPIN_MEDICAL_WASTE_CLASSES: readonly MedicalWasteClassDefinition[] = [
	{
		id: "class_A",
		letterCode: "А",
		nameRu: "Класс А — Эпидемиологически безопасные отходы",
		dangerCategoryRu: "Неопасные (по составу приближены к ТКО)",
		colorTheme: { bagColorRu: "Белый", hexBadgeBg: "#f8fafc", hexBadgeFg: "#334155", hexBorder: "#cbd5e1" },
		standardCompositionRu: ["Упаковочные материалы (бумага, картон)", "Канцелярский мусор", "Пищевые отходы персонала", "Одноразовая мебель"],
		dentalSpecificItemsRu: ["Упаковка от стоматологических материалов", "Бумажные полотенца без контакта с кровью", "Пластиковые флаконы"],
		mandatoryPackaging: ["white_bag", "white_bin"],
		allowedDecontamination: ["none_class_a"],
		sanpinNormRefRu: "СанПиН 2.1.3684-21 разд. X п. 157",
	},
	{
		id: "class_B",
		letterCode: "Б",
		nameRu: "Класс Б — Эпидемиологически опасные (инфицированные) отходы",
		dangerCategoryRu: "Опасные (инфицированные биоматериалами)",
		colorTheme: { bagColorRu: "Желтый", hexBadgeBg: "#fef3c7", hexBadgeFg: "#92400e", hexBorder: "#f59e0b" },
		standardCompositionRu: ["Материалы, загрязненные кровью", "Острый инструментарий (иглы, скальпели)", "Органические ткани", "Отходы лабораторий"],
		dentalSpecificItemsRu: [
			"Карпулы от анестетиков с кровью (использованные и разбитые)",
			"Салфетки, марлевые турунды и ватные валики, пропитанные кровью и слюной",
			"Использованные смотровые и хирургические латексные/нитриловые перчатки",
			"Удаленные зубы и фрагменты костной ткани после резекций/экстракций",
			"Использованные карпульные инъекционные иглы и лезвия скальпелей",
			"Одноразовые слюноотсосы, пылесосы и наконечники шприцев вода-воздух",
			"Использованные эндодонтические файлы и римеры однократного применения",
		],
		mandatoryPackaging: ["yellow_bag", "yellow_puncture_proof_container", "yellow_sharps_box_needle_remover"],
		allowedDecontamination: ["physical_autoclave_134", "physical_microwave_decontam", "chemical_soaking_disinfectant", "centralized_licensed_incineration"],
		sanpinNormRefRu: "СанПиН 2.1.3684-21 разд. X п. 158",
	},
	{
		id: "class_V",
		letterCode: "В",
		nameRu: "Класс В — Чрезвычайно эпидемиологически опасные отходы",
		dangerCategoryRu: "Чрезвычайно опасные (ООИ, туберкулез)",
		colorTheme: { bagColorRu: "Красный", hexBadgeBg: "#fee2e2", hexBadgeFg: "#991b1b", hexBorder: "#ef4444" },
		standardCompositionRu: ["Материалы от пациентов с ООИ", "Отходы фтизиатрических отделений"],
		dentalSpecificItemsRu: ["Материалы после приема пациентов с открытыми инфекциями", "Биоотходы с подтвержденной инфекцией"],
		mandatoryPackaging: ["red_bag", "red_puncture_proof_container"],
		allowedDecontamination: ["physical_autoclave_134", "centralized_licensed_incineration"],
		sanpinNormRefRu: "СанПиН 2.1.3684-21 разд. X п. 182–189",
	},
	{
		id: "class_G",
		letterCode: "Г",
		nameRu: "Класс Г — Токсикологически опасные отходы",
		dangerCategoryRu: "Токсикологически опасные отходы I-IV классов",
		colorTheme: { bagColorRu: "Черный", hexBadgeBg: "#f1f5f9", hexBadgeFg: "#0f172a", hexBorder: "#475569" },
		standardCompositionRu: ["Ртутьсодержащие приборы и лампы", "Просроченные медикаменты", "Отработанные дезрастворы"],
		dentalSpecificItemsRu: ["Люминесцентные и бактерицидные лампы", "Бактерицидные и люминесцентные лампы", "Отработанные дезинфектанты", "Рентген-реактивы", "Просроченные анестетики", "Амальгамные остатки"],
		mandatoryPackaging: ["marked_container_class_g", "black_container_mercury", "black_bag_g"],
		allowedDecontamination: ["centralized_licensed_incineration"],
		sanpinNormRefRu: "СанПиН 2.1.3684-21 разд. X п. 176–181",
	},
];

export function getMedicalWasteClass(id: MedicalWasteClassId): MedicalWasteClassDefinition {
	const found = SANPIN_MEDICAL_WASTE_CLASSES.find((c) => c.id === id);
	return found || SANPIN_MEDICAL_WASTE_CLASSES[1]!;
}
