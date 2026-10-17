import type React from "react";
import type { XrayFilterMode } from "../CephalometricHudStrip";

export function getXrayFilterStyle(
	brightness: number,
	contrast: number,
	filterMode: XrayFilterMode,
): React.CSSProperties {
	let filterString = `brightness(${brightness}%) contrast(${contrast}%)`;
	if (filterMode === "invert") {
		filterString += " invert(100%)";
	} else if (filterMode === "bone") {
		filterString += " contrast(180%) brightness(110%) saturate(75%)";
	} else if (filterMode === "edge") {
		filterString += " contrast(220%) grayscale(100%) invert(100%)";
	}
	return {
		filter: filterString,
		transition: "filter 0.2s ease",
	};
}
