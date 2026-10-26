/**
 * ============================================================================
 * ORTHOPEDIC WARRANTY PRESETS
 * Ортопедическая стоматология и зубопротезирование: безметалловая керамика
 * IPS e.max, диоксид циркония, бюгельные, акриловые съемные и временные протезы.
 * ============================================================================
 */

import type { WarrantyPreset } from "./types.js";

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

export * from "./orthopedicStarPresets.js";
export * from "./orthopedicDefectTemplates.js";
