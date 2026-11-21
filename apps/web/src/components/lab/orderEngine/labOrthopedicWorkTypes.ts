/**
 * labOrthopedicWorkTypes.ts — Orthopedic Work Types catalog and definitions for Dental Lab (ЗТЛ).
 * Fully aligned with Mandate 8b, 8e, 8am and @dental/shared DENTAL_LAB_CONSTRUCTIONS.
 */

import {
	DENTAL_LAB_CONSTRUCTIONS,
	type DentalLabConstructionType,
	type DentalLabConstructionDef,
} from "@dental/shared";

export type OrthopedicWorkTypeId =
	| "crown_zirconia"
	| "crown_emax"
	| "metal_ceramic"
	| "temporary_pmma"
	| "clasp_prosthesis"
	| "custom_abutment"
	| "removable_acrylic"
	| "aligners";

export interface OrthopedicWorkTypeDefinition {
	readonly id: OrthopedicWorkTypeId;
	readonly nameRu: string;
	readonly shortNameRu: string;
	readonly categoryRu: string;
	readonly descriptionRu: string;
	readonly icon: string;
	readonly defaultMaterialRu: string;
	readonly standardTurnaroundWorkingDays: number;
	readonly requiresFittingStage: boolean;
	readonly requiresStumpShade: boolean;
	readonly requiresImplantSystem: boolean;
	readonly defaultPriceKopecks: number;
	readonly defaultCostKopecks: number;
	readonly canonicalConstructionId?: DentalLabConstructionType | undefined;
	readonly canonicalDef?: DentalLabConstructionDef | undefined;
}

export const FIXED_ORTHOPEDIC_WORK_TYPES: Record<
	"crown_emax" | "crown_zirconia" | "metal_ceramic" | "temporary_pmma",
	OrthopedicWorkTypeDefinition
