/**
 * cbctRidgeCaliperMath.ts — Automated Alveolar Ridge Caliper Engine
 * Canonical Facade per Mandate 8b: logic decomposed into <= 250L modules.
 * Standards: Misch CE Implant Dentistry 3rd Ed., Buser ITI Consensus, DICOM Part 3
 */

export {
	type AlveolarRidgeCaliperResult,
	measureAlveolarRidgeCaliper,
} from "./cbctRidgeCaliperCore";

export {
	type CrossSectionRidgeWidthsResult,
	measureCrossSectionRidgeWidths2_4_6,
} from "./cbctRidgeWidthsExtractor";

export {
	type RidgeProtocolResult,
	type Ridge043ProtocolResult,
	generateRidgeProtocolText,
	generateRidge043ProtocolText,
} from "./cbctRidgeProtocolGenerator";
