/**
 * DENTE Dental CRM — Anatomical SVG Odontogram Props Comparator
 * Compliant with Mandate 8b (<= 120 lines).
 */

import { areToothDataEqual } from "../ToothWrapper";
import type { AnatomicalSvgOdontogramProps } from "./anatomicalSvgProps";

export function areAnatomicalSvgOdontogramPropsEqual(
	prev: AnatomicalSvgOdontogramProps,
	next: AnatomicalSvgOdontogramProps,
): boolean {
	if (prev.mobileDisplayMode !== next.mobileDisplayMode) return false;
	if (prev.pediatricMode !== next.pediatricMode) return false;
	if (prev.mixedDentition !== next.mixedDentition) return false;
	if (prev.dentitionMode !== next.dentitionMode) return false;
	if (prev.activeStamp !== next.activeStamp) return false;
	if (prev.useSurfaces !== next.useSurfaces) return false;
	if (prev.hideHeader !== next.hideHeader) return false;
	if (prev.hideLegend !== next.hideLegend) return false;
	if (prev.showWisdomTeeth !== next.showWisdomTeeth) return false;
	if (prev.showPulpAndCanals !== next.showPulpAndCanals) return false;
	if (prev.showPeriapicalHalos !== next.showPeriapicalHalos) return false;
	if (prev.showPeriodontalBoneLoss !== next.showPeriodontalBoneLoss) return false;
	if (prev.activeQuadrant !== next.activeQuadrant) return false;
	if (prev.hideQuadrantSwitcher !== next.hideQuadrantSwitcher) return false;
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

	// Compare teethData using granular areToothDataEqual
	if (prev.teethData !== next.teethData) {
		const pLen = prev.teethData?.length ?? 0;
		const nLen = next.teethData?.length ?? 0;
		if (pLen !== nLen) return false;
		if (pLen > 0 && prev.teethData && next.teethData) {
			for (let i = 0; i < pLen; i++) {
				const pt = prev.teethData[i];
				const nt = next.teethData[i];
				if (!pt || !nt || !areToothDataEqual(pt, nt)) return false;
			}
		}
	}

	// Compare globalTreatments
	if (prev.globalTreatments !== next.globalTreatments) {
		const pLen = prev.globalTreatments?.length ?? 0;
		const nLen = next.globalTreatments?.length ?? 0;
		if (pLen !== nLen) return false;
		for (let i = 0; i < pLen; i++) {
			const p = prev.globalTreatments![i];
			const n = next.globalTreatments![i];
			if (!p || !n || p.id !== n.id || p.title !== n.title || p.clinicalType !== n.clinicalType || p.status !== n.status) {
				return false;
			}
		}
	}

	return true;
}
