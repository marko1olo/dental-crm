/**
 * Periapical Pathology Geometry for Upper Canine Tooth 13
 * Authentic osteolytic patterns for Radicular Cyst and Granuloma at highest apex:
 * - Canine Apex: (45.0, 4.5)
 * Mandate 8b <= 120 lines. ViewBox: "0 0 100 170".
 */

export const TOOTH13_PERIAPICAL_GEOMETRY = {
	granuloma: {
		canine: {
			core:
				"M 45.0,0.5 C 51.5,0.5 55.5,4.5 55.5,10.0 C 55.5,15.5 51.5,19.5 45.0,19.5 " +
				"C 38.5,19.5 34.5,15.5 34.5,10.0 C 34.5,4.5 38.5,0.5 45.0,0.5 Z",
			capsuleRim:
				"M 45.0,-1.5 C 53.0,-1.5 57.5,3.0 57.5,10.0 C 57.5,17.0 53.0,21.5 45.0,21.5 " +
				"C 37.0,21.5 32.5,17.0 32.5,10.0 C 32.5,3.0 37.0,-1.5 45.0,-1.5 Z",
		},
	},

	radicularCyst: {
		canine: {
			lumen:
				"M 45.0,-1.0 C 53.5,-1.0 59.0,4.5 59.0,11.5 C 59.0,18.5 53.5,23.0 45.0,23.0 " +
				"C 36.5,23.0 31.0,18.5 31.0,11.5 C 31.0,4.5 36.5,-1.0 45.0,-1.0 Z",
			corticalRim:
				"M 45.0,-2.5 C 55.0,-2.5 61.0,3.5 61.0,11.5 C 61.0,19.5 55.0,24.5 45.0,24.5 " +
				"C 35.0,24.5 29.0,19.5 29.0,11.5 C 29.0,3.5 35.0,-2.5 45.0,-2.5 Z",
		},
	},
} as const;
