import type { ToothData } from "../chart/types/toothRendererTypes";
import type { ToothState } from "../chart/types/toothStateUnion";
import { DEFAULT_TOOTH46_LAYERS, type Tooth46LayerFlags } from "./tooth46Types";
import {
	applyAuxiliaryOverlays,
	mapClinicalDataToCariesDepth,
	mapRestorativeToCrownMaterial,
	mapSurfacesToCariesType,
} from "./gate0CariesMapper";

export function toothDataToGate0Flags(tooth: ToothData): Tooth46LayerFlags {
	const flags: Tooth46LayerFlags = { ...DEFAULT_TOOTH46_LAYERS };
	const state = tooth.state;
	const clin = (tooth.clinicalData ?? {}) as Record<string, unknown>;

	switch (state) {
		case "Caries":
		case "caries":
			flags.caries = true;
			flags.cariesType = mapSurfacesToCariesType(tooth.toothNumber, tooth.surfaces, (clin.cariesType as string) ?? null);
			flags.cariesDepth = mapClinicalDataToCariesDepth(clin);
			flags.cariesChronicity = clin.chronicity === "chronic" ? "chronic" : "acute";
			break;
		case "Filled":
		case "filled":
		case "Filling" as ToothState:
			if (tooth.material === "inlay" || clin.type === "inlay") flags.inlayOnlay = "inlay";
			else if (tooth.material === "onlay" || clin.type === "onlay") flags.inlayOnlay = "onlay";
			else {
				flags.composite = true;
				flags.compositeCondition = clin.condition === "defective" || clin.defective ? "defective" : "adequate";
			}
			break;
		case "Crown":
		case "crown":
		case "Planned_Crown":
		case "Temporary_Crown":
			flags.zirconiaCrown = true;
			flags.crown = false;
			flags.cusps = false;
			flags.fissures = false;
			flags.crownCondition = clin.condition === "defective" || clin.defective ? "defective" : "adequate";
			flags.crownMaterial = state === "Temporary_Crown" ? "pmma" : mapRestorativeToCrownMaterial(tooth.material);
			break;
		case "Implant":
		case "implant":
		case "Planned_Implant":
			flags.implant = true;
			flags.roots = false;
			flags.implantStage = (clin.stage as Tooth46LayerFlags["implantStage"]) ?? "crown";
			break;
		case "Missing":
		case "missing":
		case "Extracted":
			flags.missing = true;
			break;
		case "Pulpitis":
		case "pulpitis":
			flags.pulp = true;
			flags.canals = true;
			flags.canalCondition = "pulpitis";
			break;
		case "Periodontitis":
		case "periodontitis":
		case "Periodontitis_Mild":
		case "Periodontitis_Moderate":
		case "Periodontitis_Severe":
			flags.pulp = true;
			flags.canals = true;
			flags.periapicalHalo = true;
			flags.periapicalCondition = "granuloma";
			flags.canalCondition = "necrotic";
			break;
		case "Root_Canal_Treated":
			flags.pulp = true;
			flags.canals = true;
			flags.guttaPercha = true;
			flags.canalCondition = "adequate";
			break;
		case "Root":
		case "root":
			flags.crown = false;
			flags.cusps = false;
			flags.fissures = false;
			flags.roots = true;
			break;
		case "Calculus":
		case "calculus":
			flags.calculus = true;
			break;
		default:
			break;
	}

	applyAuxiliaryOverlays(flags, tooth, clin);
	return flags;
}
