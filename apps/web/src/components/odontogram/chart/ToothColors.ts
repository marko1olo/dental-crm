import type { RestorativeMaterialKey } from "../anatomicalToothGeometries";
import type { ToothState } from "./toothChartTypes";
import { getFilledToothColors, getCrownToothColors } from "./colors/toothMaterialColors";
import { getPathologyToothColors } from "./colors/toothPathologyColors";

export interface ToothVisualProps {
	fill: string;
	crownFill: string;
	rootFill: string;
	stroke: string;
	opacity: string;
	isPulsing?: boolean | undefined;
	isMissing?: boolean | undefined;
	badgeColor: string;
	badgeBg: string;
	badgeText: string;
	collarFill?: string | undefined;
	canalFill?: string | undefined;
	canalGlow?: string | undefined;
}

export const getToothColors = (
	state: ToothState,
	material?: RestorativeMaterialKey,
): ToothVisualProps => {
	const stateStr = state as string;

	if (stateStr === "Filled" || stateStr === "done") {
		return getFilledToothColors(material);
	}

	if (stateStr === "Crown" || stateStr === "crown") {
		return getCrownToothColors(material);
	}

	const pathologyColors = getPathologyToothColors(stateStr);
	if (pathologyColors) {
		return pathologyColors;
	}

	return {
		fill: "url(#dente-enamel-healthy)",
		crownFill: "url(#dente-enamel-healthy)",
		rootFill: "url(#dente-root-dentin)",
		stroke: "var(--tooth-root-stroke, #94a3b8)",
		opacity: "1",
		badgeColor: "#10b981",
		badgeBg: "rgba(16, 185, 129, 0.12)",
		badgeText: "#059669",
	};
};
