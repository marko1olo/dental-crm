export interface FixationTypePreset {
	readonly id: "cement" | "screw" | "clasp";
	readonly labelRu: string;
	readonly titleRu: string;
	readonly sublabelRu: string;
	readonly shortBadge: string;
	readonly description: string;
}

export const FIXATION_TYPE_PRESETS: readonly FixationTypePreset[] = [
	{
		id: "cement",
		labelRu: "Цементная",
		titleRu: "Цементная",
		sublabelRu: "Fuji Plus / RelyX U200",
		shortBadge: "Цемент",
		description: "Фиксация на стеклоиономерный цемент Fuji Plus или композитный цемент RelyX",
	},
	{
		id: "screw",
		labelRu: "Винтовая",
		titleRu: "Винтовая",
		sublabelRu: "Multi-Unit 15–35 Н·см",
		shortBadge: "Винтовая",
		description: "Прямая винтовая фиксация к мультиюнитам или абатментам с контролем ключом",
	},
	{
		id: "clasp",
		labelRu: "Кламмерная / Замковая",
		titleRu: "Кламмерная / Замковая",
		sublabelRu: "Опорно-удерживающие замки / Bredent",
		shortBadge: "Замки/Кламмеры",
		description: "Опорно-удерживающие кламмеры или прецизионные микрозамковые крепления",
	},
] as const;
