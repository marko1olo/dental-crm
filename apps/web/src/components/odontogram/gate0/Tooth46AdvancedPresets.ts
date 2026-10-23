import type { Tooth46PresetDef } from "./Tooth46BasePresets";

/**
 * DENTE Dental CRM — 6 Advanced Clinical Pathologies (Iteration 6)
 * Resorcinol, Calcium, Attrition, Perforation, Ledge, VRF.
 * Mandate 8b <= 120 lines.
 */
export const TOOTH46_ADVANCED_PRESETS: readonly Tooth46PresetDef[] = [
	{
		id: "resorcinol_formalin",
		nameRu: "Резорцин-формалиновый («розовый зуб»)",
		badge: "Резорцин («розовый»)",
		description:
			"Диффузное красно-коричневое прокрашивание дентина коронки и корней, облитерированные каналы",
		layers: { resorcinolFormalin: true, canals: true, pulp: false },
	},
	{
		id: "calcium_hydroxide",
		nameRu: "Кальций в каналах Са(ОН)2 + Cavit",
		badge: "Кальций Ca(OH)2",
		description:
			"Плотная белая меловая паста гидроксида кальция в каналах и временная повязка в полости",
		layers: { calciumHydroxide: true, canals: true, pulp: false },
	},
	{
		id: "pathological_attrition",
		nameRu: "Патологическая стираемость (фасетки)",
		badge: "Стираемость",
		description:
			"Сошлифованные бугры окклюзии, обнаженные кратеры дентина на всех 5 буграх",
		layers: { attrition: true, cusps: false },
	},
	{
		id: "root_perforation",
		nameRu: "Перфорация дна полости в бифуркацию",
		badge: "Перфорация фуркации",
		description:
			"Дефект дна пульпарной камеры с выходом силера в межкорневую перегородку и воспалением",
		layers: { rootPerforation: true, pulp: true, canals: true },
	},
	{
		id: "canal_ledge",
		nameRu: "Ступенька в корневом канале (Ledge)",
		badge: "Ступенька Ledge",
		description:
			"Искусственный уступ в средней трети мезиального канала со смещением инструмента",
		layers: { canalLedge: true, canals: true },
	},
	{
		id: "vertical_root_fracture",
		nameRu: "Вертикальная трещина корня (VRF)",
		badge: "Трещина корня VRF",
		description:
			"Продольный перелом тела мезиального корня от шейки до верхушки с узким карманом",
		layers: { rootFracture: true, roots: true },
	},
] as const;
