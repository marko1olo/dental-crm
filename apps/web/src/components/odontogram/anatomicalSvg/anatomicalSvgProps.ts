/**
 * DENTE Dental CRM — Anatomical SVG Odontogram Props Interface
 * Compliant with Mandate 8b (<= 120 lines).
 */

import type { OdontogramQuadrantId, ToothData, ToothState } from "../ToothChart";
import type { GlobalTreatmentItem } from "../GlobalTreatmentsStrip";

export interface AnatomicalSvgOdontogramProps {
	teethData?: ToothData[] | undefined;
	pediatricMode?: boolean | undefined;
	mixedDentition?: boolean | undefined;
	topTeeth?: number[] | undefined;
	bottomTeeth?: number[] | undefined;
	selectedTeeth?: number[] | undefined;
	activeStamp?: ToothState | null | undefined;
	onToothClick: (num: number, rect: DOMRect, surface?: string | undefined) => void;
	onQuickStateChange?: ((targets: number[], state: ToothState, surfaces?: readonly string[] | undefined) => void) | undefined;
	useSurfaces?: boolean | undefined;
	hideHeader?: boolean | undefined;
	hideLegend?: boolean | undefined;
	showWisdomTeeth?: boolean | undefined;
	showPulpAndCanals?: boolean | undefined;
	showPeriapicalHalos?: boolean | undefined;
	showPeriodontalBoneLoss?: boolean | undefined;
	activeQuadrant?: OdontogramQuadrantId | undefined;
	onQuadrantChange?: ((quadrant: OdontogramQuadrantId) => void) | undefined;
	hideQuadrantSwitcher?: boolean | undefined;
	dentitionMode?: "adult" | "pediatric" | "mixed" | undefined;
	globalTreatments?: GlobalTreatmentItem[] | undefined;
	onGlobalTreatmentsChange?: ((items: GlobalTreatmentItem[]) => void) | undefined;
	className?: string | undefined;
	mobileDisplayMode?: "quadrant" | "carousel" | undefined;
	onToggleMobileDisplayMode?: ((mode: "quadrant" | "carousel") => void) | undefined;
}
