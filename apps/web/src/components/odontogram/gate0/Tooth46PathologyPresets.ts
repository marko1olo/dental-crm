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
		nameRu: "Стекловолоконный штифт (СВШ)",
		badge: "СВШ Штифт",
		description: "Стекловолоконный штифт в дистальном канале с культей",
		layers: { ...def, ...noCrown, canals: true, guttaPercha: true, postCore: true, postCoreType: "fiber" },
	},
	{
		id: "postCore_cast",
		nameRu: "Литая культевая вкладка (КШВ)",
		badge: "КШВ Металл",
		description: "Цельнолитая анатомическая металлическая вкладка",
		layers: { ...def, ...noCrown, canals: true, guttaPercha: true, postCore: true, postCoreType: "cast" },
	},
	{
		id: "underfill",
		nameRu: "Недопломбировка каналов (-3мм)",
		badge: "Недопломб.",
		description: "Гуттаперча обрывается выше верхушки, пустой апекс",
		layers: { ...def, pulp: true, canals: true, guttaPercha: true, caries: false, canalCondition: "underfill" },
	},
	{
		id: "overfill",
		nameRu: "Гиперпломбировка (выведение силера)",
		badge: "Выведение",
		description: "Выведение материала за апекс в периодонт",
		layers: { ...def, pulp: true, canals: true, guttaPercha: true, caries: false, canalCondition: "overfill" },
	},
	{
		id: "broken_file",
		nameRu: "Обломок инструмента в MB канале",
		badge: "Обломок файла",
		description: "Фрагмент спирального NiTi-файла в MB канале",
		layers: { ...def, pulp: true, canals: true, caries: false, canalCondition: "broken_file" },
	},
	{
		id: "cyst",
		nameRu: "Радикулярная киста",
		badge: "Киста",
		description: "Периапикальная полость с четким кортикальным ободком",
		layers: { ...def, pulp: true, canals: true, periapicalHalo: true, periapicalCondition: "cyst", caries: false, canalCondition: "necrotic" },
	},
	{
		id: "resorption",
		nameRu: "Апикальная резорбция корня",
		badge: "Резорбция",
		description: "Укорочение и фестончатое сглаживание верхушки корня",
		layers: { ...def, pulp: true, canals: true, periapicalHalo: true, periapicalCondition: "resorption", caries: false, canalCondition: "necrotic" },
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
		layers: { ...def, ...noCrown, roots: false, canals: false, pulp: false, implant: true },
	},
	{
		id: "missing",
		nameRu: "Удаленный / Отсутствующий зуб",
		badge: "Удален (Х)",
		description: "Клинический красный крест удаления зуба из зубного ряда",
		layers: { ...def, missing: true },
	},
];
