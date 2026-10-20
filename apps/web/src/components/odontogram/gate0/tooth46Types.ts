/**
 * Layer flags & defaults for Tooth 46 Gate 0 Anatomical Odontogram
 * Mandate 8b <= 120 lines.
 */

import type {
	CanalCondition,
	CrownMaterial,
	ImplantStage,
	PeriapicalCondition,
	PostCoreType,
	RestorationCondition,
} from "./tooth46PresetTypes";

export type {
	CanalCondition,
	CrownMaterial,
	ImplantStage,
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
	composite?: boolean;
	compositeCondition?: RestorationCondition;
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
	className?: string | undefined;
	style?: React.CSSProperties | undefined;
}
