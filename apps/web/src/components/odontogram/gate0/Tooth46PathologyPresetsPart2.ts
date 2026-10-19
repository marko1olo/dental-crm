import type { Tooth46PresetDef } from "./Tooth46BasePresets";
import { DEFAULT_TOOTH46_LAYERS } from "./tooth46Types";

const def = DEFAULT_TOOTH46_LAYERS;
const noCrown = { crown: false, cusps: false, fissures: false };

export const PATHOLOGY_PART2: readonly Tooth46PresetDef[] = [
	{
		id: "cyst",
		nameRu: "Радикулярная киста",
		badge: "Киста",
		description: "Периапикальная полость с четким кортикальным ободком",
		layers: {
			...def,
			pulp: true,
			canals: true,
			periapicalHalo: true,
			periapicalCondition: "cyst",
			caries: false,
			canalCondition: "necrotic",
		},
	},
	{
		id: "resorption",
		nameRu: "Апикальная резорбция корня",
		badge: "Резорбция",
		description: "Укорочение и фестончатое сглаживание верхушки корня",
		layers: {
			...def,
			pulp: true,
			canals: true,
			periapicalHalo: true,
			periapicalCondition: "resorption",
			caries: false,
			canalCondition: "necrotic",
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
