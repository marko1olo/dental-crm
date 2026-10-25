export interface QuickProtocolItem {
	readonly id: string;
	readonly title: string;
	readonly icd: string;
}

export const AVAILABLE_QUICK_PROTOCOLS: readonly QuickProtocolItem[] = [
	{ id: "caries_medium_k02_1", title: "Лечение среднего кариеса", icd: "К02.1" },
	{ id: "caries_deep_k02_1", title: "Лечение глубокого кариеса", icd: "К02.1" },
	{ id: "pulpitis_acute_k04_0", title: "Острый пульпит", icd: "К04.0" },
	{ id: "periodontitis_chronic_k04_5", title: "Хронический периодонтит", icd: "К04.5" },
	{ id: "extraction_simple_k08_1", title: "Удаление зуба простое", icd: "К08.1" },
	{ id: "extraction_complex_k01_1", title: "Сложное атипичное удаление", icd: "К01.1" },
	{ id: "implant_installation_k08_1", title: "Дентальная имплантация", icd: "К08.1" },
	{ id: "bone_graft_sinus_k08_2", title: "Костная пластика: Синус-лифтинг", icd: "К08.2" },
	{ id: "bone_graft_gbr_k08_2", title: "НКР альвеолярного гребня", icd: "К08.2" },
	{ id: "prophy_hygiene_k05_0", title: "Комплексная гигиена", icd: "К05.0" },
];
