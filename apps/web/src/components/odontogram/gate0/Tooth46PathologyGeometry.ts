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
			"M 13.8,67.2 " +
			"L 21.0,70.8 " + // Occlusal beveled enamel margin into dentin apex
			"L 16.0,73.5 " + // Cervical horizontal shelf
			"C 14.8,71.5 14.0,69.0 13.8,67.2 Z", // Outer tooth margin
		dentinFloor: "M 15.0,68.2 L 20.2,70.8 L 16.2,73.0 Z",
		stressApexLine: "M 13.8,67.2 L 21.0,70.8 L 16.0,73.5",
		enamelBevelHighlight: "M 13.8,67.2 L 21.0,70.8",
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
			"M 16.0,73.8 " +
			"C 16.2,70.5 19.5,69.0 23.5,69.5 " +
			"C 27.0,70.0 31.0,71.5 36.0,71.8 " +
			"C 41.0,72.0 46.0,71.2 50.0,71.5 " +
			"C 54.5,71.8 59.0,72.2 64.0,71.8 " +
			"C 69.0,71.2 73.0,70.0 77.0,69.5 " +
			"C 81.0,69.0 83.8,70.5 84.0,73.8 " +
			"C 81.0,74.5 76.0,75.2 68.0,75.8 " +
			"C 58.0,76.5 48.0,76.5 38.0,75.8 " +
			"C 28.0,75.2 20.0,74.5 16.0,73.8 Z",
		subgingival:
			"M 16.2,74.0 C 17.5,76.0 19.5,77.5 21.0,77.5 C 19.5,78.5 17.5,78.5 16.2,76.0 Z " +
			"M 44.0,76.0 C 47.0,78.5 50.0,81.5 50.0,81.5 C 50.0,81.5 53.0,78.5 56.0,76.0 " +
			"C 53.5,76.8 50.0,77.2 46.5,76.8 Z " +
			"M 83.8,74.0 C 82.5,76.0 80.5,77.5 79.0,77.5 C 80.5,78.5 82.5,78.5 83.8,76.0 Z",
		nodularTexture: [
			"M 18.0,71.2 C 20.5,72.2 23.5,72.0 25.5,71.0",
			"M 30.0,72.5 C 33.5,73.5 37.0,73.2 40.0,72.2",
			"M 45.0,72.5 C 48.5,73.5 52.0,73.5 55.0,72.5",
			"M 60.0,72.5 C 63.5,73.5 67.0,73.2 70.0,72.0",
			"M 74.5,71.0 C 77.0,72.0 80.0,72.2 82.0,71.2",
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
		abutment: TOOTH46_IMPLANT_GEOMETRY.healingAbutment.body,
		collar: TOOTH46_IMPLANT_GEOMETRY.collar.platformSwitch,
		threads: TOOTH46_IMPLANT_GEOMETRY.fixture.macroThreadFlanks,
		microThreads: TOOTH46_IMPLANT_GEOMETRY.collar.microThreads,
		hexSocket: TOOTH46_IMPLANT_GEOMETRY.healingAbutment.hexSocket,
		specular: TOOTH46_IMPLANT_GEOMETRY.healingAbutment.specularHighlight,
		fluteLeft: TOOTH46_IMPLANT_GEOMETRY.fixture.apicalCuttingFluteLeft,
		fluteRight: TOOTH46_IMPLANT_GEOMETRY.fixture.apicalCuttingFluteRight,
		apexDome: TOOTH46_IMPLANT_GEOMETRY.fixture.domeApex,
		coverScrew: TOOTH46_IMPLANT_GEOMETRY.coverScrew,
		healingAbutment: TOOTH46_IMPLANT_GEOMETRY.healingAbutment,
		standardAbutment: TOOTH46_IMPLANT_GEOMETRY.standardAbutment,
		screwAccessHole: TOOTH46_IMPLANT_GEOMETRY.screwAccessHole,
		temporaryAbutment: TOOTH46_IMPLANT_GEOMETRY.temporaryAbutment,
		gingivalCuff: TOOTH46_IMPLANT_GEOMETRY.gingivalCuff,
		implantCrownShell: TOOTH46_IMPLANT_GEOMETRY.implantCrownShell,
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
