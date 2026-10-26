import type { DentalMaterialMeta, WarrantyDefectTemplate } from "./types.js";

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
