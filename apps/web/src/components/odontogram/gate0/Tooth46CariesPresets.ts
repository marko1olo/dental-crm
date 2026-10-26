import {
	DEFAULT_TOOTH46_LAYERS,
} from "./tooth46Types";
import type { Tooth46PresetDef } from "./Tooth46BasePresets";

const def = DEFAULT_TOOTH46_LAYERS;

export const TOOTH46_CARIES_PRESETS: readonly Tooth46PresetDef[] = [
	{
		id: "caries_white_spot",
		nameRu: "Кариес в стадии пятна (White Spot)",
		badge: "Caries in situ",
		description:
			"Меловидное пятно деминерализации на гладкой эмали без кавитации",
		layers: { ...def, caries: true, cariesType: "white_spot" },
	},
	{
		id: "caries_class2_m",
		nameRu: "Кариес Class II M",
		badge: "Class II M",
		description: "Мезиальная контактная кариозная полость в пределах аппроксимального контакта",
		layers: { ...def, caries: true, cariesType: "class2_m" },
	},
	{
		id: "caries_class2_d",
		nameRu: "Кариес Class II D",
		badge: "Class II D",
		description: "Дистальная контактная кариозная полость в пределах аппроксимального контакта",
		layers: { ...def, caries: true, cariesType: "class2_d" },
	},
	{
		id: "caries_class2_mo",
		nameRu: "Кариес Class II MO",
		badge: "Class II MO",
		description: "Мезиально-окклюзионная контактная полость и дентинный очаг",
		layers: { ...def, caries: true, cariesType: "class2_mo" },
	},
	{
		id: "caries_class2_do",
		nameRu: "Кариес Class II DO",
		badge: "Class II DO",
		description: "Дистально-окклюзионная контактная деструкция краевого гребня",
		layers: { ...def, caries: true, cariesType: "class2_do" },
	},
	{
		id: "caries_class2_mod",
		nameRu: "Кариес Class II MOD",
		badge: "Class II MOD",
		description:
			"Сквозное контактное разрушение мезиальной и дистальной стенок",
		layers: { ...def, caries: true, cariesType: "class2_mod" },
	},
	{
		id: "caries_class5",
		nameRu: "Кариес Class V (Пришеечный)",
		badge: "Class V",
		description:
			"Серповидная кариозная полость в пришеечной зоне вестибулярной поверхности",
		layers: { ...def, caries: true, cariesType: "class5" },
	},
	{
		id: "caries_acute",
		nameRu: "Острый кариес (активный)",
		badge: "Острый кариес",
		description:
			"Влажный, светло-желтый размягченный дентин с подрытыми краями эмали",
		layers: {
			...def,
			caries: true,
			cariesType: "class1",
			cariesChronicity: "acute",
		},
	},
	{
		id: "caries_chronic",
		nameRu: "Хронический кариес (приостановившийся)",
		badge: "Хронический",
		description:
			"Плотный, пигментированный темно-коричневый склерозированный дентин",
		layers: {
			...def,
			caries: true,
			cariesType: "class1",
			cariesChronicity: "chronic",
		},
	},
	{
		id: "restoration_inlay",
		nameRu: "Вкладка керамическая (Inlay)",
		badge: "Inlay",
		description:
			"Прецизионная адгезивная керамическая вкладка в пределах бугров",
		layers: { ...def, inlayOnlay: "inlay" },
	},
	{
		id: "restoration_onlay",
		nameRu: "Накладка керамическая (Onlay)",
		badge: "Onlay",
		description: "Керамическая накладка с перекрытием щечных бугров MB и DB",
		layers: { ...def, inlayOnlay: "onlay" },
	},
];

export { TOOTH46_CARIES_DEPTH_PRESETS } from "./Tooth46CariesDepthPresets";

