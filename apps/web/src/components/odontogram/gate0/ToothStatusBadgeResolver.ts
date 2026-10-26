import { getStatusBadge, type ToothStatusBadgeInfo } from "./ToothStatusBadgeMatrix";
import type { Tooth46LayerFlags } from "./tooth46Types";

export function resolveToothStatusBadge(
	presetId?: string | undefined,
	layers?: Tooth46LayerFlags | undefined,
	toothNumber?: number | undefined,
): ToothStatusBadgeInfo {
	const isAnterior = toothNumber !== undefined && [1, 2, 3].includes(toothNumber % 10);
	if (presetId) {
		if (presetId === "caries") {
			return getStatusBadge(isAnterior ? "c3_media" : "c1_media");
		}
		return getStatusBadge(presetId);
	}
	if (!layers) return getStatusBadge("intact");

	if (layers.missing) return getStatusBadge("missing");
	if (layers.implant) {
		if (layers.implantStage === "healing_abutment") return getStatusBadge("implant_healing_abutment");
		if (layers.implantStage === "crown_screw") return getStatusBadge("implant_crown_screw");
		if (layers.implantStage === "crown") return getStatusBadge("implant_crown");
		return getStatusBadge("implant");
	}
	if (layers.rootFracture) return getStatusBadge("vertical_root_fracture");
	if (layers.rootPerforation) return getStatusBadge("root_perforation");
	if (layers.resorcinolFormalin) return getStatusBadge("resorcinol_formalin");
	if (layers.calciumHydroxide) return getStatusBadge("calcium_hydroxide");
	if (layers.canalLedge) return getStatusBadge("canal_ledge");
	if (layers.attrition) return getStatusBadge("pathological_attrition");

	if (layers.zirconiaCrown) {
		const isDef = layers.crownCondition === "defective";
		if (layers.crownMaterial === "pfm") return getStatusBadge(isDef ? "crown_pfm_defective" : "crown_pfm");
		if (layers.crownMaterial === "emax") return getStatusBadge(isDef ? "crown_emax_defective" : "crown_emax");
		if (layers.crownMaterial === "gold") return getStatusBadge(isDef ? "crown_gold_defective" : "crown_gold");
		if (layers.crownMaterial === "metal") return getStatusBadge(isDef ? "crown_metal_defective" : "crown_metal");
		if (layers.crownMaterial === "pmma") return getStatusBadge(isDef ? "crown_pmma_defective" : "crown_pmma");
		return getStatusBadge(isDef ? "crown_defective" : "crown");
	}
	if (layers.inlayOnlay === "inlay") return getStatusBadge("restoration_inlay");
	if (layers.inlayOnlay === "onlay" || layers.inlayOnlay === "overlay") return getStatusBadge("restoration_onlay");
	if (layers.composite) return getStatusBadge(layers.compositeCondition === "defective" ? "composite_defective" : "composite");
	if (layers.caries) {
		const type = layers.cariesType ?? (isAnterior ? "class3" : "class1");
		const depth = layers.cariesDepth ?? "media";
		if (type === "white_spot") return getStatusBadge("caries_white_spot");
		if (layers.cariesChronicity === "chronic" && !layers.cariesDepth) return getStatusBadge("caries_chronic");
		const prefix = type.replace("class", "c");
		const compositeKey = `${prefix}_${depth}`;
		const badge = getStatusBadge(compositeKey);
		if (badge.code !== "✓") return badge;
		return getStatusBadge(isAnterior ? "c3_media" : "c1_media");
	}
	if (layers.canalCondition === "pulpitis") return getStatusBadge("pulpitis");
	if (layers.canalCondition === "broken_file") return getStatusBadge("broken_file");
	if (layers.canalCondition === "underfill") return getStatusBadge("underfill");
	if (layers.canalCondition === "overfill") return getStatusBadge("overfill");
	if (layers.periapicalCondition === "cyst") return getStatusBadge("cyst");
	if (layers.periapicalCondition === "resorption") return getStatusBadge("resorption");
	if (layers.periapicalCondition === "granuloma" || layers.periapicalHalo) return getStatusBadge("periodontitis");
	if (layers.guttaPercha) return getStatusBadge("endodontics");
	if (layers.abfraction) return getStatusBadge("abfraction");
	if (layers.calculus) return getStatusBadge("calculus");
	if (layers.crack) return getStatusBadge("crack");

	return getStatusBadge("intact");
}
