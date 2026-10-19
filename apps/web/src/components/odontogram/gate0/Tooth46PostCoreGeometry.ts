/**
 * DENTE Dental CRM — Post and Core Geometry for Tooth 46
 * 2-root Cast Post & Core (КШВ) with dual pins and Fiberglass Post (СВШ).
 * Mandate 8b <= 120 lines. ViewBox: "0 0 100 170".
 */

export const TOOTH46_POST_CORE_GEOMETRY = {
	// Anatomical 2-Root Cast Post-and-Core (КШВ / Co-Cr or Gold)
	castPostCore: {
		// Coronal anatomical stump prepared for crown coping
		coreStump:
			"M 26,46 " +
			"C 26,36 30,34 35,34 " +
			"C 42,34 46,38 50,38 " +
			"C 54,38 58,34 65,34 " +
			"C 70,34 74,36 74,46 " +
			"C 72,56 70,68 66,72 " +
			"C 56,70 52,69 50,69 " +
			"C 46,69 42,70 34,72 " +
			"C 30,68 28,56 26,46 Z",
		// Primary Distal Root Post Shaft
		distalPost:
			"M 58.0,72.0 C 62.0,86 68.0,104 71.5,120 " +
			"L 74.5,120 C 73.0,104 65.5,86 62.0,72.0 Z",
		// Auxiliary Mesial Anti-Rotational Retention Pin
		mesialPin:
			"M 33.0,72.0 C 31.0,84 26.5,98 25.5,110 " +
			"L 27.5,110 C 28.5,98 33.5,84 35.5,72.0 Z",
	},

	// Translucent Quartz Fiberglass Post (СВШ) with composite core
	fiberPostCore: {
		// Distal fiber post shaft following distal canal trajectory
		postShaft:
			"M 58.5,60.0 C 61.5,75 66.5,95 72.0,118 " +
			"L 74.8,118 C 70.0,95 64.5,75 61.5,60.0 Z",
		// Core stump rebuilt with nanohybrid composite
		coreStump:
			"M 28,45 " +
			"C 28,34 33,32 37,32 " +
			"C 42,32 46,36 50,36 " +
			"C 54,36 58,32 63,32 " +
			"C 67,32 72,34 72,45 " +
			"C 70,54 67,60 63,68 " +
			"C 58,68 54,66 50,66 " +
			"C 46,66 42,68 37,68 " +
			"C 33,68 30,54 28,45 Z",
	},
} as const;
