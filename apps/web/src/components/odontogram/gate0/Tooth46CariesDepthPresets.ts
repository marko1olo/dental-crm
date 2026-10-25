import { DEFAULT_TOOTH46_LAYERS } from "./tooth46Types";
import type { Tooth46PresetDef } from "./Tooth46BasePresets";

const def = DEFAULT_TOOTH46_LAYERS;

export const TOOTH46_CARIES_DEPTH_PRESETS: readonly Tooth46PresetDef[] = [
	{
		id: "caries_superficial",
		nameRu: "Кариес поверхностный (Caries superficialis)",
		badge: "C. superfic.",
		description: "Деминерализация эмали без глубокого проникновения в дентин",
		layers: {
			...def,
			caries: true,
			cariesType: "class1",
			cariesDepth: "superficial",
		},
	},
	{
		id: "caries_media",
		nameRu: "Кариес средний (Caries media)",
		badge: "C. media",
		description: "Поражение эмали и плащевого дентина с четкой кавитацией",
		layers: {
			...def,
			caries: true,
			cariesType: "class1",
			cariesDepth: "media",
		},
	},
	{
		id: "caries_profunda",
		nameRu: "Кариес глубокий (Caries profunda)",
		badge: "C. profunda",
		description:
			"Глубокая кариозная полость в околопульпарном дентине над пульпой",
		layers: {
			...def,
			caries: true,
			cariesType: "class1",
			cariesDepth: "profunda",
		},
	},
	{
		id: "caries_destructive",
		nameRu: "Кариес с разрушением коронки (Caries destructiva)",
		badge: "C. destruct.",
		description:
			"Массивное разрушение коронки, скол бугра / краевого гребня или резцового края",
		layers: {
			...def,
			caries: true,
			cariesType: "class2_mod",
			cariesDepth: "destructive",
		},
	},
	{
		id: "caries_class3",
		nameRu: "Кариес Class III (Контактный резцов/клыков)",
		badge: "Class III",
		description: "Аппроксимальная кариозная полость передней группы без скола угла",
		layers: {
			...def,
			caries: true,
			cariesType: "class3",
			cariesDepth: "media",
		},
	},
	{
		id: "caries_class4",
		nameRu: "Кариес Class IV (Со сколом угла коронки)",
		badge: "Class IV",
		description:
			"Аппроксимальный дефект передней группы с полным сколом режущего угла",
		layers: {
			...def,
			caries: true,
			cariesType: "class4",
			cariesDepth: "destructive",
		},
	},
];
