/**
 * Misch Bone Density Profiling & Live Telemetry Engine (HU / Misch D1..D4)
 * Canonical Facade per Mandate 8b: logic decomposed into <= 300L modules.
 * Standards: Misch CE (2008), ITI Consensus, Buser.
 */

export {
	type MischClinicalGuidance,
	getMischClinicalGuidance,
} from "./implantBoneDensityGuidance.js";

export {
	sampleCrossSectionHUProfile,
} from "./implantBoneDensitySampling.js";

export {
	type LiveBoneDensityTelemetry,
	type LiveSafetyClearanceTelemetry,
	type LiveImplantTelemetry,
	type LiveImplantInput,
	type LiveAnatomyMarkerInput,
	normalizeImplantToSeg,
	adaptVolumeToSamplingData,
	normalizeAnatomyMarkers,
	computeLiveImplantTelemetry,
} from "./implantBoneDensityTelemetry.js";
