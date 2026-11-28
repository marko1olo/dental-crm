import type { RestorativeMaterialKey } from "../anatomicalGeometriesTypes";
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
	idPrefix?: string,
): ToothVisualProps => {
	const stateStr = state as string;

	if (stateStr === "Filled" || stateStr === "done") {
		return getFilledToothColors(material, idPrefix);
	}

	if (stateStr === "Crown" || stateStr === "crown") {
		return getCrownToothColors(material, idPrefix);
	}

	const pathologyColors = getPathologyToothColors(stateStr, idPrefix);
	if (pathologyColors) {
		return pathologyColors;
	}

	const enamelHealthy = idPrefix ? `url(#${idPrefix}-dente-enamel-healthy)` : "url(#dente-enamel-healthy)";
	const rootDentin = idPrefix ? `url(#${idPrefix}-dente-root-dentin)` : "url(#dente-root-dentin)";

	return {
		fill: enamelHealthy,
		crownFill: enamelHealthy,
		rootFill: rootDentin,
		stroke: "var(--tooth-root-stroke, #94a3b8)",
		opacity: "1",
		badgeColor: "#10b981",
		badgeBg: "rgba(16, 185, 129, 0.12)",
		badgeText: "#059669",
	};
};
