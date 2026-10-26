import { DEFAULT_TOOTH46_LAYERS } from "./tooth46Types";
import type { Tooth46PresetDef } from "./Tooth46BasePresets";
import type {
	CariesBlackClass,
	CariesDepth,
	CariesDepthPresetId,
	CariesType,
} from "./tooth46PresetTypes";

const def = DEFAULT_TOOTH46_LAYERS;

interface BlackClassConfig {
	readonly prefix: CariesBlackClass;
	readonly type: CariesType;
	readonly code: string;
	readonly name: string;
}

const BLACK_CLASSES: readonly BlackClassConfig[] = [
	{ prefix: "c1", type: "class1", code: "C1", name: "Class I (фиссурный)" },
	{ prefix: "c2_m", type: "class2_m", code: "M", name: "Class II M (мезиальный контакт)" },
	{ prefix: "c2_d", type: "class2_d", code: "D", name: "Class II D (дистальный контакт)" },
	{ prefix: "c2_mo", type: "class2_mo", code: "MO", name: "Class II MO (мезиально-окклюзионный)" },
	{ prefix: "c2_do", type: "class2_do", code: "DO", name: "Class II DO (дистально-окклюзионный)" },
	{ prefix: "c2_mod", type: "class2_mod", code: "MOD", name: "Class II MOD (мезио-окклюзо-дистальный)" },
	{ prefix: "c3", type: "class3", code: "C3", name: "Class III (контактный передний)" },
	{ prefix: "c4", type: "class4", code: "C4", name: "Class IV (со сколом режущего угла)" },
	{ prefix: "c5", type: "class5", code: "C5", name: "Class V (пришеечный)" },
];

interface DepthConfig {
	readonly depth: CariesDepth;
	readonly sfx: string;
	readonly name: string;
	readonly desc: string;
}

const WHO_DEPTHS: readonly DepthConfig[] = [
	{ depth: "superficial", sfx: "s", name: "поверхностный", desc: "Деминерализация эмали без глубокого проникновения в дентин" },
	{ depth: "media", sfx: "m", name: "средний", desc: "Поражение эмали и плащевого дентина с четкой кавитацией" },
	{ depth: "profunda", sfx: "p", name: "глубокий", desc: "Глубокая кариозная полость в околопульпарном дентине над пульпой" },
	{ depth: "destructive", sfx: "ds", name: "с разрушением", desc: "Массивное разрушение коронки, скол бугра или краевого гребня" },
];

export const TOOTH46_CARIES_DEPTH_PRESETS: readonly Tooth46PresetDef[] = BLACK_CLASSES.flatMap((cls) =>
	WHO_DEPTHS.map((d): Tooth46PresetDef => ({
		id: `${cls.prefix}_${d.depth}` as CariesDepthPresetId,
		nameRu: `Кариес ${cls.name} — ${d.name}`,
		badge: `${cls.code}${d.sfx}`,
		description: d.desc,
		layers: {
			...def,
			caries: true,
			cariesType: cls.type,
			cariesDepth: d.depth,
		},
	})),
);
