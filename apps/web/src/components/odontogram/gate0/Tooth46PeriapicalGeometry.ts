/**
 * DENTE Dental CRM — Periapical Pathology Geometry for Tooth 46
 * Circumscribed granuloma, radicular cyst with cortical border, and apical resorption.
 * Mandate 8b <= 120 lines. ViewBox: "0 0 100 170".
 */

export const TOOTH46_PERIAPICAL_GEOMETRY = {
	// Circumscribed Chronic Periapical Granuloma with Fibrous Capsule Rim
	granuloma: {
		mesial: {
			core:
				"M 23,137 " +
				"C 29,137 34,142 34,148 " +
				"C 34,155 28,161 22,161 " +
				"C 15,161 11,154 11,147 " +
				"C 11,141 16,137 23,137 Z",
			capsuleRim:
				"M 23,135.5 " +
				"C 30.5,135.5 35.5,141 35.5,148 " +
				"C 35.5,156.5 29,162.5 22,162.5 " +
				"C 13.5,162.5 9.5,155 9.5,147 " +
				"C 9.5,139.5 15,135.5 23,135.5 Z",
		},
		distal: {
			core:
				"M 79,136 " +
				"C 85,136 89,141 89,147 " +
				"C 89,153 84,158 78,158 " +
				"C 72,158 68,153 68,146 " +
				"C 68,140 73,136 79,136 Z",
			capsuleRim:
				"M 79,134.5 " +
				"C 86.5,134.5 90.5,140 90.5,147 " +
				"C 90.5,154.5 85,159.5 78,159.5 " +
				"C 70.5,159.5 66.5,154 66.5,146 " +
				"C 66.5,138.5 71.5,134.5 79,134.5 Z",
		},
	},

	// Radicular Cyst with Hyperostotic Radiopaque Sclerotic Cortical Rim (r=12px)
	radicularCyst: {
		lumen:
			"M 23,136 " +
			"C 32,136 38,142 38,151 " +
			"C 38,160 31,166 22,166 " +
			"C 13,166 7,159 7,150 " +
			"C 7,141 14,136 23,136 Z",
		corticalBorder:
			"M 23,134.5 " +
			"C 33.5,134.5 39.5,141 39.5,151 " +
			"C 39.5,161.5 32,167.5 22,167.5 " +
			"C 11.5,167.5 5.5,160 5.5,150 " +
			"C 5.5,139.5 12.5,134.5 23,134.5 Z",
		corticalInnerGlow:
			"M 23,136.0 " +
			"C 32.0,136.0 37.5,142 37.5,151 " +
			"C 37.5,159.5 31,165.5 22,165.5 " +
			"C 13.0,165.5 7.5,158.5 7.5,150 " +
			"C 7.5,141.5 14.0,136.0 23,136.0 Z",
	},

	// Apical Root Resorption: Shortened, blunted root apex with Howship's lacunae
	resorption: {
		bluntedApexCrater:
			"M 16.5,138.0 " +
			"C 18.5,141.0 21.0,140.5 22.5,139.0 " +
			"C 24.0,141.5 26.5,140.5 28.5,137.5 Z",
		howshipLacunae: [
			"M 17.5,137.5 C 18.5,139.5 20.0,139.0 20.5,138.0",
			"M 21.0,138.0 C 22.5,140.5 24.5,139.5 25.0,138.0",
			"M 25.5,138.0 C 26.5,140.0 28.0,139.0 28.5,137.5",
		],
		resorptionHalo:
			"M 14.5,135.0 C 18.0,143.0 26.5,143.0 30.5,135.0 " +
			"C 32.5,146.0 12.5,146.0 14.5,135.0 Z",
	},
} as const;
