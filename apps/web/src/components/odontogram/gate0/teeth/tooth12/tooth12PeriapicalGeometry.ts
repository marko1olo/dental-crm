/**
 * Periapical Pathology Geometry for Upper Lateral Incisor 12
 * Authentic osteolytic patterns for Radicular Cyst and Granuloma at curved apex:
 * - Lateral Apex: (43.0, 14.0)
 * Mandate 8b <= 120 lines. ViewBox: "0 0 100 170".
 */

export const TOOTH12_PERIAPICAL_GEOMETRY = {
	granuloma: {
		lateral: {
			core:
				"M 43.0,8.0 C 49.0,8.0 53.0,12.0 53.0,17.5 C 53.0,23.0 49.0,27.0 43.0,27.0 " +
				"C 37.0,27.0 33.0,23.0 33.0,17.5 C 33.0,12.0 37.0,8.0 43.0,8.0 Z",
			capsuleRim:
				"M 43.0,6.0 C 50.5,6.0 55.0,10.5 55.0,17.5 C 55.0,24.5 50.5,29.0 43.0,29.0 " +
				"C 35.5,29.0 31.0,24.5 31.0,17.5 C 31.0,10.5 35.5,6.0 43.0,6.0 Z",
		},
	},

	radicularCyst: {
		lateral: {
			lumen:
				"M 43.0,6.5 C 51.0,6.5 56.5,12.0 56.5,19.0 C 56.5,26.0 51.0,30.5 43.0,30.5 " +
				"C 35.0,30.5 29.5,26.0 29.5,19.0 C 29.5,12.0 35.0,6.5 43.0,6.5 Z",
			corticalRim:
				"M 43.0,5.0 C 52.5,5.0 58.5,11.0 58.5,19.0 C 58.5,27.0 52.5,32.0 43.0,32.0 " +
				"C 33.5,32.0 27.5,27.0 27.5,19.0 C 27.5,11.0 33.5,5.0 43.0,5.0 Z",
		},
	},
} as const;
