/**
 * ============================================================================
 * SANPIN 2.1.3684-21 MEDICAL WASTE DISPOSAL & DECONTAMINATION PRESETS
 * Нормативные классификаторы, типы тары, методы обеззараживания и температурные
 * режимы временного накопления медицинских отходов стоматологической клиники.
 * ============================================================================
 */

export type MedicalWasteClassId = "class_A" | "class_B" | "class_V" | "class_G";

export type MedicalWastePackagingTypeId =
	| "white_bag"
	| "white_bin"
	| "yellow_bag"
	| "yellow_puncture_proof_container"
	| "yellow_sharps_box_needle_remover"
	| "red_bag"
	| "red_puncture_proof_container"
	| "black_container_mercury"
	| "black_bag_g";

export type DecontaminationMethodType =
	| "physical_autoclave_134"
	| "physical_microwave_decontam"
	| "chemical_soaking_disinfectant"
	| "centralized_licensed_incineration"
	| "none_class_a";

export type WasteStorageLocationId =
	| "cabinet_room_temp"
	| "waste_refrigerator_2_8"
	| "waste_freezer_minus_18"
	| "central_accumulation_site";

export interface MedicalWasteClassDefinition {
	readonly id: MedicalWasteClassId;
	readonly letterCode: "А" | "Б" | "В" | "Г";
	readonly nameRu: string;
	readonly dangerCategoryRu: string;
	readonly colorTheme: {
		readonly bagColorRu: string;
		readonly hexBadgeBg: string;
		readonly hexBadgeFg: string;
		readonly hexBorder: string;
	};
	readonly standardCompositionRu: readonly string[];
	readonly dentalSpecificItemsRu: readonly string[];
	readonly mandatoryPackaging: readonly MedicalWastePackagingTypeId[];
	readonly allowedDecontamination: readonly DecontaminationMethodType[];
	readonly sanpinNormRefRu: string;
}

export interface MedicalWastePackagingDefinition {
	readonly id: MedicalWastePackagingTypeId;
	readonly nameRu: string;
	readonly wasteClass: MedicalWasteClassId;
	readonly isPunctureProof: boolean;
	readonly isHermeticSealed: boolean;
	readonly defaultTareWeightKg: number;
	readonly maxCapacityLiters: number;
	readonly colorRu: string;
}

export interface DecontaminationMethodDefinition {
	readonly id: DecontaminationMethodType;
	readonly nameRu: string;
	readonly category: "physical" | "chemical" | "centralized" | "exempt";
	readonly descriptionRu: string;
	readonly standardParametersRu: string;
	readonly validationRequired: boolean;
}

export interface WasteStorageLocationDefinition {
	readonly id: WasteStorageLocationId;
	readonly nameRu: string;
	readonly temperatureRangeRu: string;
	readonly maxAllowedStorageHours: number;
	readonly maxAllowedStorageDays: number;
	readonly appliesToClasses: readonly MedicalWasteClassId[];
	readonly descriptionRu: string;
}

/**
 * 1. Классификатор классов медицинских отходов по СанПиН 2.1.3684-21
 */
