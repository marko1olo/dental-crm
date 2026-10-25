import { useState } from "react";
import type { XrayFilterMode } from "../CephalometricCanvas";

export function useCephDisplaySettings(initialScaleMmPerPixel?: number) {
	const [filterMode, setFilterMode] = useState<XrayFilterMode>("normal");
	const [brightness, setBrightness] = useState<number>(100);
	const [contrast, setContrast] = useState<number>(100);
	const [showPolygon, setShowPolygon] = useState<boolean>(true);
	const [showPlanes, setShowPlanes] = useState<boolean>(true);
	const [showLabels, setShowLabels] = useState<boolean>(true);
	const [scaleMmPerPixel, setScaleMmPerPixel] = useState<number>(() => initialScaleMmPerPixel ?? 0.15);

	return {
		filterMode,
		setFilterMode,
		brightness,
		setBrightness,
		contrast,
		setContrast,
		showPolygon,
		setShowPolygon,
		showPlanes,
		setShowPlanes,
		showLabels,
		setShowLabels,
		scaleMmPerPixel,
		setScaleMmPerPixel,
	};
}
