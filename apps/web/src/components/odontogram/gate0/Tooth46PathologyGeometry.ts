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
			"M 16.0,66.8 " +
			"C 17.5,67.2 20.5,68.8 23.5,71.0 " + // Occlusal beveled enamel margin into dentin apex
			"C 21.0,72.4 18.5,73.5 16.0,74.0 " + // Cervical horizontal shelf
			"C 16.0,71.6 16.0,69.2 16.0,66.8 Z", // Outer tooth margin
		dentinFloor:
			"M 17.2,68.2 C 19.2,69.4 21.5,70.4 22.8,71.0 C 20.8,72.0 18.8,72.8 17.2,73.2 Z",
		stressApexLine: "M 16.2,67.0 L 23.5,71.0 L 16.2,73.8",
		enamelBevelHighlight: "M 16.2,66.8 C 18.5,67.2 21.0,69.0 23.5,71.0",
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
			"M 16.0,71.5 " +
			"C 17.5,68.0 20.5,67.0 23.5,68.8 " +
			"C 26.5,66.5 30.0,66.2 33.5,68.2 " +
			"C 37.0,66.2 41.5,66.8 45.5,68.5 " +
			"C 49.0,66.5 53.5,66.2 57.5,68.2 " +
			"C 61.0,66.5 65.5,66.8 69.5,68.2 " +
			"C 73.0,66.2 77.0,66.8 80.5,68.8 " +
			"C 82.5,69.8 83.8,70.8 84.0,72.5 " +
			"C 83.5,74.5 79.5,75.8 74.5,76.2 " +
			"C 66.0,76.8 54.0,76.8 46.0,76.5 " +
			"C 34.0,76.2 22.0,75.5 16.0,74.0 " +
			"C 15.8,73.2 15.8,72.2 16.0,71.5 Z",
		subgingival:
			"M 16.5,74.8 C 18.5,76.2 21.0,78.0 22.5,80.5 C 20.5,81.5 18.0,79.5 16.2,76.5 Z " +
			"M 46.5,77.5 C 49.0,79.0 51.5,81.2 50.5,83.5 C 48.5,83.0 47.0,80.5 46.5,77.5 Z " +
			"M 77.0,74.8 C 79.5,76.5 82.5,78.5 83.0,81.0 C 81.0,81.8 78.5,79.5 76.5,76.5 Z " +
			"M 48.0,89.5 C 50.5,90.5 52.5,92.5 51.5,94.5 C 49.0,94.0 47.5,91.8 48.0,89.5 Z",
		nodularTexture: [
			"M 19.5,69.5 C 21.5,70.8 24.5,70.5 26.0,69.2",
			"M 29.5,69.0 C 32.0,70.5 35.5,70.2 38.0,68.8",
			"M 42.5,69.5 C 45.0,71.0 49.0,70.8 51.5,69.2",
			"M 55.5,69.0 C 58.0,70.5 62.0,70.2 64.5,68.8",
			"M 68.5,69.2 C 71.0,70.8 75.0,70.5 77.5,69.0",
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
