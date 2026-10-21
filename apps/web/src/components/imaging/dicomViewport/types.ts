import type React from "react";
export type {
	CalibratedRulerMeasurement,
	DicomViewportState,
	Point2D,
} from "../rvgViewerEngine.js";

export interface DicomViewportProps {
	readonly imageSrc: string;
	readonly viewportState: DicomViewportState;
	readonly onViewportChange: (nextState: Partial<DicomViewportState>) => void;
	readonly measurements?: readonly CalibratedRulerMeasurement[] | undefined;
	readonly onAddMeasurement?: ((m: CalibratedRulerMeasurement) => void) | undefined;
}

export interface DicomViewportRefs {
	readonly canvasRef: React.RefObject<HTMLCanvasElement | null>;
	readonly containerRef: React.RefObject<HTMLDivElement | null>;
	readonly rawImageRef: React.RefObject<HTMLImageElement | null>;
	readonly filteredCanvasRef: React.RefObject<HTMLCanvasElement | null>;
	readonly canvasRectRef: React.MutableRefObject<DOMRect | null>;
}
