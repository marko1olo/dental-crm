import type React from "react";
import {
	TOOTH_STATUS_MATRIX,
	type ToothStatusBadgeInfo,
} from "./ToothStatusBadgeMatrix";
import type { Tooth46LayerFlags } from "./tooth46Types";

export type { ToothStatusBadgeInfo } from "./ToothStatusBadgeMatrix";
export { TOOTH_STATUS_MATRIX } from "./ToothStatusBadgeMatrix";

export function resolveToothStatusBadge(
	presetId?: string | undefined,
	layers?: Tooth46LayerFlags | undefined,
): ToothStatusBadgeInfo {
	if (presetId && TOOTH_STATUS_MATRIX[presetId]) {
		return TOOTH_STATUS_MATRIX[presetId];
	}
	if (!layers) return TOOTH_STATUS_MATRIX.intact;

	// Hierarchical layer evaluation if custom layers
	if (layers.missing) return TOOTH_STATUS_MATRIX.missing;
	if (layers.implant) {
		if (layers.implantStage === "healing_abutment") return TOOTH_STATUS_MATRIX.implant_healing_abutment;
		if (layers.implantStage === "crown_screw") return TOOTH_STATUS_MATRIX.implant_crown_screw;
		if (layers.implantStage === "crown") return TOOTH_STATUS_MATRIX.implant_crown;
		return TOOTH_STATUS_MATRIX.implant;
	}
	if (layers.verticalRootFracture ?? layers.rootFracture) return TOOTH_STATUS_MATRIX.vertical_root_fracture;
	if (layers.rootPerforation) return TOOTH_STATUS_MATRIX.root_perforation;
	if (layers.resorcinolFormalin) return TOOTH_STATUS_MATRIX.resorcinol_formalin;
	if (layers.calciumHydroxide) return TOOTH_STATUS_MATRIX.calcium_hydroxide;
	if (layers.canalLedge) return TOOTH_STATUS_MATRIX.canal_ledge;
	if (layers.attrition) return TOOTH_STATUS_MATRIX.pathological_attrition;

	if (layers.zirconiaCrown) {
		const isDef = layers.crownCondition === "defective";
		if (layers.crownMaterial === "pfm") return isDef ? TOOTH_STATUS_MATRIX.crown_pfm_defective : TOOTH_STATUS_MATRIX.crown_pfm;
		if (layers.crownMaterial === "emax") return isDef ? TOOTH_STATUS_MATRIX.crown_emax_defective : TOOTH_STATUS_MATRIX.crown_emax;
		if (layers.crownMaterial === "gold") return isDef ? TOOTH_STATUS_MATRIX.crown_gold_defective : TOOTH_STATUS_MATRIX.crown_gold;
		if (layers.crownMaterial === "metal") return isDef ? TOOTH_STATUS_MATRIX.crown_metal_defective : TOOTH_STATUS_MATRIX.crown_metal;
		if (layers.crownMaterial === "pmma") return isDef ? TOOTH_STATUS_MATRIX.crown_pmma_defective : TOOTH_STATUS_MATRIX.crown_pmma;
		return isDef ? TOOTH_STATUS_MATRIX.crown_defective : TOOTH_STATUS_MATRIX.crown;
	}
	if (layers.inlayOnlay === "inlay") return TOOTH_STATUS_MATRIX.restoration_inlay;
	if (layers.inlayOnlay === "onlay" || layers.inlayOnlay === "overlay") return TOOTH_STATUS_MATRIX.restoration_onlay;
	if (layers.composite) {
		return layers.compositeCondition === "defective"
			? TOOTH_STATUS_MATRIX.composite_defective
			: TOOTH_STATUS_MATRIX.composite;
	}
	if (layers.caries) {
		if (layers.cariesType === "class2_mo") return TOOTH_STATUS_MATRIX.caries_class2_mo;
		if (layers.cariesType === "class2_do") return TOOTH_STATUS_MATRIX.caries_class2_do;
		if (layers.cariesType === "class2_mod") return TOOTH_STATUS_MATRIX.caries_class2_mod;
		if (layers.cariesType === "class5") return TOOTH_STATUS_MATRIX.caries_class5;
		if (layers.cariesType === "white_spot") return TOOTH_STATUS_MATRIX.caries_white_spot;
		if (layers.cariesChronicity === "chronic") return TOOTH_STATUS_MATRIX.caries_chronic;
		return TOOTH_STATUS_MATRIX.caries;
	}
	if (layers.canalCondition === "pulpitis") return TOOTH_STATUS_MATRIX.pulpitis;
	if (layers.canalCondition === "broken_file") return TOOTH_STATUS_MATRIX.broken_file;
	if (layers.canalCondition === "underfill") return TOOTH_STATUS_MATRIX.underfill;
	if (layers.canalCondition === "overfill") return TOOTH_STATUS_MATRIX.overfill;
	if (layers.periapicalCondition === "cyst") return TOOTH_STATUS_MATRIX.cyst;
	if (layers.periapicalCondition === "resorption") return TOOTH_STATUS_MATRIX.resorption;
	if (layers.periapicalCondition === "granuloma" || layers.periapicalHalo) return TOOTH_STATUS_MATRIX.periodontitis;
	if (layers.guttaPercha) return TOOTH_STATUS_MATRIX.endodontics;
	if (layers.abfraction) return TOOTH_STATUS_MATRIX.abfraction;
	if (layers.calculus) return TOOTH_STATUS_MATRIX.calculus;
	if (layers.crack) return TOOTH_STATUS_MATRIX.crack;

	return TOOTH_STATUS_MATRIX.intact;
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
	const fontSize = len === 1 ? 7.6 : len === 2 ? 6.2 : 5.0;

	return (
		<g id="tooth46-status-badge" data-testid="tooth-status-badge" role="status">
			<title>{badge.title}</title>
			<circle
				cx={cx}
				cy={cy}
				r={r}
				fill={badge.bg}
				stroke={badge.border}
				strokeWidth="1.2"
			/>
			<text
				x={cx}
				y={cy + 0.3}
				textAnchor="middle"
				dominantBaseline="central"
				fontSize={fontSize}
				fontWeight="bold"
				fontFamily="system-ui, -apple-system, sans-serif"
				fill={badge.text}
			>
				{badge.code}
			</text>
		</g>
	);
};
