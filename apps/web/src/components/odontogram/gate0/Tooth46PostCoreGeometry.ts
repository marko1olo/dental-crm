/**
 * DENTE Dental CRM — Post and Core Geometry for Tooth 46
 * 2-root Cast Post & Core (КШВ) with dual pins and Fiberglass Post (СВШ).
 * Mandate 8b <= 120 lines. ViewBox: "0 0 100 170".
 */

export const TOOTH46_POST_CORE_GEOMETRY = {
	// Anatomical 2-Root Cast Post-and-Core (КШВ / Co-Cr or Gold)
	castPostCore: {
		// Truncated conical anatomical molar stump prepared for crown coping (6° taper, chamfer margin)
		coreStump:
			"M 22.0,72.0 " +
			"C 22.5,62.0 24.5,50.0 26.5,42.0 " +
			"C 27.5,39.5 31.0,38.5 36.0,38.5 " +
			"C 43.0,38.5 47.0,39.0 50.0,39.0 " +
			"C 53.0,39.0 57.0,38.5 64.0,38.5 " +
			"C 69.0,38.5 72.5,39.5 73.5,42.0 " +
			"C 75.5,50.0 77.5,62.0 78.0,72.0 " +
			"C 70.0,72.8 50.0,73.2 22.0,72.0 Z",
		// Primary Distal Root Post Shaft
		distalPost:
			"M 58.0,72.0 C 62.0,86 68.0,104 71.5,120 " +
			"L 74.5,120 C 73.0,104 65.5,86 62.0,72.0 Z",
		// Auxiliary Mesial Anti-Rotational Retention Pin
		mesialPin:
			"M 33.0,72.0 C 31.0,84 26.5,98 25.5,110 " +
			"L 27.5,110 C 28.5,98 33.5,84 35.5,72.0 Z",
	},

	// Translucent Quartz Fiberglass Post (СВШ) with composite core build-up
	fiberPostCore: {
		// Distal fiber post shaft following distal canal trajectory
		postShaft:
			"M 58.5,60.0 C 61.5,75 66.5,95 72.0,118 " +
			"L 74.8,118 C 70.0,95 64.5,75 61.5,60.0 Z",
		// Core stump rebuilt with nanohybrid composite (anatomical prepared molar taper)
		coreStump:
			"M 23.0,71.5 " +
			"C 23.5,61.5 25.5,50.0 27.0,42.5 " +
			"C 28.0,40.0 31.5,39.0 36.5,39.0 " +
			"C 43.0,39.0 47.0,39.5 50.0,39.5 " +
			"C 53.0,39.5 57.0,39.0 63.5,39.0 " +
			"C 68.5,39.0 72.0,40.0 73.0,42.5 " +
			"C 74.5,50.0 76.5,61.5 77.0,71.5 " +
			"C 69.0,72.2 50.0,72.6 23.0,71.5 Z",
	},
} as const;
