import type { Tooth46PresetDef } from "./Tooth46BasePresets";
import {
	DEFAULT_TOOTH46_LAYERS,
	type ImplantStage,
	type Tooth46ClinicalPreset,
	type Tooth46LayerFlags,
} from "./tooth46Types";

const def = DEFAULT_TOOTH46_LAYERS;
const noCrown = { crown: false, cusps: false, fissures: false };

const mkImplant = (
	id: Tooth46ClinicalPreset,
	nameRu: string,
	badge: string,
	description: string,
	stage: ImplantStage,
	extra: Partial<Tooth46LayerFlags> = {},
): Tooth46PresetDef => ({
	id,
	nameRu,
	badge,
	description,
	layers: {
		...def,
		...noCrown,
		roots: false,
		canals: false,
		pulp: false,
		implant: true,
		implantStage: stage,
		...extra,
	},
});

export const TOOTH46_IMPLANT_PRESETS: readonly Tooth46PresetDef[] = [
	mkImplant(
		"implant",
		"Титановый имплант (чистый винт с заглушкой)",
		"Имплант (винт)",
		"Внутрикостный винт с плоской заглушкой cover screw на гребне",
		"pure",
	),
	mkImplant(
		"implant_healing_abutment",
		"Имплант с формирователем десны («формик»)",
		"Формирователь",
		"Полированный титановый формирователь десны с шестигранным шлицем",
		"healing_abutment",
	),
	mkImplant(
		"implant_crown",
		"Коронка на импланте (цементная фиксация)",
		"Коронка/Импл (цем)",
		"Имплант, анатомический абатмент и циркониевая коронка",
		"crown",
		{ zirconiaCrown: true, crownMaterial: "zirconia" },
	),
	mkImplant(
		"implant_crown_screw",
		"Коронка на импланте (винтовая фиксация)",
		"Коронка/Импл (винт)",
		"Винтовая фиксация со сквозной шахтой и композитной заглушкой",
		"crown_screw",
		{ zirconiaCrown: true, crownMaterial: "zirconia" },
	),
	mkImplant(
		"implant_temporary",
		"Временная коронка на импланте (PMMA)",
		"Врем/Импл PMMA",
		"Временный титановый абатмент и фрезерованная PMMA-коронка",
		"temporary",
		{ zirconiaCrown: true, crownMaterial: "pmma" },
	),
];