export const SANPIN_MEDICAL_WASTE_CLASSES: readonly MedicalWasteClassDefinition[] = [
	{
		id: "class_A",
		letterCode: "А",
		nameRu: "Класс А — Эпидемиологически безопасные отходы",
		dangerCategoryRu: "Неопасные (по составу приближены к ТКО)",
		colorTheme: {
			bagColorRu: "Белый",
			hexBadgeBg: "#f8fafc",
			hexBadgeFg: "#334155",
			hexBorder: "#cbd5e1",
		},
		standardCompositionRu: [
			"Упаковочные материалы (бумага, картон, полиэтилен)",
			"Канцелярский мусор административных кабинетов",
			"Пищевые отходы столовой персонала (кроме инфекционных)",
			"Одноразовая мебель и строительный мусор",
		],
		dentalSpecificItemsRu: [
			"Упаковка от стоматологических материалов и слепочных масс",
			"Бумажные полотенца после мытья рук персоналом (без контакта с кровью)",
			"Пластиковые флаконы от моющих средств",
		],
		mandatoryPackaging: ["white_bag", "white_bin"],
		allowedDecontamination: ["none_class_a"],
		sanpinNormRefRu: "СанПиН 2.1.3684-21 разд. X п. 157",
	},
	{
		id: "class_B",
		letterCode: "Б",
		nameRu: "Класс Б — Эпидемиологически опасные (инфицированные) отходы",
		dangerCategoryRu: "Опасные (инфицированные и потенциально инфицированные биоматериалами)",
		colorTheme: {
			bagColorRu: "Желтый",
			hexBadgeBg: "#fef3c7",
			hexBadgeFg: "#92400e",
			hexBorder: "#f59e0b",
		},
		standardCompositionRu: [
			"Материалы и инструменты, загрязненные кровью и биологическими жидкостями",
			"Острый инструментарий (иглы, скальпели, лезвия, боры)",
			"Органические операционные отходы и удаленные ткани",
			"Отходы инфекционных отделений и бактериологических лабораторий",
		],
		dentalSpecificItemsRu: [
			"Ватные валики, марлевые турунды и салфетки, пропитанные кровью и слюной",
			"Использованные карпульные инъекционные иглы и лезвия скальпелей",
			"Удаленные зубы и фрагменты костной ткани после резекций/экстракций",
			"Одноразовые слюноотсосы, пылесосы и наконечники шприцев вода-воздух",
			"Использованные смотровые и хирургические латексные/нитриловые перчатки",
			"Использованные эндодонтические файлы и римеры однократного применения",
		],
		mandatoryPackaging: [
			"yellow_bag",
			"yellow_puncture_proof_container",
			"yellow_sharps_box_needle_remover",
		],
		allowedDecontamination: [
			"physical_autoclave_134",
			"physical_microwave_decontam",
			"chemical_soaking_disinfectant",
			"centralized_licensed_incineration",
		],
		sanpinNormRefRu: "СанПиН 2.1.3684-21 разд. X п. 158",
	},
	{
		id: "class_V",
		letterCode: "В",
		nameRu: "Класс В — Чрезвычайно эпидемиологически опасные отходы",
		dangerCategoryRu: "Чрезвычайно опасные (инфицированные ООИ, туберкулез, COVID-19, анаэробная инфекция)",
		colorTheme: {
			bagColorRu: "Красный",
			hexBadgeBg: "#fee2e2",
			hexBadgeFg: "#991b1b",
			hexBorder: "#ef4444",
		},
		standardCompositionRu: [
			"Материалы и инструмент от пациентов с особо опасными инфекциями",
			"Отходы лабораторий, работающих с микроорганизмами 1-2 групп патогенности",
			"Отходы фтизиатрических отделений и анаэробных инфекций",
		],
		dentalSpecificItemsRu: [
			"Материалы после приема пациентов с открытыми формами инфекций / туберкулезом",
			"Биологические отходы операционных с подтвержденной анаэробной инфекцией",
		],
		mandatoryPackaging: ["red_bag", "red_puncture_proof_container"],
		allowedDecontamination: ["physical_autoclave_134", "centralized_licensed_incineration"],
		sanpinNormRefRu: "СанПиН 2.1.3684-21 разд. X п. 182–189",
	},
	{
		id: "class_G",
		letterCode: "Г",
		nameRu: "Класс Г — Токсикологически опасные отходы",
		dangerCategoryRu: "Токсикологически опасные отходы I-IV классов токсичности",
		colorTheme: {
			bagColorRu: "Черный",
			hexBadgeBg: "#f1f5f9",
			hexBadgeFg: "#0f172a",
			hexBorder: "#475569",
		},
		standardCompositionRu: [
			"Ртутьсодержащие приборы, люминесцентные и бактерицидные лампы",
			"Просроченные лекарственные средства и антисептики",
			"Отходы фармацевтических производств и химреактивов",
			"Дезинфицирующие растворы с истекшим сроком годности",
		],
		dentalSpecificItemsRu: [
			"Ртутные амальгамные остатки и капсулы после реставраций",
			"Отработанные бактерицидные УФ-лампы рециркуляторов воздуха",
			"Просроченные карпулы анестетиков и медикаментозные препараты",
			"Отработанные фиксажи и проявители фоторентгенпленки",
		],
		mandatoryPackaging: ["black_container_mercury", "black_bag_g"],
		allowedDecontamination: ["centralized_licensed_incineration"],
		sanpinNormRefRu: "СанПиН 2.1.3684-21 разд. X п. 176–181",
	},
];

/**
 * 2. Классификатор упаковочной тары для медицинских отходов
 */
