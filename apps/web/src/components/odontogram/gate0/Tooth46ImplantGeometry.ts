/**
 * DENTE Dental CRM — Authentic Grade-5 Titanium Implant Geometry for Tooth 46
 * CAD/CAM conical fixture with progressive macro-threads, cervical micro-threads,
 * platform switching, and mirror-polished healing abutment.
 * ViewBox: "0 0 100 170" (Mandate 8b <= 120 lines).
 */

export const TOOTH46_IMPLANT_GEOMETRY = {
	// Healing Abutment / Gingival Former (Emergence profile Y=46..72)
	abutment: {
		body:
			"M 38,46 L 62,46 " +
			"C 64,46 66,54 66.5,64 " +
			"C 67,69 66,72 64,72 " +
			"L 36,72 " +
			"C 34,72 33,69 33.5,64 " +
			"C 34,54 36,46 38,46 Z",
		hexSocket: "M 46,46 L 54,46 L 57,48.5 L 53,51 L 47,51 L 43,48.5 Z",
		specularHighlight: "M 42,48 C 43,56 43,65 42,70",
		chamferCollar: "M 36,70 L 64,70 L 63.5,72.5 L 36.5,72.5 Z",
	},

	// Platform Switching & Cervical Micro-Threads (Y=72..84)
	collar: {
		platformSwitch: "M 36,72.5 L 64,72.5 L 65.5,75 L 34.5,75 Z",
		microThreads: [
			"M 34.2,76.5 L 65.8,76.5",
			"M 34.0,78.5 L 66.0,78.5",
			"M 33.8,80.5 L 66.2,80.5",
			"M 33.5,82.5 L 66.5,82.5",
		] as const,
	},

	// Conical Tapered Fixture Body with Progressive Macro-Threads (Y=83..146)
	fixture: {
		coreBody:
			"M 33.5,83 L 66.5,83 " +
			"L 64.5,108 C 63.5,122 60.5,136 55.5,144 " +
			"C 54,146 52,147 50,147 " +
			"C 48,147 46,146 44.5,144 " +
			"C 39.5,136 36.5,122 35.5,108 " +
			"L 33.5,83 Z",
		macroThreadFlanks: [
			// Sawtooth buttress profile for progressive osseointegration
			"M 32.5,86.5 L 67.5,86.5 L 66.2,88.5 L 33.8,88.5 Z",
			"M 32.8,93.0 L 67.2,93.0 L 65.8,95.5 L 34.2,95.5 Z",
			"M 33.2,100.5 L 66.8,100.5 L 65.2,103.5 L 34.8,103.5 Z",
			"M 33.8,108.5 L 66.2,108.5 L 64.5,112.0 L 35.5,112.0 Z",
			"M 34.5,117.0 L 65.5,117.0 L 63.6,121.0 L 36.4,121.0 Z",
			"M 35.4,126.0 L 64.6,126.0 L 62.4,130.5 L 37.6,130.5 Z",
			"M 36.8,135.5 L 63.2,135.5 L 60.8,140.0 L 39.2,140.0 Z",
		] as const,
		// Self-tapping apical cutting flutes for bone chip collection
		apicalCuttingFluteLeft:
			"M 39.5,132 C 41,136 41.5,141 42,144.5 L 43.5,144 C 43,140 42,135 40.5,132 Z",
		apicalCuttingFluteRight:
			"M 60.5,132 C 59,136 58.5,141 58,144.5 L 56.5,144 C 57,140 58,135 59.5,132 Z",
		domeApex: "M 44.5,144 C 47,147 53,147 55.5,144 Z",
	},
} as const;
