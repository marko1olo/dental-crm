import type {
	CbctAngleMeasurement,
	CbctMeasurementRuler,
	CbctVoxelVolume,
	Point3D,
	SlabProjectionMode,
	ViewportTransform,
} from "../../cbctMprMath";
import type {
	DentalArchCurve,
	CrossSectionSliceData,
	PanoramicReconstructionResult,
} from "../../dentalCurveEngine";
import type {
	CrossSectionImplantPose,
	Implant3DWorldProjection,
	MandibularCanalCrossSection,
	VirtualImplantSpec,
} from "../../implantSafetyEngine";
import type { StudioMode } from "../cbctStudioTypes";

export interface PanoramicOverlayParams {
	activePano: PanoramicReconstructionResult;
	volume: CbctVoxelVolume | null;
	crosshairMm: Point3D;
	transform: ViewportTransform;
	slabMode: SlabProjectionMode;
	slabThicknessMm: number;
	interpolatedNerve3D: Point3D[];
	archCurve: DentalArchCurve;
	nervePoints: readonly Point3D[];
	studioMode: StudioMode;
	activeCrossSection: CrossSectionSliceData | null;
	implant3DWorld: Implant3DWorldProjection | null;
	nerveAuditResult: {
		isDangerous: boolean;
		isWarning: boolean;
		netClearanceToCanalWallMm: number;
		clinicalMessageRu: string;
	};
	crossSections: CrossSectionSliceData[];
	hoveredToothMarkerFdi: number | null;
	invertColors: boolean;
	rulers?: readonly CbctMeasurementRuler[];
	activeRuler?: (CbctMeasurementRuler & { currentMm: Point3D }) | null;
	angles?: readonly CbctAngleMeasurement[];
	activeAngle?: (CbctAngleMeasurement & { currentMm: Point3D }) | null;
	selectedMeasurement?: { id?: string; type?: string } | null;
	hoveredMeasurementHandle?: { id: string; handleIndex: number } | null;
	draggingMeasurementHandle?: { id: string; handleIndex: number } | null;
}

export interface CrossSectionOverlayParams {
	activeCrossSection: CrossSectionSliceData;
	transform: ViewportTransform;
	studioMode: StudioMode;
	currentCanal: MandibularCanalCrossSection;
	currentImplantPose: CrossSectionImplantPose;
	currentImplantSpec: VirtualImplantSpec;
	nerveAuditResult: {
		isDangerous: boolean;
		isWarning: boolean;
		netClearanceToCanalWallMm: number;
		clinicalMessageRu: string;
	};
	selectedMeasurement: unknown | null;
	hoveredImplantPart: string | null;
	dragImplantPart: string | null;
	invertColors: boolean;
	rulers?: readonly CbctMeasurementRuler[];
	activeRuler?: (CbctMeasurementRuler & { currentMm: Point3D }) | null;
	angles?: readonly CbctAngleMeasurement[];
	activeAngle?: (CbctAngleMeasurement & { currentMm: Point3D }) | null;
	hoveredMeasurementHandle?: { id: string; handleIndex: number } | null;
	draggingMeasurementHandle?: { id: string; handleIndex: number } | null;
}
