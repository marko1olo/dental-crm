/**
 * ============================================================================
 * ORTHOPEDIC WARRANTY PRESETS & CLINICAL DEFECTS
 * Ортопедическая стоматология и зубопротезирование: безметалловая керамика
 * IPS e.max, диоксид циркония, бюгельные, акриловые съемные и временные протезы.
 * Нормативы: Положение СтАР разд. 3–4, ГК РФ ст. 720–724, 737.
 * ============================================================================
 */

import type {
	DentalMaterialMeta,
	StarQuickPreset,
	WarrantyDefectTemplate,
	WarrantyPreset,
} from "./types.js";

export const CERAMIC_CROWN_VENEER_PRESET: WarrantyPreset = {
	category: "ceramic_crown_veneer",
	code: "WAR-CERAM-02",
	serviceCode804n: "A16.07.004.002",
	title: "Керамические коронки, виниры E.max, вкладки Inlay/Onlay и диоксид циркония",
	shortTitle: "Коронки & Виниры E.max",
	description:
		"Несъемное микропротезирование и ортопедическое восстановление зубов высокопрочной керамикой дисиликата лития и многослойным диоксидом циркония.",
	statutoryBasis: "Закон РФ № 2300-1, ГК РФ ст. 720–724, Положение СтАР разд. 3",
	baseWarrantyMonths: 36,
	minWarrantyMonths: 12,
	maxWarrantyMonths: 60,
	baseServiceLifeMonths: 120,
	minServiceLifeMonths: 60,
	maxServiceLifeMonths: 180,
	clinicalConditions: [
		"Стабильные множественные окклюзионные контакты в центральной окклюзии",
		"Ношение разгрузочной окклюзионной каппы при признаках гипертонуса мышц",
		"Отсутствие генерализованного пародонтита тяжелой степени в фазе обострения",
		"Прохождение контрольной профессиональной гигиены каждые 6 месяцев",
	],
	recommendedMaterials: [
		"IPS e.max Press / CAD (Ivoclar Vivadent, Лихтенштейн)",
		"Noritake Katana Zirconia HTML / UTML / STML (Япония)",
		"Vita Suprinity / Vita Enamic (Германия)",
		"Zirkonzahn Prettau Anterior / Dispersive (Италия)",
		"Dentsply Sirona Cercon ht ML (Германия)",
	],
	popularManufacturers: ["Ivoclar Vivadent", "Kuraray Noritake", "Vita Zahnfabrik", "Zirkonzahn", "Dentsply Sirona"],
	standardCheckupIntervalMonths: 6,
};

export const REMOVABLE_PROSTHESIS_PRESET: WarrantyPreset = {
	category: "removable_prosthesis",
	code: "WAR-REMOV-05",
	serviceCode804n: "A16.07.036",
	title: "Бюгельные, пластиночные и условно-съемные протезы",
	shortTitle: "Съемные & Бюгельные протезы",
	description:
		"Ортопедическое замещение частичной или полной адентии съемными акриловыми, нейлоновыми и бюгельными конструкциями.",
	statutoryBasis: "Закон РФ № 2300-1, Положение СтАР разд. 4",
	baseWarrantyMonths: 12,
	minWarrantyMonths: 6,
	maxWarrantyMonths: 18,
	baseServiceLifeMonths: 36,
	minServiceLifeMonths: 24,
	maxServiceLifeMonths: 60,
	clinicalConditions: [
		"Обязательная клиническая перебазировка протеза через 6 месяцев для компенсации атрофии кости",
		"Ежедневная гигиеническая дезинфекция протеза специализированными таблетками/растворами",
		"Исключение самостоятельного подгибания кламмеров и замковых креплений (аттачменов)",
		"Контроль равномерности окклюзионного распределения нагрузки раз в 6 мес",
	],
	recommendedMaterials: [
		"Акрил Vertex Implacryl / Rapid Simplified (Нидерланды)",
		"Lucitone 199 High Impact (Dentsply Sirona)",
		"Кобальт-хромовый сплав Bego Wironit / Heraeus Kulzer (Германия)",
		"Термопласт Bredent Bio Dentaplast / Valplast (Германия/США)",
	],
	popularManufacturers: ["Vertex-Dental", "Dentsply Sirona", "Bredent", "BEGO", "Kulzer", "Valplast"],
	standardCheckupIntervalMonths: 6,
};

