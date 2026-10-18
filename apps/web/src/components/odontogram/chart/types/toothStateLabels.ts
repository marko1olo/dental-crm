/**
 * Русские названия состояний — для доступного имени зуба.
 */
export const TOOTH_STATE_LABELS: Record<string, string> = {
	Caries: "кариес",
	caries: "кариес",
	Pulpitis: "пульпит",
	pulpitis: "пульпит",
	Periodontitis: "периодонтит",
	periodontitis: "периодонтит",
	Filled: "пломба",
	filled: "пломба",
	Crown: "коронка",
	crown: "коронка",
	Planned_Crown: "коронка в изготовлении",
	planned_crown: "коронка в изготовлении",
	Implant: "имплантат",
	implant: "имплантат",
	Planned_Implant: "план. имплантат",
	planned_implant: "план. имплантат",
	Missing: "отсутствует",
	missing: "отсутствует",
	Healthy: "здоров",
	healthy: "здоров",
	Retained: "ретинированный",
	retained: "ретинированный",
	Root: "разрушенный корень",
	root: "разрушенный корень",
	Temporary_Crown: "временная коронка",
	Veneer: "винир",
	Inlay: "вкладка",
	Primary: "молочный зуб",
	Resection: "резекция верхушки",
	Gingivitis: "гингивит",
	Periodontitis_Mild: "легкий пародонтит",
	Periodontitis_Moderate: "средний пародонтит",
	Periodontitis_Severe: "тяжелый пародонтит",
	Mobility_1: "подвижность I ст.",
	Mobility_2: "подвижность II ст.",
	Mobility_3: "подвижность III ст.",
	Mobility_I: "подвижность I ст.",
	Mobility_II: "подвижность II ст.",
	Mobility_III: "подвижность III ст.",
	Mobility_IV: "подвижность IV ст.",
	Furcation_1: "фуркация I кл.",
	Furcation_2: "фуркация II кл.",
	Furcation_3: "фуркация III кл.",
	Furcation_I: "фуркация I кл.",
	Furcation_II: "фуркация II кл.",
	Furcation_III: "фуркация III кл.",
	Root_Canal_Treated: "лечены каналы",
	Bridge: "мостовидный протез",
	Bridge_Abutment: "опора моста",
	Extracted: "удален",
	Impacted: "ретинированный",
	Calculus: "зубной камень",
	Bleeding: "кровоточивость",
	Recession: "рецессия десны",
	Pocket: "пародонтальный карман",
	planned: "план лечения",
	treatment: "в лечении",
	done: "санирован",
	watch: "наблюдение",
};

export function getToothStateLabelRu(state?: string | null): string {
	if (!state) return "интактный";
	const direct = TOOTH_STATE_LABELS[state];
	if (direct) return direct;
	const lower = TOOTH_STATE_LABELS[state.toLowerCase()];
	if (lower) return lower;
	return "интактный";
}
