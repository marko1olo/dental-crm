import type { ToothData } from "../chart/types/toothRendererTypes";
import type { Tooth46LayerFlags } from "./tooth46Types";
import { mapCariesTypeToSurfaces } from "./gate0CariesMapper";

/**
 * Gate 0 — Tooth46LayerFlags to CRM ToothData State Extractor
 * Mandate 8b <= 120 lines.
 */
export function gate0FlagsToToothState(num: number, flags: Tooth46LayerFlags): Partial<ToothData> {
	const res: Partial<ToothData> = { toothNumber: num, state: "Healthy" };

	if (flags.missing) {
		res.state = "Missing";
	} else if (flags.implant) {
		res.state = "Implant";
		res.clinicalData = { stage: flags.implantStage ?? "pure" };
	} else if (flags.zirconiaCrown) {
		res.state = "Crown";
		res.material = flags.crownMaterial === "pfm" ? "metal_ceramic" : flags.crownMaterial === "emax" ? "ceramic" : "zirconia";
		res.clinicalData = { crownMaterial: flags.crownMaterial, condition: flags.crownCondition };
	} else if (flags.inlayOnlay) {
		res.state = "Inlay";
		res.material = "ceramic";
		res.clinicalData = { type: flags.inlayOnlay };
	} else if (flags.composite) {
		res.state = "Filled";
		res.material = "composite";
		res.clinicalData = { condition: flags.compositeCondition };
	} else if (flags.caries) {
		res.state = "Caries";
		res.surfaces = mapCariesTypeToSurfaces(flags.cariesType);
		res.clinicalData = {
			cariesType: flags.cariesType,
			cariesDepth: flags.cariesDepth,
			cariesChronicity: flags.cariesChronicity,
		};
	} else if (flags.canalCondition === "pulpitis") {
		res.state = "Pulpitis";
		res.clinicalData = { canalCondition: "pulpitis" };
	} else if (flags.periapicalHalo || flags.periapicalCondition === "granuloma" || flags.periapicalCondition === "cyst") {
		res.state = "Periodontitis";
		res.periapicalLesion = true;
		res.clinicalData = { periapicalCondition: flags.periapicalCondition };
	} else if (flags.guttaPercha || flags.canalCondition === "adequate") {
		res.state = "Root_Canal_Treated";
		res.canalObturation = "gutta_percha";
		res.clinicalData = { canalCondition: flags.canalCondition };
	} else if (flags.crown === false && flags.roots === true) {
		res.state = "Root";
	} else if (flags.calculus) {
		res.state = "Calculus";
	}

	if (flags.postCore) {
		res.hasPost = true;
		res.postType = flags.postCoreType === "cast" ? "cast" : "fiber";
	}
	if (flags.crack || flags.rootFracture) res.hasFracture = true;
	return res;
}
