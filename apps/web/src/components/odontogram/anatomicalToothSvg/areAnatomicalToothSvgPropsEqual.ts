/**
 * DENTE Dental CRM — Anatomical Tooth SVG Props Equality Comparator
 * Compliant with Mandate 8b (<= 120 lines).
 */

import type { AnatomicalToothSVGProps } from "./anatomicalToothSvgProps";

function areStringArraysEqual(a?: readonly string[] | string[], b?: readonly string[] | string[]): boolean {
	if (a === b) return true;
	if (!a || !b) return !a && !b;
	if (a.length !== b.length) return false;
	for (let i = 0; i < a.length; i++) {
		if (a[i] !== b[i]) return false;
	}
	return true;
}

export function areAnatomicalToothSvgPropsEqual(
	prev: AnatomicalToothSVGProps,
	next: AnatomicalToothSVGProps,
): boolean {
	if (prev.number !== next.number) return false;
	if (prev.state !== next.state) return false;
	if (prev.scale !== next.scale) return false;
	if (prev.material !== next.material) return false;
	if (prev.isPontic !== next.isPontic) return false;
	if (prev.bridgeMaterial !== next.bridgeMaterial) return false;
	if (prev.canalObturation !== next.canalObturation) return false;
	if (prev.canalObturationLevel !== next.canalObturationLevel) return false;
	if (prev.periapicalLesionSize !== next.periapicalLesionSize) return false;
	if (prev.hasFracture !== next.hasFracture) return false;
	if (prev.hasApicoectomy !== next.hasApicoectomy) return false;
	if (prev.hasPost !== next.hasPost) return false;
	if (prev.postType !== next.postType) return false;
	if (prev.boneLossLevel !== next.boneLossLevel) return false;
	if (prev.boneLossType !== next.boneLossType) return false;
	if (prev.furcation !== next.furcation) return false;
	if (prev.mobility !== next.mobility) return false;
	if (prev.gingivalRecession !== next.gingivalRecession) return false;
	if (prev.periapicalLesion !== next.periapicalLesion) return false;
	if (prev.rootResorptionStage !== next.rootResorptionStage) return false;
	if (prev.rootResorption !== next.rootResorption) return false;
	if (prev.pocketDepth !== next.pocketDepth) return false;
	if (prev.isSelected !== next.isSelected) return false;
	if (prev.pediatricMode !== next.pediatricMode) return false;
	if (prev.useSurfaces !== next.useSurfaces) return false;
	if (prev.showPulpAndCanals !== next.showPulpAndCanals) return false;
	if (prev.showPeriapicalHalos !== next.showPeriapicalHalos) return false;
	if (prev.showPeriodontalBoneLoss !== next.showPeriodontalBoneLoss) return false;

	if (!areStringArraysEqual(prev.bopSites, next.bopSites)) return false;
	if (!areStringArraysEqual(prev.suppurationSites, next.suppurationSites)) return false;
	if (!areStringArraysEqual(prev.surfaces, next.surfaces)) return false;

	return true;
}
