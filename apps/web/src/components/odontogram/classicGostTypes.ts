/**
 * apps/web/src/components/odontogram/classicGostTypes.ts
 *
 * DENTE Dental CRM — Classic GOST Odontogram Types & Facade.
 * SSOT compliant (Mandate: <= 250 lines facade).
 * Decomposed into:
 * - ./gost/gostFormulaSymbols.ts
 * - ./gost/gostPathologyCodes.ts
 * - ./gost/gostHistoryTypes.ts
 */

import type { ToothData, ToothState } from "./ToothChart";

// Symbols, sets & traversal
export {
	type GostToothAbbreviation,
	UPPER_TEETH_ADULT,
	LOWER_TEETH_ADULT,
	ALL_ADULT_TEETH,
	UPPER_TEETH_PEDIATRIC,
	LOWER_TEETH_PEDIATRIC,
	ALL_PEDIATRIC_TEETH,
	TOP_TEETH_MIXED,
	BOTTOM_TEETH_MIXED,
	getGostAbbreviation,
	getNextFocusedTooth,
} from "./gost/gostFormulaSymbols";

// Pathology codes, descriptors & hotkeys
export {
	type GostStateDescriptor,
	GOST_TOOTH_STATES,
	GOST_ABBREVIATIONS,
	getToothStateFromHotkey,
} from "./gost/gostPathologyCodes";

// Indices (DMFT/КПУ) & record exports
export {
	type DmftCalculationResult,
	calculateDmft,
	formatOdontogramTo043ProtocolText,
} from "./gost/gostHistoryTypes";

export interface ClassicGostOdontogramProps {
	teethData: ToothData[];
	pediatricMode?: boolean | undefined;
	mixedDentition?: boolean | undefined;
	topTeeth?: number[] | undefined;
	bottomTeeth?: number[] | undefined;
	selectedTeeth?: number[] | undefined;
	activeStamp?: ToothState | null | undefined;
	onToothClick: (num: number, rect: DOMRect, surface?: string) => void;
	onQuickStateChange?: ((targets: number[], state: ToothState, surfaces?: readonly string[] | undefined) => void) | undefined;
	useSurfaces?: boolean | undefined;
	hideHeader?: boolean | undefined;
	hideLegend?: boolean | undefined;
	className?: string | undefined;
}

export function areClassicGostOdontogramPropsEqual(
	prev: ClassicGostOdontogramProps,
	next: ClassicGostOdontogramProps,
): boolean {
	if (prev.activeStamp !== next.activeStamp) return false;
	if (prev.pediatricMode !== next.pediatricMode) return false;
	if (prev.mixedDentition !== next.mixedDentition) return false;
	if (prev.useSurfaces !== next.useSurfaces) return false;
	if (prev.hideHeader !== next.hideHeader) return false;
	if (prev.hideLegend !== next.hideLegend) return false;
	if (prev.className !== next.className) return false;

	// Compare selectedTeeth array values
	if (prev.selectedTeeth !== next.selectedTeeth) {
		const prevLen = prev.selectedTeeth?.length ?? 0;
		const nextLen = next.selectedTeeth?.length ?? 0;
		if (prevLen !== nextLen) return false;
		for (let i = 0; i < prevLen; i++) {
			if (prev.selectedTeeth![i] !== next.selectedTeeth![i]) return false;
		}
	}

	// Compare topTeeth & bottomTeeth array values
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
			const pt = prev.teethData[i];
			const nt = next.teethData[i];
			if (!pt || !nt) return false;
			if (pt.toothNumber !== nt.toothNumber) return false;
			if (pt.state !== nt.state) return false;
			const prevPocket = pt.pocketDepth ?? pt.pocketDepthMm ?? pt.maxPocketDepth;
			const nextPocket = nt.pocketDepth ?? nt.pocketDepthMm ?? nt.maxPocketDepth;
			if (prevPocket !== nextPocket) return false;
			if (pt.surfaces !== nt.surfaces) {
				const pSurfsLen = pt.surfaces?.length ?? 0;
				const nSurfsLen = nt.surfaces?.length ?? 0;
				if (pSurfsLen !== nSurfsLen) return false;
				for (let s = 0; s < pSurfsLen; s++) {
					if (pt.surfaces![s] !== nt.surfaces![s]) return false;
				}
			}
			const prevCanals =
				pt.clinicalData &&
				typeof pt.clinicalData === "object" &&
				"canals" in pt.clinicalData &&
				Array.isArray((pt.clinicalData as { canals?: unknown[] }).canals)
					? (pt.clinicalData as { canals?: unknown[] }).canals!.length
					: 0;
			const nextCanals =
				nt.clinicalData &&
				typeof nt.clinicalData === "object" &&
				"canals" in nt.clinicalData &&
				Array.isArray((nt.clinicalData as { canals?: unknown[] }).canals)
					? (nt.clinicalData as { canals?: unknown[] }).canals!.length
					: 0;
			if (prevCanals !== nextCanals) return false;
		}
	}

	return true;
}
