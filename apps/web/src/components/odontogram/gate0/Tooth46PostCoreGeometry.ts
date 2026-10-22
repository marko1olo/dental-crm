/**
 * DENTE Dental CRM — Post and Core Geometry for Tooth 46
 * 2-root Cast Post & Core (КШВ) with dual pins and Fiberglass Post (СВШ).
 * Mandate 8b <= 120 lines. ViewBox: "0 0 100 170".
 */

export const TOOTH46_POST_CORE_GEOMETRY = {
	// Natural Prepared Tooth Ferrule (1.5-2mm cervical dentin collar above CEJ)
	ferruleCollar:
		"M 16,74 " +
		"C 15,72.2 16.5,70.5 18.5,69.5 " + // Mesial cervical wall
		"C 30,70.5 50,71.0 81.5,69.5 " + // Circular chamfer margin shoulder
		"C 83.5,70.5 85,72.2 84,74 " + // Distal cervical wall
		"C 80,75.5 68,76.2 50,76.5 " + // Root CEJ curve
		"C 32,76.2 20,75.5 16,74 Z",

	// Circular Chamfer Preparation Margin Line (Y=69.5..71.0)
	chamferMarginLine: "M 18.5,69.5 C 32,70.8 50,71.2 81.5,69.5",

	// Anatomical 2-Root Cast Post-and-Core (КШВ / Co-Cr or Gold)
	castPostCore: {
		// Truncated conical anatomical molar stump prepared for crown coping (6° taper, chamfer margin)
		coreStump:
			"M 20.0,69.5 " +
			"C 21.0,59.0 23.5,49.0 26.5,41.0 " +
			"C 27.5,39.0 32.0,38.5 38.0,38.5 " +
			"C 44.0,38.5 48.0,39.0 50.0,39.0 " +
			"C 52.0,39.0 56.0,38.5 62.0,38.5 " +
			"C 68.0,38.5 72.5,39.0 73.5,41.0 " +
			"C 76.5,49.0 79.0,59.0 80.0,69.5 " +
			"C 70.0,70.5 50.0,71.0 20.0,69.5 Z",
		// Primary Distal Root Post Shaft
		distalPost:
			"M 59.0,56.0 C 62.0,75 68.0,98 71.5,120 " +
			"L 74.5,120 C 72.0,98 65.5,75 63.0,56.0 Z",
		// Auxiliary Mesial Anti-Rotational Retention Pin
		mesialPin:
			"M 33.0,58.0 C 31.0,74 26.5,92 25.5,108 " +
			"L 27.5,108 C 28.5,92 33.5,74 35.5,58.0 Z",
	},

	// Translucent Quartz Fiberglass Post (СВШ) with composite core build-up
	fiberPostCore: {
		// Distal fiber post shaft following distal canal trajectory
		postShaft:
			"M 59.5,50.0 C 62.0,72 67.0,95 72.0,118 " +
			"L 74.8,118 C 70.0,95 64.5,72 62.5,50.0 Z",
		// Core stump rebuilt with nanohybrid composite (anatomical prepared molar taper)
		coreStump:
			"M 20.5,69.5 " +
			"C 21.5,59.0 24.0,49.0 27.0,41.5 " +
			"C 28.0,39.5 32.5,39.0 38.5,39.0 " +
			"C 44.0,39.0 48.0,39.5 50.0,39.5 " +
			"C 52.0,39.5 56.0,39.0 61.5,39.0 " +
			"C 67.5,39.0 72.0,39.5 73.0,41.5 " +
			"C 76.0,49.0 78.5,59.0 79.5,69.5 " +
			"C 69.5,70.5 50.0,71.0 20.5,69.5 Z",
	},
} as const;
