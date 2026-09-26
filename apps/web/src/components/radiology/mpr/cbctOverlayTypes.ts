import type {
	CbctVoxelVolume,
	Point3D,
	SlabProjectionMode,
	ObliqueRotationAngles,
	RotationHandlePosition,
	ViewportTransform,
	CbctMeasurementRuler,
	CbctAngleMeasurement,
	CbctProbeMarker,
	MprPlane,
} from "../cbctMprMath";
import type { DentalArchCurve, CrossSectionSliceData } from "../dentalCurveEngine";
import type { Implant3DWorldProjection } from "../implantSafetyEngine";
import type { CbctToolMode } from "../CbctLeftToolDock";
import type { StudioMode } from "./cbctStudioTypes";

export interface MprOverlayParams {
	volume: CbctVoxelVolume;
	crosshairMm: Point3D;
	transform: ViewportTransform;
	invertColors: boolean;
	slabMode: SlabProjectionMode;
	slabThicknessMm: number;
	rulers: CbctMeasurementRuler[];
	activeRuler: (CbctMeasurementRuler & { currentMm: Point3D }) | null;
	angles: CbctAngleMeasurement[];
	activeAngle: (CbctAngleMeasurement & { currentMm: Point3D }) | null;
	probeMarkers: CbctProbeMarker[];
	activeProbe: (CbctProbeMarker & { hu: number; tissueName: string }) | null;
	selectedMeasurement: CbctMeasurementRuler | CbctAngleMeasurement | CbctProbeMarker | null;
	hoveredMeasurementHandle: { id: string; handleIndex: number } | null;
	draggingMeasurementHandle: { id: string; handleIndex: number } | null;
	activeTool: CbctToolMode;
	studioMode: StudioMode;
	implant3DWorld: Implant3DWorldProjection | null;
	nerveAuditResult: {
		isDangerous: boolean;
		isWarning: boolean;
		netClearanceToCanalWallMm: number;
		clinicalMessageRu: string;
	};
	interpolatedNerve3D: Point3D[];
	nervePoints: readonly Point3D[];
	nerveTotalLengthMm: number;
	selectedNerveNodeIdx: number | null;
	obliqueAngles: ObliqueRotationAngles;
	activeRotationHandle: { plane: MprPlane; handle: RotationHandlePosition } | null;
	hoveredHandle: { plane: MprPlane; handle: RotationHandlePosition } | null;
	// Plane-specific options
	showDentalArch?: boolean;
	archCurve?: DentalArchCurve;
	activeCrossSection?: CrossSectionSliceData | null;
	selectedArchAnchorIdx?: number | null;
	hoveredArchAnchorIdx?: number | null;
	isDraggingArchAnchor?: number | null;
}