export const TEMPORARY_PROSTHESIS_PRESET: WarrantyPreset = {
	category: "temporary_prosthesis",
	code: "WAR-TEMP-08",
	serviceCode804n: "A16.07.004.004",
	title: "Временные коронки, мостовидные протезы и адаптационные каппы",
	shortTitle: "Временные коронки",
	description:
		"Провизорные реставрации для защиты препарированного дентина, стабилизации окклюзии и формирования контура десны на период изготовления постоянных конструкций.",
	statutoryBasis: "Закон РФ № 2300-1 (краткосрочные провизорные изделия)",
	baseWarrantyMonths: 1,
	minWarrantyMonths: 1,
	maxWarrantyMonths: 3,
	baseServiceLifeMonths: 3,
	minServiceLifeMonths: 1,
	maxServiceLifeMonths: 6,
	clinicalConditions: [
		"Своевременная замена на постоянную ортопедическую конструкцию в рекомендованный врачом срок",
		"Исключение вязкой и липкой пищи (ириски, жевательная резинка), способствующей расцементировке",
		"Немедленный визит в клинику при расцементировке для повторной фиксации",
	],
	recommendedMaterials: [
		"3M Protemp 4 (США)",
		"DMG Luxatemp Star / Automix (Германия)",
		"PMMA фрезерованный CAD/CAM (Yamahachi, Япония)",
	],
	popularManufacturers: ["3M ESPE", "DMG", "GC Corporation", "Dentsply Sirona"],
	standardCheckupIntervalMonths: 1,
};

export const ORTHOPEDIC_WARRANTY_PRESETS = {
	ceramic_crown_veneer: CERAMIC_CROWN_VENEER_PRESET,
	removable_prosthesis: REMOVABLE_PROSTHESIS_PRESET,
	temporary_prosthesis: TEMPORARY_PROSTHESIS_PRESET,
} as const;

export const CROWN_DECEMENTATION_DEFECT_TEMPLATE: WarrantyDefectTemplate = {
	defectType: "crown_decementation",
	code: "DEF-CROWN-02",
	title: "Расцементировка искусственной коронки / мостовидного протеза (0 ₽)",
	shortTitle: "Расцементировка коронки (0 ₽)",
	category: "ceramic_crown_veneer",
	recommendedAction: "Ультразвуковая и пескоструйная очистка реставрации, антисептическая обработка культи и повторная адгезивная фиксация",
	clinicalDescription: "Подвижность или самопроизвольное снятие коронки вследствие вымывания фиксирующего цемента.",
	defaultMaterials: [
		{ name: "Композитный фиксирующий цемент RelyX U200 / Fuji Plus", quantity: 1, unit: "доз." },
		{ name: "Раствор хлоргексидина биглюконата 2%", quantity: 5, unit: "мл" },
		{ name: "Праймер для керамики / металла", quantity: 1, unit: "доз." },
	],
	statutoryBasis: "Закон РФ № 2300-1 ст. 29, ГК РФ ст. 720–724 (Гарантийное восстановление фиксации)",
};

export const CERAMIC_CHIP_DEFECT_TEMPLATE: WarrantyDefectTemplate = {
	defectType: "ceramic_chip",
	code: "DEF-CHIP-03",
	title: "Скол облицовочной керамики / винира (0 ₽)",
	shortTitle: "Скол керамики (0 ₽)",
	category: "ceramic_crown_veneer",
	recommendedAction: "Клиническая шлифовка скола, силанизация керамики и послойное моделирование нанокомпозитом",
	clinicalDescription: "Поверхностный или краевой скол керамической массы без нарушения целостности каркаса.",
	defaultMaterials: [
		{ name: "Керамический праймер Monobond Plus / Silane", quantity: 1, unit: "доз." },
		{ name: "Светоотверждаемый нанокомпозит эмалевый / опаковый", quantity: 1, unit: "доз." },
		{ name: "Алмазная полировочная паста Diamond Polish", quantity: 1, unit: "доз." },
	],
	statutoryBasis: "Закон РФ № 2300-1 ст. 29 (Устранение дефекта ортопедической конструкции)",
};