> = {
	crown_emax: {
		id: "crown_emax",
		nameRu: "Коронка IPS e.max Press / CAD (дисиликат лития)",
		shortNameRu: "Коронка e.max Press",
		categoryRu: "Несъемное протезирование",
		descriptionRu:
			"Высокоэстетичная цельнокерамическая реставрация из дисиликата лития с естественной опалесценцией и флюоресценцией.",
		icon: "diamond",
		defaultMaterialRu: "IPS e.max Press (Ivoclar Vivadent)",
		standardTurnaroundWorkingDays: DENTAL_LAB_CONSTRUCTIONS.crown_emax.standardTurnaroundDays,
		requiresFittingStage: true,
		requiresStumpShade: DENTAL_LAB_CONSTRUCTIONS.crown_emax.requiresStumpShade,
		requiresImplantSystem: false,
		defaultPriceKopecks: DENTAL_LAB_CONSTRUCTIONS.crown_emax.defaultPatientPriceKopecks,
		defaultCostKopecks: DENTAL_LAB_CONSTRUCTIONS.crown_emax.defaultZtlCostKopecks,
		canonicalConstructionId: "crown_emax",
		canonicalDef: DENTAL_LAB_CONSTRUCTIONS.crown_emax,
	},
	crown_zirconia: {
		id: "crown_zirconia",
		nameRu: "Коронка из диоксида циркония (Katana ML / Prettau)",
		shortNameRu: "Коронка ZrO₂ (Katana ML)",
		categoryRu: "Несъемное протезирование",
		descriptionRu:
			"Анатомическая монолитная коронка из многослойного диоксида циркония с плавным градиентом прозрачности и прочностью > 1100 МПа.",
		icon: "crown",
		defaultMaterialRu: "Katana Zirconia HTML (Kuraray Noritake)",
		standardTurnaroundWorkingDays: DENTAL_LAB_CONSTRUCTIONS.crown_zirconia.standardTurnaroundDays,
		requiresFittingStage: false,
		requiresStumpShade: DENTAL_LAB_CONSTRUCTIONS.crown_zirconia.requiresStumpShade,
		requiresImplantSystem: false,
		defaultPriceKopecks: DENTAL_LAB_CONSTRUCTIONS.crown_zirconia.defaultPatientPriceKopecks,
		defaultCostKopecks: DENTAL_LAB_CONSTRUCTIONS.crown_zirconia.defaultZtlCostKopecks,
		canonicalConstructionId: "crown_zirconia",
		canonicalDef: DENTAL_LAB_CONSTRUCTIONS.crown_zirconia,
	},
	metal_ceramic: {
		id: "metal_ceramic",
		nameRu: "Металлокерамическая коронка (Co-Cr фрезерованный / литой)",
		shortNameRu: "Металлокерамика Co-Cr",
		categoryRu: "Несъемное протезирование",
		descriptionRu:
			"Классическая металлокерамическая коронка на фрезерованном или литом кобальт-хромовом каркасе с послойной керамической облицовкой.",
		icon: "shield",
		defaultMaterialRu: "Co-Cr сплав Bego Wiron light + Noritake EX-3",
		standardTurnaroundWorkingDays: DENTAL_LAB_CONSTRUCTIONS.metal_ceramic.standardTurnaroundDays,
		requiresFittingStage: true,
		requiresStumpShade: DENTAL_LAB_CONSTRUCTIONS.metal_ceramic.requiresStumpShade,
		requiresImplantSystem: false,
		defaultPriceKopecks: DENTAL_LAB_CONSTRUCTIONS.metal_ceramic.defaultPatientPriceKopecks,
		defaultCostKopecks: DENTAL_LAB_CONSTRUCTIONS.metal_ceramic.defaultZtlCostKopecks,
		canonicalConstructionId: "metal_ceramic",
		canonicalDef: DENTAL_LAB_CONSTRUCTIONS.metal_ceramic,
	},
	temporary_pmma: {
		id: "temporary_pmma",
		nameRu: "Временная пластмассовая коронка PMMA (фрезерованная / 3D печать)",
		shortNameRu: "Временная PMMA",
		categoryRu: "Временное протезирование",
		descriptionRu:
			"Высокоточная провизорная коронка из фрезерованного PMMA CAD/CAM или биосовместимого 3D-фотополимера для защиты препарированного зуба.",
		icon: "clock",
		defaultMaterialRu: "PMMA CAD/CAM фрезерованная / NextDent C&B",
		standardTurnaroundWorkingDays: 2,
		requiresFittingStage: false,
		requiresStumpShade: false,
		requiresImplantSystem: false,
		defaultPriceKopecks: 250000,
		defaultCostKopecks: 80000,
	},
};

export const REMOVABLE_ORTHOPEDIC_WORK_TYPES: Record<
	"clasp_prosthesis" | "removable_acrylic" | "custom_abutment" | "aligners",
	OrthopedicWorkTypeDefinition
