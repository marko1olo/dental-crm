/**
 * CBCT / Panoramic 3D MPR Caliper Measurements & Mandibular Canal Nerve Tracer Engine (Facade)
 * Standards: DICOM Part 3, Schneider, Mandate 8b (<= 120 lines).
 * 100% transparent backwards compatibility for all existing call sites.
 */

export * from "./cbctCaliperMeasureMath";
export * from "./cbctNerveCanalMath";

export {
	drawMandibularNerveBadge,
	drawNerveCanalBadge,
} from "./caliperModules/mandibularNerveBadge";

export {
	type EndoCurvatureGrade,
	type EndoCanalMeasurement,
	classifySchneiderCurvature,
	toPhysical3D,
	calculateSchneiderAngle3D,
	calculateEndoCanalLength3DMm,
	calculateEndoCanalMeasurement,
} from "./endoCanal/endoSchneiderMath";

export {
	formatEndoCanalHudText,
	formatEndoCanalBadgeText,
	formatEndoCanalProtocolEntry,
} from "./endoCanal/endoCanalFormatting";

export {
	hitTestEndoCanalHandle,
	hitTestEndoCanalObject,
} from "./endoCanal/endoCanalHitTest";

export {
	drawEndoCanalBadge,
	drawEndoCanalMeasurement,
} from "./endoCanal/endoCanalRenderer";

export {
	project3DNerveToCrossSection,
} from "./caliperModules/projectNerveCrossSection";
