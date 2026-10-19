import type { Tooth46PresetDef } from "./Tooth46BasePresets";
import { DEFAULT_TOOTH46_LAYERS } from "./tooth46Types";

const def = DEFAULT_TOOTH46_LAYERS;
const noCrown = { crown: false, cusps: false, fissures: false };

export const PATHOLOGY_PART1: readonly Tooth46PresetDef[] = [
	{
		id: "abfraction",
		nameRu: "Клиновидный дефект (Abfraction)",
		badge: "Клин. дефект",
		description: "V-образная цервикальная убыль эмали у десневого края CEJ",
		layers: { ...def, abfraction: true },
	},
	{
		id: "postCore",
		nameRu: "Стекловолоконный штифт (СВШ)",
		badge: "СВШ Штифт",
		description: "Стекловолоконный штифт в дистальном канале с культей",
		layers: {
			...def,
			...noCrown,
			canals: true,
			guttaPercha: true,
			postCore: true,
			postCoreType: "fiber",
		},
	},
	{
		id: "postCore_cast",
		nameRu: "Литая культевая вкладка (КШВ)",
		badge: "КШВ Металл",
		description: "Цельнолитая анатомическая металлическая вкладка",
		layers: {
			...def,
			...noCrown,
			canals: true,
			guttaPercha: true,
			postCore: true,
			postCoreType: "cast",
		},
	},
	{
		id: "underfill",
		nameRu: "Недопломбировка каналов (-3мм)",
		badge: "Недопломб.",
		description: "Гуттаперча обрывается выше верхушки, пустой апекс",
		layers: {
			...def,
			pulp: true,
			canals: true,
			guttaPercha: true,
			caries: false,
			canalCondition: "underfill",
		},
	},
	{
		id: "overfill",
		nameRu: "Гиперпломбировка (выведение силера)",
		badge: "Выведение",
		description: "Выведение материала за апекс в периодонт",
		layers: {
			...def,
			pulp: true,
			canals: true,
			guttaPercha: true,
			caries: false,
			canalCondition: "overfill",
		},
	},
	{
		id: "broken_file",
		nameRu: "Обломок инструмента в MB канале",
		badge: "Обломок файла",
		description: "Фрагмент спирального NiTi-файла в MB канале",
		layers: {
			...def,
			pulp: true,
			canals: true,
			caries: false,
			canalCondition: "broken_file",
		},
	},
];
