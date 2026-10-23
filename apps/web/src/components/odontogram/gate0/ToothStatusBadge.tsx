import type React from "react";
import {
	getStatusBadge,
	TOOTH_STATUS_MATRIX,
	type ToothStatusBadgeInfo,
} from "./ToothStatusBadgeMatrix";
import type { Tooth46LayerFlags } from "./tooth46Types";

export type { ToothStatusBadgeInfo };
export { TOOTH_STATUS_MATRIX, getStatusBadge };

export function resolveToothStatusBadge(
	presetId?: string | undefined,
	layers?: Tooth46LayerFlags | undefined,
): ToothStatusBadgeInfo {
	if (presetId) return getStatusBadge(presetId);
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
	if (layers.composite) {
		return getStatusBadge(layers.compositeCondition === "defective" ? "composite_defective" : "composite");
	}
	if (layers.caries) {
		if (layers.cariesType === "class2_mo") return getStatusBadge("caries_class2_mo");
		if (layers.cariesType === "class2_do") return getStatusBadge("caries_class2_do");
		if (layers.cariesType === "class2_mod") return getStatusBadge("caries_class2_mod");
		if (layers.cariesType === "class5") return getStatusBadge("caries_class5");
		if (layers.cariesType === "white_spot") return getStatusBadge("caries_white_spot");
		if (layers.cariesChronicity === "chronic") return getStatusBadge("caries_chronic");
		return getStatusBadge("caries");
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

export interface ToothStatusBadgeProps {
	presetId?: string | undefined;
	layers?: Tooth46LayerFlags | undefined;
	cx?: number | undefined;
	cy?: number | undefined;
	r?: number | undefined;
}

export const ToothStatusBadge: React.FC<ToothStatusBadgeProps> = ({
	presetId,
	layers,
	cx = 50,
	cy = 160,
	r = 8.5,
}) => {
	const badge = resolveToothStatusBadge(presetId, layers);
	const len = badge.code.length;
	const fontSize = len === 1 ? r * 0.9 : len === 2 ? r * 0.74 : r * 0.58;
	const strokeWidth = Math.max(1.0, Number((r * 0.12).toFixed(1)));

	return (
		<g id="tooth46-status-badge" data-testid="tooth-status-badge" role="status">
			<title>{badge.title}</title>
			<circle
				cx={cx}
				cy={cy}
				r={r}
				fill={badge.bg}
				stroke={badge.border}
				strokeWidth={strokeWidth}
			/>
			<text
				x={cx}
				y={cy + 0.3}
				textAnchor="middle"
				dominantBaseline="central"
				fontSize={fontSize}
				fontWeight="900"
				fontFamily="system-ui, -apple-system, sans-serif"
				letterSpacing={len >= 3 ? "-0.04em" : undefined}
				fill={badge.text}
			>
				{badge.code}
			</text>
		</g>
	);
};
