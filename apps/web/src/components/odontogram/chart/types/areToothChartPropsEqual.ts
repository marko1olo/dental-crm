import type { ToothChartProps } from "./toothRendererTypes";
import { areSurfacesEqual } from "./toothSurfaceTypes";

export function areToothChartPropsEqual(
	prev: ToothChartProps,
	next: ToothChartProps,
): boolean {
	if (prev.patientId !== next.patientId) return false;
	if (prev.pediatricMode !== next.pediatricMode) return false;
	if (prev.mixedDentition !== next.mixedDentition) return false;
	if (prev.dentitionMode !== next.dentitionMode) return false;
	if (prev.activeStamp !== next.activeStamp) return false;
	if (prev.useSurfaces !== next.useSurfaces) return false;
	if (prev.hideHeader !== next.hideHeader) return false;
	if (prev.hideLegend !== next.hideLegend) return false;
	if (prev.hideQuadrantSwitcher !== next.hideQuadrantSwitcher) return false;
	if (prev.hideDentitionSwitcher !== next.hideDentitionSwitcher) return false;
	if (prev.showPulpAndCanals !== next.showPulpAndCanals) return false;
	if (prev.showPeriapicalHalos !== next.showPeriapicalHalos) return false;
	if (prev.showPeriodontalBoneLoss !== next.showPeriodontalBoneLoss) return false;
	if (prev.activeQuadrant !== next.activeQuadrant) return false;
	if (prev.hideExpressActions !== next.hideExpressActions) return false;
	if (prev.className !== next.className) return false;

	// Compare selectedTeeth array
	if (prev.selectedTeeth !== next.selectedTeeth) {
		const prevLen = prev.selectedTeeth?.length ?? 0;
		const nextLen = next.selectedTeeth?.length ?? 0;
		if (prevLen !== nextLen) return false;
		for (let i = 0; i < prevLen; i++) {
			if (prev.selectedTeeth![i] !== next.selectedTeeth![i]) return false;
		}
	}

	// Compare topTeeth & bottomTeeth
	if (prev.topTeeth !== next.topTeeth) {
		const pLen = prev.topTeeth?.length ?? 0;
		const nLen = next.topTeeth?.length ?? 0;
		if (pLen !== nLen) return false;
		for (let i = 0; i < pLen; i++) {
			if (prev.topTeeth![i] !== next.topTeeth![i]) return false;
		}
	}
	if (prev.bottomTeeth !== next.bottomTeeth) {
		const pLen = prev.bottomTeeth?.length ?? 0;
		const nLen = next.bottomTeeth?.length ?? 0;
		if (pLen !== nLen) return false;
		for (let i = 0; i < pLen; i++) {
			if (prev.bottomTeeth![i] !== next.bottomTeeth![i]) return false;
		}
	}

	// Compare teethData
	if (prev.teethData !== next.teethData) {
		const pLen = prev.teethData?.length ?? 0;
		const nLen = next.teethData?.length ?? 0;
		if (pLen !== nLen) return false;
		for (let i = 0; i < pLen; i++) {
			const pt = prev.teethData?.[i];
			const nt = next.teethData?.[i];
			if (!pt || !nt) return false;
			if (pt.toothNumber !== nt.toothNumber) return false;
			if (pt.state !== nt.state) return false;
			if (pt.updatedAt !== nt.updatedAt) return false;
			if (pt.material !== nt.material) return false;
			if (pt.canalObturation !== nt.canalObturation) return false;
			if (pt.hasPost !== nt.hasPost) return false;
			if (pt.postType !== nt.postType) return false;
			if (pt.boneLossLevel !== nt.boneLossLevel) return false;
			if (pt.boneLossType !== nt.boneLossType) return false;
			if ((pt.rootResorptionStage ?? pt.rootResorption) !== (nt.rootResorptionStage ?? nt.rootResorption)) return false;
			if (pt.periapicalLesion !== nt.periapicalLesion) return false;
			const pDepth = pt.pocketDepth ?? pt.pocketDepthMm ?? pt.maxPocketDepth;
			const nDepth = nt.pocketDepth ?? nt.pocketDepthMm ?? nt.maxPocketDepth;
			if (pDepth !== nDepth) return false;
			if (!areSurfacesEqual(pt.surfaces, nt.surfaces)) return false;
		}
	}

	return true;
}
