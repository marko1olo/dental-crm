/**
 * DENTE Dental CRM — Clinical Pathology Geometry for Tooth 46
 * Authentic morphology for 6 advanced clinical states (Mandate 8b <= 120 lines):
 * 1. Abfraction (Cervical wedge defect at CEJ)
 * 2. Post & Core (Endodontic glass-fiber post & coronal stump)
 * 3. Dental Calculus (Supragingival & subgingival mineralized calculus)
 * 4. Tooth Infraction / Craze Line (Sub-millimeter 0.5px enamel micro-crack)
 * 5. Grade-5 Titanium Implant Fixture & Abutment
 * 6. Extracted / Missing Tooth (Clinical extraction cross & ghost boundary)
 */

export const TOOTH46_PATHOLOGY_GEOMETRY = {
	// 1. Cervical Abfraction: Sharp V-shaped wedge defect at buccal CEJ margin
	abfraction: {
		notch:
			"M 13,67 " +
			"C 15,67 19,69 22,70.5 " + // Occlusal sloping enamel wall
			"C 19,72 15,73 13.5,74 " + // Horizontal apical cervical wall
			"C 12.5,72 12,69 13,67 Z", // Outer contour
		dentinFloor:
			"M 15,68.5 C 17.5,69.5 20,70.5 21,70.5 C 18.5,71.5 16,72.5 14.5,73 Z",
		stressApexLine: "M 13.5,67.5 L 21.5,70.5 L 14,73.5",
	},

	// 2. Post & Core: Glass fiber post inside distal canal + anatomical core stump
	postAndCore: {
		postShaft:
			"M 64,52 L 67,52 " +
			"C 68,75 73,100 75.5,116 " +
			"L 73.5,116 " +
			"C 71,100 66,75 64,52 Z",
		coreStump:
			"M 28,45 " +
			"C 28,34 33,32 37,32 " +
			"C 42,32 46,36 50,36 " +
			"C 54,36 58,32 63,32 " +
			"C 67,32 72,34 72,45 " +
			"C 70,54 67,58 63,58 " +
			"C 58,58 54,56 50,56 " +
			"C 46,56 42,58 37,58 " +
			"C 33,58 30,54 28,45 Z",
	},

	// 3. Dental Calculus: Supragingival & subgingival mineralized calculus deposits
	calculus: {
		supragingival:
			"M 14,68 C 17,66 21,68 25,69 C 27,67 31,68 35,69.5 " +
			"C 38,67.5 44,68 49,69.5 C 53,67 59,68 64,69 " +
			"C 68,67 74,68 78,69 C 81,67 84,69 86,70 " +
			"C 84,72 80,73.5 76,73.5 C 68,74 54,74.5 48,74 " +
			"C 36,74 24,73.5 16,72 C 14,70.5 13.5,69 14,68 Z",
		subgingival:
			"M 18,74 C 21,75 24,77 24,79 C 22,81 19,79 17,76 Z " +
			"M 78,74 C 81,76 82,78 81,80 C 79,81 77,78 76,75 Z " +
			"M 47,88 C 50,89 52,92 51,94 C 48,93 47,90 47,88 Z",
	},

	// 4. Craze Line / Infraction: Fine 0.5px vertical enamel micro-crack
	crack: {
		mainLine:
			"M 74,21.5 " + "C 74.8,28 75.2,36 75.8,46 " + "C 76.2,54 76.6,62 76.9,71",
		branchLine: "M 75.8,46 C 74.5,49 73.2,51 72,52.5",
	},

	// 5. Titanium Implant Fixture Grade-5: Conical screw body & prosthetic abutment
	implant: {
		fixtureBody:
			"M 33,76 L 67,76 " +
			"L 65,138 C 64,144 61,148 55,149 " +
			"L 45,149 C 39,148 36,144 35,138 " +
			"L 33,76 Z",
		abutment: "M 35,50 L 65,50 " + "L 67,72 L 33,72 Z",
		collar: "M 32,72 L 68,72 L 67,76 L 33,76 Z",
		threads: [
			"M 33,84 L 67,84",
			"M 33.2,92 L 66.8,92",
			"M 33.5,100 L 66.5,100",
			"M 33.8,108 L 66.2,108",
			"M 34.1,116 L 65.9,116",
			"M 34.5,124 L 65.5,124",
			"M 35.0,132 L 65.0,132",
			"M 36.0,140 L 64.0,140",
		] as const,
	},

	// 6. Extracted Tooth: Clinical X-cross and ghost outline
	missing: {
		crossLine1: "M 12,12 L 88,152",
		crossLine2: "M 88,12 L 12,152",
	},
} as const;
