/**
 * caliperTypes.ts — Типы данных и интерфейсы электронного штангенциркуля и измерений КЛКТ (Мандат 8b).
 */

export const MIN_IMPLANT_BONE_WIDTH_MM = 6.0;
export const MIN_IMPLANT_BONE_HEIGHT_MM = 10.0;

export interface Point2D {
	x: number;
	y: number;
}

export interface Point3D {
	x: number;
	y: number;
	z: number;
}

export interface AlveolarRidgeCaliperMeasurement {
	id: string;
	fdiTooth?: string | null | undefined;
	label: string;
	crestPoint: Point2D;
	basePoint: Point2D;
	crestWidthLeft?: Point2D | undefined;
	crestWidthRight?: Point2D | undefined;
	heightMm: number;
	crestWidthMm: number;
	midWidthMm: number;
	baseWidthMm: number;
	implantFeasibility: {
		isAdequate: boolean;
		recommendedDiameterMm: number;
		recommendedLengthMm: number;
		requiresBoneGrafting: boolean;
		graftingType?: "sinus_lift" | "gbr_horizontal" | "ridge_split" | "none" | undefined;
		clinicalAdviceRu: string;
	};
}

export interface CbctAngleMeasurement {
	readonly id: string;
	readonly plane: "axial" | "coronal" | "sagittal" | "panoramic" | "cross_section";
	readonly startMm: Point3D;
	readonly vertexMm: Point3D;
	readonly endMm: Point3D;
	readonly angleDeg: number;
}

export interface MeasurementHandleHit {
	readonly type: "ruler" | "angle";
	readonly id: string;
	readonly handleIndex: number;
	readonly plane: string;
	readonly distancePx: number;
}

export interface MeasurementObjectHit {
	readonly type: "ruler" | "angle" | "probe";
	readonly id: string;
	readonly plane: string;
	readonly isDeleteButtonHit: boolean;
	readonly distancePx: number;
}

export interface CbctMeasurementRuler {
	readonly id: string;
	readonly plane: "axial" | "coronal" | "sagittal" | "panoramic" | "cross_section";
	readonly startMm: Point3D;
	readonly endMm: Point3D;
	readonly distanceMm: number;
	readonly fdiTooth?: string | null | undefined;
	readonly label?: string | undefined;
}

export interface CbctProbeMarker {
	readonly id: string;
	readonly plane: "axial" | "coronal" | "sagittal" | "panoramic" | "cross_section";
	readonly worldMm: Point3D;
	readonly hu: number;
	readonly tissueName: string;
	readonly mischClass?: string | undefined;
}

export interface RulerHtmlOverlayData {
	readonly id: string;
	readonly plane: string;
	readonly text: string;
	readonly xPx: number;
	readonly yPx: number;
	readonly distanceMm: number;
	readonly isSelected: boolean;
}

export interface AngleHtmlOverlayData {
	readonly id: string;
	readonly plane: string;
	readonly text: string;
	readonly xPx: number;
	readonly yPx: number;
	readonly angleDeg: number;
	readonly isSelected: boolean;
}

export interface ProbeHtmlOverlayData {
	readonly id: string;
	readonly plane: string;
	readonly text: string;
	readonly tooltip: string;
	readonly xPx: number;
	readonly yPx: number;
	readonly hu: number;
	readonly tissueName: string;
	readonly isSelected: boolean;
}
