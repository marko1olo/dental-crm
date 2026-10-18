import type { Tooth46PresetDef } from "./Tooth46BasePresets";
import { DEFAULT_TOOTH46_LAYERS } from "./tooth46Types";

const def = DEFAULT_TOOTH46_LAYERS;
const noCrown = { crown: false, cusps: false, fissures: false };

export const TOOTH46_PATHOLOGY_PRESETS: readonly Tooth46PresetDef[] = [
	{
		id: "abfraction",
		nameRu: "Клиновидный дефект (Abfraction)",
		badge: "Клин. дефект",
		description: "V-образная цервикальная убыль эмали у десневого края CEJ",
		layers: { ...def, abfraction: true },
	},
	{
		id: "postCore",
		nameRu: "Штифтовая культевая вкладка",
		badge: "Штифт/Культя",
		description:
			"Стекловолоконный штифт в дистальном канале и культевая культя",
		layers: {
			...def,
			...noCrown,
			canals: true,
			guttaPercha: true,
			postCore: true,
		},
	},
	{
		id: "calculus",
		nameRu: "Зубной камень (над- и поддесневой)",
		badge: "Камень",
		description: "Минерализованные бляшечные отложения в пришеечной трети",
		layers: { ...def, calculus: true },
	},
	{
		id: "crack",
		nameRu: "Трещина зуба / Infraction 0.5px",
		badge: "Трещина",
		description: "Вертикальная субмиллиметровая микротрещина эмали",
		layers: { ...def, crack: true },
	},
	{
		id: "implant",
		nameRu: "Титановый имплант Grade-5",
		badge: "Имплант",
		description: "Конический винтовой титановый имплант с абатментом",
		layers: {
			...def,
			...noCrown,
			roots: false,
			canals: false,
			pulp: false,
			implant: true,
		},
	},
	{
		id: "missing",
		nameRu: "Удаленный / Отсутствующий зуб",
		badge: "Удален (Х)",
		description: "Клинический красный крест удаления зуба из зубного ряда",
		layers: { ...def, missing: true },
	},
];