export const SANPIN_WASTE_PACKAGING_TYPES: readonly MedicalWastePackagingDefinition[] = [
	{
		id: "white_bag",
		nameRu: "Пакет полиэтиленовый белый (Класс А)",
		wasteClass: "class_A",
		isPunctureProof: false,
		isHermeticSealed: true,
		defaultTareWeightKg: 0.05,
		maxCapacityLiters: 30,
		colorRu: "Белый",
	},
	{
		id: "white_bin",
		nameRu: "Бак многоразовый белый с педалью (Класс А)",
		wasteClass: "class_A",
		isPunctureProof: true,
		isHermeticSealed: false,
		defaultTareWeightKg: 1.2,
		maxCapacityLiters: 50,
		colorRu: "Белый",
	},
	{
		id: "yellow_bag",
		nameRu: "Пакет полиэтиленовый желтый плотный с затяжкой (Класс Б)",
		wasteClass: "class_B",
		isPunctureProof: false,
		isHermeticSealed: true,
		defaultTareWeightKg: 0.08,
		maxCapacityLiters: 30,
		colorRu: "Желтый",
	},
	{
		id: "yellow_puncture_proof_container",
		nameRu: "Контейнер непрокалываемый желтый с герметичной крышкой (Класс Б)",
		wasteClass: "class_B",
		isPunctureProof: true,
		isHermeticSealed: true,
		defaultTareWeightKg: 0.25,
		maxCapacityLiters: 5,
		colorRu: "Желтый",
	},
	{
		id: "yellow_sharps_box_needle_remover",
		nameRu: "Емкость-контейнер для острого инструментария с иглосъемником (Класс Б)",
		wasteClass: "class_B",
		isPunctureProof: true,
		isHermeticSealed: true,
		defaultTareWeightKg: 0.18,
		maxCapacityLiters: 3,
		colorRu: "Желтый",
	},
	{
		id: "red_bag",
		nameRu: "Пакет полиэтиленовый красный плотный (Класс В)",
		wasteClass: "class_V",
		isPunctureProof: false,
		isHermeticSealed: true,
		defaultTareWeightKg: 0.08,
		maxCapacityLiters: 30,
		colorRu: "Красный",
	},
	{
		id: "red_puncture_proof_container",
		nameRu: "Контейнер красный непрокалываемый с иглосъемником (Класс В)",
		wasteClass: "class_V",
		isPunctureProof: true,
		isHermeticSealed: true,
		defaultTareWeightKg: 0.22,
		maxCapacityLiters: 3,
		colorRu: "Красный",
	},
	{
		id: "black_container_mercury",
		nameRu: "Спецконтейнер герметичный для амальгамы и ртути (Класс Г)",
		wasteClass: "class_G",
		isPunctureProof: true,
		isHermeticSealed: true,
		defaultTareWeightKg: 0.45,
		maxCapacityLiters: 2,
		colorRu: "Черный",
	},
	{
		id: "black_bag_g",
		nameRu: "Пакет специальный черный плотный (Класс Г)",
		wasteClass: "class_G",
		isPunctureProof: false,
		isHermeticSealed: true,
		defaultTareWeightKg: 0.08,
		maxCapacityLiters: 30,
		colorRu: "Черный",
	},
];

/**
 * 3. Методы обеззараживания и обезвреживания
 */
export const SANPIN_DECONTAMINATION_METHODS: readonly DecontaminationMethodDefinition[] = [
	{
		id: "physical_autoclave_134",
		nameRu: "Аппаратное автоклавирование (водяной пар 134°C, 2.1 бар, 15 мин)",
		category: "physical",
		descriptionRu: "Стерилизация отходов в специализированном автоклаве для медицинских отходов при 134°C с полным уничтожением споровых и вегетативных форм патогенов.",
		standardParametersRu: "134°C, 2.1 bar, 15 минут экспозиции",
		validationRequired: true,
	},
	{
		id: "physical_microwave_decontam",
		nameRu: "СВЧ-обеззараживание (микроволновое термическое воздействие)",
		category: "physical",
		descriptionRu: "Нагрев увлажненных отходов токами СВЧ с термоинактивацией микроорганизмов.",
		standardParametersRu: "100–105°C, 20–30 минут",
		validationRequired: true,
	},
	{
		id: "chemical_soaking_disinfectant",
		nameRu: "Химическое обеззараживание погружением в раствор дезинфектанта",
		category: "chemical",
		descriptionRu: "Полное погружение отходов в рабочий раствор зарегистрированного дезсредства (по вирулицидному и бактерицидному режиму, например Бриллиант Классик 2% на 60 мин).",
		standardParametersRu: "Экспозиция 60 мин в закрытой емкости",
		validationRequired: true,
	},
	{
		id: "centralized_licensed_incineration",
		nameRu: "Централизованное обезвреживание (сжигание в инсинераторе спецпредприятием)",
		category: "centralized",
		descriptionRu: "Вывоз специализированной лицензированной компанией для высокотемпературного сжигания в пиролизных печах и инсинераторах.",
		standardParametersRu: "Вывоз спецавтотранспортом по договору",
		validationRequired: false,
	},
	{
		id: "none_class_a",
		nameRu: "Без обеззараживания (Отходы класса А не требуют дезинфекции)",
		category: "exempt",
		descriptionRu: "Эпидемиологически безопасные отходы вывозятся региональным оператором ТКО.",
		standardParametersRu: "Вывоз по графику ТКО",
		validationRequired: false,
	},
];

