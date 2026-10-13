import type React from "react";

export function computeViewerImageStyle(
	s?: any,
	isPanActive = false,
	overrideStyle?: React.CSSProperties,
): React.CSSProperties {
	if (overrideStyle) return overrideStyle;
	const filters: string[] = [];
	if (typeof s?.brightness === "number" && s.brightness !== 1) {
		filters.push(`brightness(${s.brightness})`);
	}
	if (typeof s?.contrast === "number" && s.contrast !== 1) {
		filters.push(`contrast(${s.contrast})`);
	}
	if (s?.inverted) {
		filters.push("invert(1)");
	}
	const transforms: string[] = [];
	const panX = s?.pan?.x ?? 0;
	const panY = s?.pan?.y ?? 0;
	if (panX !== 0 || panY !== 0) {
		transforms.push(`translate(${panX}px, ${panY}px)`);
	}
	if (typeof s?.zoom === "number" && s.zoom !== 1) {
		transforms.push(`scale(${s.zoom})`);
	}
	if (typeof s?.rotationDeg === "number" && s.rotationDeg !== 0) {
		transforms.push(`rotate(${s.rotationDeg}deg)`);
	}
	if (s?.flipHorizontal) {
		transforms.push("scaleX(-1)");
	}
	return {
		filter: filters.length > 0 ? filters.join(" ") : "none",
		transform: transforms.length > 0 ? transforms.join(" ") : "none",
		transition: isPanActive ? "none" : "transform 0.12s ease-out, filter 0.12s ease-out",
	};
}