export const DENTURE_FRACTURE_DEFECT_TEMPLATE: WarrantyDefectTemplate = {
	defectType: "denture_fracture",
	code: "DEF-PROSTH-05",
	title: "Трещина / перелом базиса съемного протеза (0 ₽)",
	shortTitle: "Поломка базиса протеза (0 ₽)",
	category: "removable_prosthesis",
	recommendedAction: "Снятие контрольного оттиска с протезом, лабораторная сварка/починка базиса пластмассой холодной полимеризации",
	clinicalDescription: "Линейная трещина или перелом акрилового базиса частичного/полного съемного протеза.",
	defaultMaterials: [
		{ name: "Базисная пластмасса холодной полимеризации (Vertex Castapress)", quantity: 1, unit: "порция" },
		{ name: "Оттискная альгинатная масса", quantity: 1, unit: "порция" },
	],
	statutoryBasis: "Закон РФ № 2300-1 ст. 29, Положение СтАР разд. 4",
};

export const ORTHOPEDIC_DEFECT_TEMPLATES = {
	crown_decementation: CROWN_DECEMENTATION_DEFECT_TEMPLATE,
	ceramic_chip: CERAMIC_CHIP_DEFECT_TEMPLATE,
	denture_fracture: DENTURE_FRACTURE_DEFECT_TEMPLATE,
} as const;

export const ORTHOPEDIC_MATERIALS: DentalMaterialMeta[] = [
	{
		id: "mat_emax_press",
		category: "ceramic_crown_veneer",
		name: "IPS e.max Press (Ivoclar Vivadent)",
		manufacturer: "Ivoclar Vivadent",
		country: "Лихтенштейн",
		type: "Стеклокерамика на основе дисиликата лития",
		warrantyMonthsDefault: 24,
		serviceLifeMonthsDefault: 120,
		requiresLotNumber: true,
		popularShades: ["BL1", "BL2", "A1", "A2", "A3", "B1"],
	},
	{
		id: "mat_katana_zirconia",
		category: "ceramic_crown_veneer",
		name: "Katana Zirconia HTML/UTML (Kuraray Noritake)",
		manufacturer: "Kuraray Noritake",
		country: "Япония",
		type: "Многослойный высокотранслюцентный диоксид циркония",
		warrantyMonthsDefault: 36,
		serviceLifeMonthsDefault: 180,
		requiresLotNumber: true,
		popularShades: ["A1", "A2", "A3", "B1", "NW"],
	},
	{
		id: "mat_vertex_implacryl",
		category: "removable_prosthesis",
		name: "Vertex Implacryl / Castavest Bego",
		manufacturer: "Vertex-Dental / BEGO",
		country: "Нидерланды / Германия",
		type: "Бюгельный протез с литым Co-Cr базисом и акриловой гарнитурой",
		warrantyMonthsDefault: 12,
		serviceLifeMonthsDefault: 36,
		requiresLotNumber: false,
	},
];

export const STAR_EMAX_QUICK_PRESET: StarQuickPreset = {
	id: "star_emax_2y",
	title: "Керамика E.max",
	subtitle: "2 года (24 мес.) • Срок сл. 10 лет",
	category: "ceramic_crown_veneer",
	materialName: "IPS e.max Press (дисиликат лития)",
	manufacturer: "Ivoclar Vivadent",
	country: "Лихтенштейн",
	warrantyMonths: 24,
	serviceLifeMonths: 120,
	serviceCode804n: "A16.07.004.002",
	statutoryNote: "Положение СтАР разд. 3 (безметалловая керамика E.max)",
};

export const STAR_ZIRCONIA_QUICK_PRESET: StarQuickPreset = {
	id: "star_zirconia_3y",
	title: "Диоксид циркония",
	subtitle: "3 года (36 мес.) • Срок сл. 15 лет",
	category: "ceramic_crown_veneer",
	materialName: "Katana Zirconia HTML/UTML",
	manufacturer: "Kuraray Noritake",
	country: "Япония",
	warrantyMonths: 36,
	serviceLifeMonths: 180,
	serviceCode804n: "A16.07.004.002",
	statutoryNote: "Положение СтАР разд. 3, ГК РФ ст. 720–724",
};

export const STAR_ORTHOPEDIC_QUICK_PRESETS: readonly StarQuickPreset[] = [
	STAR_EMAX_QUICK_PRESET,
	STAR_ZIRCONIA_QUICK_PRESET,
] as const;
