import type { CSSProperties } from "react";

export interface ViewerRulerMeasurement {
	id: string;
	startX?: number | undefined;
	startY?: number | undefined;
	endX?: number | undefined;
	endY?: number | undefined;
	lengthMm?: number | undefined;
	distanceMm?: number | undefined;
	label?: string | undefined;
	x1Percent?: number | undefined;
	y1Percent?: number | undefined;
	x2Percent?: number | undefined;
	y2Percent?: number | undefined;
}

export interface ClinicalImageViewerProps {
	imageUrl: string | Blob | File;
	enhanced?: boolean | undefined;
	autoRevokeBlobUrl?: boolean | undefined;
	viewerStyle?: CSSProperties | undefined;
	isRulerActive?: boolean | undefined;
	pixelSpacingMm?: number | undefined;
	measurements?: ViewerRulerMeasurement[] | undefined;
	onMeasurementsChange?: ((measurements: ViewerRulerMeasurement[]) => void) | undefined;
	isPanActive?: boolean | undefined;
	pan?: { x: number; y: number } | undefined;
	onPanChange?: ((pan: { x: number; y: number }) => void) | undefined;
	studyTitle?: string | undefined;
	patientName?: string | undefined;
	toothCode?: string | number | null | undefined;
	onMeasureApexLength?: ((lengthMm: number) => void) | undefined;
}
