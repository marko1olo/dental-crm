/**
 * DENTE Dental CRM — Clinical Pathology Geometry for Tooth 46
 * Authentic morphology for 6 advanced clinical states (Mandate 8b <= 120 lines):
 * 1. Abfraction (Cervical wedge defect at buccal CEJ margin)
 * 2. Post & Core (Glass-fiber & cast metal core stump)
 * 3. Dental Calculus (Supragingival nodular & subgingival tenacious calculus)
 * 4. Tooth Infraction (Sub-millimeter 0.5px micro-crack from central pit)
 * 5. Grade-5 Titanium Implant CAD/CAM Fixture & Abutment
 * 6. Extracted Tooth (Surgical cross & alveolar socket ghost contour)
 */

import { TOOTH46_IMPLANT_GEOMETRY } from "./Tooth46ImplantGeometry";

export const TOOTH46_PATHOLOGY_GEOMETRY = {
	// 1. Cervical Abfraction: Sharp V-shaped wedge defect at buccal CEJ margin
	abfraction: {
		notch:
			"M 13.0,66.8 " +
			"C 15.0,66.8 18.5,68.8 22.8,70.6 " + // Occlusal beveled enamel margin
			"C 19.5,72.4 15.5,73.6 13.6,74.2 " + // Cervical horizontal shelf
			"C 12.4,72.2 12.0,69.0 13.0,66.8 Z", // Outer tooth border
		dentinFloor:
			"M 14.8,68.0 C 17.5,69.4 20.2,70.5 21.8,70.6 C 18.8,71.8 16.0,72.8 14.2,73.2 Z",
		stressApexLine: "M 13.2,67.2 L 22.4,70.6 L 13.8,73.8",
		enamelBevelHighlight: "M 13.2,66.8 C 16.0,67.0 19.2,68.8 22.8,70.6",
	},

	// 2. Post & Core: Glass fiber post inside distal canal + anatomical core stump
	postAndCore: {
		postShaft:
			"M 64,52 L 67,52 C 68,75 73,100 75.5,116 L 73.5,116 C 71,100 66,75 64,52 Z",
		coreStump:
			"M 28,45 C 28,34 33,32 37,32 C 42,32 46,36 50,36 C 54,36 58,32 63,32 " +
			"C 67,32 72,34 72,45 C 70,54 67,58 63,58 C 58,58 54,56 50,56 " +
			"C 46,56 42,58 37,58 C 33,58 30,54 28,45 Z",
	},

	// 3. Dental Calculus: Mineralized nodular supragingival & tenacious subgingival ledges
	calculus: {
		supragingival:
			"M 14,67.5 C 16.5,65.8 20.5,67.2 24.5,68.5 C 27,66.8 31,67.5 35.5,69 " +
			"C 38.5,67 43.5,67.5 48.5,69 C 53,66.8 58.5,67.5 63.5,68.8 " +
			"C 67.5,66.8 73.5,67.5 77.5,68.5 C 80.5,66.8 83.5,68.5 86,69.5 " +
			"C 84.5,72.2 80,73.8 76,74 C 68,74.5 54,75 48,74.5 " +
			"C 36,74.5 24,74 16,72.2 C 14,70.5 13.5,68.8 14,67.5 Z",
		subgingival:
			"M 17,74.5 C 19.5,75.8 22.5,77.5 22.5,79.5 C 20.5,81.5 18,79.8 16,76.5 Z " +
			"M 76.5,74.5 C 79.5,76.2 81.5,78.2 80.5,80.5 C 78.5,81.5 76.5,78.8 75.5,75.5 Z " +
			"M 47,88 C 49.5,89.2 52,91.8 51,94 C 48.5,93 47,90.2 47,88 Z",
		nodularTexture: [
			"M 21,68 C 22,69 24,69 25,68.5",
			"M 37,68.5 C 38.5,69.5 40.5,69.5 42,68.8",
			"M 55,68.2 C 56.5,69.2 58.5,69.2 60,68.5",
			"M 71,68.5 C 72.5,69.5 74.5,69.5 76,68.8",
		] as const,
	},

	// 4. Craze Line / Infraction: Fine 0.5px micro-crack zig-zagging from central pit to CEJ
	crack: {
		mainLine:
			"M 52,22 " + // Origin: Central fossa pit
			"L 57.5,24.2 L 63.8,28.5 L 68.0,36.0 L 71.2,44.5 " + // Transits DB cusp slope
			"L 73.0,55.8 L 74.5,64.5 L 75.5,72.0", // Reaches cervical third
		branchLine: "M 68.0,36.0 L 65.5,40.2 L 63.8,46.5",
		shimmerLine: "M 52.5,22.2 L 58.0,24.4 L 64.2,28.7 L 68.4,36.2",
	},

	// 5. Grade-5 Titanium Implant Fixture & Abutment (Mapped from CAD/CAM engine)
	implant: {
		fixtureBody: TOOTH46_IMPLANT_GEOMETRY.fixture.coreBody,
		abutment: TOOTH46_IMPLANT_GEOMETRY.abutment.body,
		collar: TOOTH46_IMPLANT_GEOMETRY.collar.platformSwitch,
		threads: TOOTH46_IMPLANT_GEOMETRY.fixture.macroThreadFlanks,
		microThreads: TOOTH46_IMPLANT_GEOMETRY.collar.microThreads,
		hexSocket: TOOTH46_IMPLANT_GEOMETRY.abutment.hexSocket,
		specular: TOOTH46_IMPLANT_GEOMETRY.abutment.specularHighlight,
		fluteLeft: TOOTH46_IMPLANT_GEOMETRY.fixture.apicalCuttingFluteLeft,
		fluteRight: TOOTH46_IMPLANT_GEOMETRY.fixture.apicalCuttingFluteRight,
		apexDome: TOOTH46_IMPLANT_GEOMETRY.fixture.domeApex,
	},

	// 6. Extracted Tooth: Clinical X-cross and ghost alveolar socket bed
	missing: {
		crossLine1: "M 10,10 L 90,154",
		crossLine2: "M 90,10 L 10,154",
		socketGhost:
			"M 16,74 C 13,88 12,108 14,124 C 15,134 18,144 23,149 C 26,149 27,143 29,132 " +
			"C 34,116 43,105 46,100 C 48,97 52,97 54,100 C 57,105 67,116 72,130 C 75,142 77,147 79,147 " +
			"C 82,147 84,141 85,128 C 87,110 86,88 84,74 Z",
	},
} as const;
