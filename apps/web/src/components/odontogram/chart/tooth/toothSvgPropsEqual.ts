import type { ToothSvgProps } from "../ToothSvg";

export function areSurfacesEqual(
	a?: readonly string[] | string[] | undefined,
	b?: readonly string[] | string[] | undefined,
): boolean {
	if (a === b) return true;
	if (!a || !b) return !a && !b;
	if (a.length !== b.length) return false;
	for (let i = 0; i < a.length; i++) {
		if (a[i] !== b[i]) return false;
	}
	return true;
}

export function areToothSvgPropsEqual(
	prev: ToothSvgProps,
	next: ToothSvgProps,
): boolean {
	if (prev.number !== next.number) return false;
	if (prev.state !== next.state) return false;
	if (prev.scale !== next.scale) return false;
	if (prev.material !== next.material) return false;
	if (prev.canalObturation !== next.canalObturation) return false;
	if (prev.hasPost !== next.hasPost) return false;
	if (prev.postType !== next.postType) return false;
	if (prev.boneLossLevel !== next.boneLossLevel) return false;
	if (prev.boneLossType !== next.boneLossType) return false;
	if (prev.rootResorptionStage !== next.rootResorptionStage) return false;
	if (prev.periapicalLesion !== next.periapicalLesion) return false;
	if (prev.pocketDepth !== next.pocketDepth) return false;
	if (prev.pocketDepthMm !== next.pocketDepthMm) return false;
	if (prev.maxPocketDepth !== next.maxPocketDepth) return false;
	if (prev.isSelected !== next.isSelected) return false;
	if (prev.activeStamp !== next.activeStamp) return false;
	if (prev.pediatricMode !== next.pediatricMode) return false;
	if (prev.useSurfaces !== next.useSurfaces) return false;
	if (prev.showPulpAndCanals !== next.showPulpAndCanals) return false;
	if (prev.showPeriapicalHalos !== next.showPeriapicalHalos) return false;
	if (prev.showPeriodontalBoneLoss !== next.showPeriodontalBoneLoss) return false;
	if (prev.onClick !== next.onClick) return false;
	if (prev.onQuickStateChange !== next.onQuickStateChange) return false;
	if (prev.onResorptionChange !== next.onResorptionChange) return false;
	if (!areSurfacesEqual(prev.surfaces, next.surfaces)) return false;

	if ((prev.isSelected || next.isSelected) && prev.selectedTeeth !== next.selectedTeeth) {
		const prevLen = prev.selectedTeeth?.length ?? 0;
		const nextLen = next.selectedTeeth?.length ?? 0;
		if (prevLen !== nextLen) return false;
		if (prevLen > 0) {
			for (let i = 0; i < prevLen; i++) {
				if (prev.selectedTeeth![i] !== next.selectedTeeth![i]) return false;
			}
		}
	}
	return true;
}
