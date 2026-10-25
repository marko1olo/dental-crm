import type { ToothData, ToothState } from "../ToothChart";

export interface ClassicGostToothCellProps {
	readonly toothNumber: number;
	readonly isUpper: boolean;
	readonly tooth?: ToothData | undefined;
	readonly isSelected: boolean;
	readonly selectedTeeth: readonly number[];
	readonly activeStamp?: ToothState | null | undefined;
	readonly onToothClick?: ((toothNumber: number, rect?: DOMRect, surface?: string) => void) | undefined;
	readonly onQuickStateChange?: ((targets: number[], state: ToothState, surfaces?: readonly string[]) => void) | undefined;
	readonly useSurfaces?: boolean | undefined;
	readonly pediatricMode?: boolean | undefined;
}

export function areGostToothCellPropsEqual(
	prev: ClassicGostToothCellProps,
	next: ClassicGostToothCellProps,
): boolean {
	if (prev.toothNumber !== next.toothNumber) return false;
	if (prev.isUpper !== next.isUpper) return false;
	if (prev.isSelected !== next.isSelected) return false;
	if (prev.activeStamp !== next.activeStamp) return false;
	if (prev.useSurfaces !== next.useSurfaces) return false;
	if (prev.pediatricMode !== next.pediatricMode) return false;
	if (prev.onToothClick !== next.onToothClick) return false;
	if (prev.onQuickStateChange !== next.onQuickStateChange) return false;

	const prevTooth = prev.tooth;
	const nextTooth = next.tooth;
	if (prevTooth !== nextTooth) {
		if (!prevTooth || !nextTooth) return false;
		if (prevTooth.state !== nextTooth.state) return false;
		const prevPocket = prevTooth.pocketDepth ?? prevTooth.pocketDepthMm ?? prevTooth.maxPocketDepth;
		const nextPocket = nextTooth.pocketDepth ?? nextTooth.pocketDepthMm ?? nextTooth.maxPocketDepth;
		if (prevPocket !== nextPocket) return false;
		const prevSurfaces = prevTooth.surfaces;
		const nextSurfaces = nextTooth.surfaces;
		if (prevSurfaces !== nextSurfaces) {
			const pLen = prevSurfaces?.length ?? 0;
			const nLen = nextSurfaces?.length ?? 0;
			if (pLen !== nLen) return false;
			for (let i = 0; i < pLen; i++) {
				if (prevSurfaces![i] !== nextSurfaces![i]) return false;
			}
		}
		const prevCanals =
			prevTooth.clinicalData &&
			typeof prevTooth.clinicalData === "object" &&
			"canals" in prevTooth.clinicalData &&
			Array.isArray((prevTooth.clinicalData as { canals?: unknown[] }).canals)
				? (prevTooth.clinicalData as { canals?: unknown[] }).canals!.length
				: 0;
		const nextCanals =
			nextTooth.clinicalData &&
			typeof nextTooth.clinicalData === "object" &&
			"canals" in nextTooth.clinicalData &&
			Array.isArray((nextTooth.clinicalData as { canals?: unknown[] }).canals)
				? (nextTooth.clinicalData as { canals?: unknown[] }).canals!.length
				: 0;
		if (prevCanals !== nextCanals) return false;
	}

	if (
		(prev.isSelected || next.isSelected) &&
		prev.selectedTeeth !== next.selectedTeeth
	) {
		const prevLen = prev.selectedTeeth?.length ?? 0;
		const nextLen = next.selectedTeeth?.length ?? 0;
		if (prevLen !== nextLen) return false;
		for (let i = 0; i < prevLen; i++) {
			if (prev.selectedTeeth[i] !== next.selectedTeeth[i]) return false;
		}
	}
	return true;
}