> = {
	clasp_prosthesis: {
		id: "clasp_prosthesis",
		nameRu: "Бюгельный протез с замковой фиксацией Bredent / кламмерами",
		shortNameRu: "Бюгельный протез Bredent",
		categoryRu: "Съемное протезирование",
		descriptionRu:
			"Дуговой цельнолитой протез на Co-Cr каркасе с микрозамками Bredent VKS-SG или опорно-удерживающими кламмерами и гарнитурными зубами.",
		icon: "tooth",
		defaultMaterialRu: "Co-Cr дуга BEGO + замки Bredent VKS + Ivoclar Vivodent",
		standardTurnaroundWorkingDays: DENTAL_LAB_CONSTRUCTIONS.clasp_denture.standardTurnaroundDays,
		requiresFittingStage: true,
		requiresStumpShade: false,
		requiresImplantSystem: false,
		defaultPriceKopecks: DENTAL_LAB_CONSTRUCTIONS.clasp_denture.defaultPatientPriceKopecks,
		defaultCostKopecks: DENTAL_LAB_CONSTRUCTIONS.clasp_denture.defaultZtlCostKopecks,
		canonicalConstructionId: "clasp_denture",
		canonicalDef: DENTAL_LAB_CONSTRUCTIONS.clasp_denture,
	},
	removable_acrylic: {
		id: "removable_acrylic",
		nameRu: "Съемный пластиночный протез (Acry-Free / Ивокрил)",
		shortNameRu: "Съемный акриловый протез",
		categoryRu: "Съемное протезирование",
		descriptionRu:
			"Полный или частичный съемный протез из безаллергенного термопласта Acry-Free или горячеполимеризуемой акриловой пластмассы.",
		icon: "clamp",
		defaultMaterialRu: "Термопласт Acry-Free / Акрил Vertex Rapid Simplified",
		standardTurnaroundWorkingDays: 8,
		requiresFittingStage: true,
		requiresStumpShade: false,
		requiresImplantSystem: false,
		defaultPriceKopecks: 3200000,
		defaultCostKopecks: 1100000,
	},
	custom_abutment: {
		id: "custom_abutment",
		nameRu: "Индивидуальный абатмент (Ti-Base / ZrO₂) + коронка",
		shortNameRu: "Индивидуальный абатмент + коронка",
		categoryRu: "Протезирование на имплантатах",
		descriptionRu:
			"Фрезерованный индивидуальный титановый или циркониевый абатмент с винтовой фиксацией на дентальный имплантат и циркониевой коронкой.",
		icon: "bolt",
		defaultMaterialRu: "Титан Grade 5 ELI + ZrO₂ Katana ML (Medentika / Straumann)",
		standardTurnaroundWorkingDays: 7,
		requiresFittingStage: true,
		requiresStumpShade: false,
		requiresImplantSystem: true,
		defaultPriceKopecks: 3800000,
		defaultCostKopecks: 1300000,
	},
	aligners: {
		id: "aligners",
		nameRu: "Элайнеры / Ортодонтические каппы / Сплинты",
		shortNameRu: "Элайнеры / Сплинт-каппа",
		categoryRu: "Ортодонтия и сплинты",
		descriptionRu:
			"Серия прозрачных биосовместимых капп толщиной 0.75 мм из многослойного полиэтилентерефталата (PET-G) для перемещения зубов или окклюзионной терапии.",
		icon: "Target",
		defaultMaterialRu: "Биосовместимый полимер Duran / Zendura FLX (3D-печать моделей)",
		standardTurnaroundWorkingDays: DENTAL_LAB_CONSTRUCTIONS.aligner_splint.standardTurnaroundDays,
		requiresFittingStage: false,
		requiresStumpShade: false,
		requiresImplantSystem: false,
		defaultPriceKopecks: DENTAL_LAB_CONSTRUCTIONS.aligner_splint.defaultPatientPriceKopecks,
		defaultCostKopecks: DENTAL_LAB_CONSTRUCTIONS.aligner_splint.defaultZtlCostKopecks,
		canonicalConstructionId: "aligner_splint",
		canonicalDef: DENTAL_LAB_CONSTRUCTIONS.aligner_splint,
	},
};

export const ORTHOPEDIC_WORK_TYPES: Record<OrthopedicWorkTypeId, OrthopedicWorkTypeDefinition> = {
	...FIXED_ORTHOPEDIC_WORK_TYPES,
	...REMOVABLE_ORTHOPEDIC_WORK_TYPES,
};

export const ORDERED_MARKET_ORTHOPEDIC_TYPES: readonly OrthopedicWorkTypeId[] = [
	"crown_zirconia",
	"crown_emax",
	"metal_ceramic",
	"temporary_pmma",
	"clasp_prosthesis",
	"custom_abutment",
	"removable_acrylic",
	"aligners",
] as const;

export function getCanonicalLabConstruction(typeId: OrthopedicWorkTypeId) {
	const item = ORTHOPEDIC_WORK_TYPES[typeId];
	if (!item?.canonicalConstructionId) return null;
	return DENTAL_LAB_CONSTRUCTIONS[item.canonicalConstructionId] ?? null;
}

export { DENTAL_LAB_CONSTRUCTIONS };
