/**
 * Layer flags & defaults for Tooth 46 Gate 0 Anatomical Odontogram
 * Mandate 8b <= 120 lines.
 */

import type {
	CanalCondition,
	CariesChronicity,
	CariesDepth,
	CariesType,
	CrownMaterial,
	ImplantStage,
	InlayOnlayType,
	PeriapicalCondition,
	PostCoreType,
	RestorationCondition,
} from "./tooth46PresetTypes";

export type {
	CanalCondition,
	CariesChronicity,
	CariesDepth,
	CariesType,
	CrownMaterial,
	ImplantStage,
	InlayOnlayType,
	PeriapicalCondition,
	PostCoreType,
	RestorationCondition,
	Tooth46ClinicalPreset,
} from "./tooth46PresetTypes";

export interface Tooth46LayerFlags {
	roots?: boolean;
	grooves?: boolean;
	cej?: boolean;
	crown?: boolean;
	cusps?: boolean;
	fissures?: boolean;
	pulp?: boolean;
	canals?: boolean;
	guttaPercha?: boolean;
	canalCondition?: CanalCondition;
	periapicalHalo?: boolean;
	periapicalCondition?: PeriapicalCondition;
	caries?: boolean;
	cariesType?: CariesType;
	cariesChronicity?: CariesChronicity;
	cariesDepth?: CariesDepth;
	composite?: boolean;
	compositeCondition?: RestorationCondition;
	inlayOnlay?: InlayOnlayType;
	zirconiaCrown?: boolean;
	crownMaterial?: CrownMaterial;
	crownCondition?: RestorationCondition;
	abfraction?: boolean;
	postCore?: boolean;
	postCoreType?: PostCoreType;
	calculus?: boolean;
	crack?: boolean;
	implant?: boolean;
	implantStage?: ImplantStage;
	missing?: boolean;
	resorcinolFormalin?: boolean;
	calciumHydroxide?: boolean;
	attrition?: boolean;
	rootPerforation?: boolean;
	canalLedge?: boolean;
	rootFracture?: boolean;
	showBadge?: boolean;
	statusBadge?: string;
}

export const DEFAULT_TOOTH46_LAYERS: Tooth46LayerFlags = {
	roots: true,
	grooves: true,
	cej: true,
	crown: true,
	cusps: true,
	fissures: true,
	pulp: false,
	canals: false,
	guttaPercha: false,
	canalCondition: "vital",
	periapicalHalo: false,
	periapicalCondition: "none",
	caries: false,
	cariesType: "class1",
	cariesChronicity: "acute",
	cariesDepth: "media",
	composite: false,
	compositeCondition: "adequate",
	zirconiaCrown: false,
	crownMaterial: "zirconia",
	crownCondition: "adequate",
	abfraction: false,
	postCore: false,
	postCoreType: "fiber",
	calculus: false,
	crack: false,
	implant: false,
	implantStage: "pure",
	missing: false,
};

export interface Tooth46ContainerProps {
	isDark?: boolean | undefined;
	zoom?: number | undefined;
	layers?: Tooth46LayerFlags | undefined;
	presetId?: string | undefined;
	className?: string | undefined;
	style?: React.CSSProperties | undefined;
	badgeRadius?: number | undefined;
	badgeCy?: number | undefined;
	showBadge?: boolean | undefined;
}