/**
 * 4. Режимы временного хранения отходов и температурные лимиты
 */
export const SANPIN_STORAGE_LOCATIONS: readonly WasteStorageLocationDefinition[] = [
	{
		id: "cabinet_room_temp",
		nameRu: "Кабинет / Накопление при комнатной температуре (+18...+25°C)",
		temperatureRangeRu: "+18...+25°C",
		maxAllowedStorageHours: 24, // Не более 24 часов
		maxAllowedStorageDays: 1,
		appliesToClasses: ["class_A", "class_B", "class_G"],
		descriptionRu: "Накопление необеззараженных отходов класса Б при комнатной температуре допускается не более 24 часов (СанПиН 2.1.3684-21 п. 174).",
	},
	{
		id: "waste_refrigerator_2_8",
		nameRu: "Специализированный холодильник для отходов (+2...+8°C)",
		temperatureRangeRu: "+2...+8°C",
		maxAllowedStorageHours: 168, // До 7 суток (7 * 24 = 168)
		maxAllowedStorageDays: 7,
		appliesToClasses: ["class_B"],
		descriptionRu: "При использовании специализированного холодильного оборудования накопление отходов класса Б допускается до 7 суток.",
	},
	{
		id: "waste_freezer_minus_18",
		nameRu: "Морозильная камера для отходов (-18°C)",
		temperatureRangeRu: "-18°C и ниже",
		maxAllowedStorageHours: 720, // До 30 суток (30 * 24 = 720)
		maxAllowedStorageDays: 30,
		appliesToClasses: ["class_B"],
		descriptionRu: "При использовании морозильного оборудования хранение отходов класса Б допускается до 30 суток.",
	},
	{
		id: "central_accumulation_site",
		nameRu: "Площадка временного накопления отходов клиники",
		temperatureRangeRu: "Согласно сезону / помещение с вентиляцией",
		maxAllowedStorageHours: 24,
		maxAllowedStorageDays: 1,
		appliesToClasses: ["class_A", "class_B", "class_G"],
		descriptionRu: "Изолированное помещение для сбора и передачи отходов спецтранспорту с вытяжной вентиляцией и бактерицидной обработкой.",
	},
];

/**
 * Получить определение класса отходов по ID
 */
export function getMedicalWasteClass(id: MedicalWasteClassId): MedicalWasteClassDefinition {
	const found = SANPIN_MEDICAL_WASTE_CLASSES.find((c) => c.id === id);
	return found || SANPIN_MEDICAL_WASTE_CLASSES[1]!; // fallback to Class B
}

/**
 * Получить определение тары по ID
 */
export function getMedicalWastePackaging(id: MedicalWastePackagingTypeId): MedicalWastePackagingDefinition {
	const found = SANPIN_WASTE_PACKAGING_TYPES.find((p) => p.id === id);
	return found || SANPIN_WASTE_PACKAGING_TYPES[2]!; // fallback to yellow_bag
}

/**
 * Получить метод обеззараживания по ID
 */
export function getDecontaminationMethod(id: DecontaminationMethodType): DecontaminationMethodDefinition {
	const found = SANPIN_DECONTAMINATION_METHODS.find((m) => m.id === id);
	return found || SANPIN_DECONTAMINATION_METHODS[0]!;
}

/**
 * Получить место хранения по ID
 */
export function getWasteStorageLocation(id: WasteStorageLocationId): WasteStorageLocationDefinition {
	const found = SANPIN_STORAGE_LOCATIONS.find((l) => l.id === id);
	return found || SANPIN_STORAGE_LOCATIONS[0]!;
}
