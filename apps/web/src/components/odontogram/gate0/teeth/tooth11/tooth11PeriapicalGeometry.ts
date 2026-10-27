/**
 * Periapical Pathology Geometry for Upper Central Incisor 11
 * Authentic osteolytic patterns for Radicular Cyst and Granuloma at centered conical apex:
 * - Central Apex: (50.0, 12.5)
 * Mandate 8b <= 120 lines. ViewBox: "0 0 100 170".
 */

export const TOOTH11_PERIAPICAL_GEOMETRY = {
	granuloma: {
		central: {
			core:
				"M 50.0,5.0 C 56.5,5.0 61.0,9.0 61.0,14.5 C 61.0,20.0 56.5,24.0 50.0,24.0 " +
				"C 43.5,24.0 39.0,20.0 39.0,14.5 C 39.0,9.0 43.5,5.0 50.0,5.0 Z",
			capsuleRim:
				"M 50.0,3.5 C 58.0,3.5 63.0,7.5 63.0,14.5 C 63.0,21.5 58.0,26.0 50.0,26.0 " +
				"C 42.0,26.0 37.0,21.5 37.0,14.5 C 37.0,7.5 42.0,3.5 50.0,3.5 Z",
		},
	},

	radicularCyst: {
		central: {
			lumen:
				"M 50.0,4.0 C 59.0,4.0 65.0,9.5 65.0,16.5 C 65.0,23.5 59.0,28.5 50.0,28.5 " +
				"C 41.0,28.5 35.0,23.5 35.0,16.5 C 35.0,9.5 41.0,4.0 50.0,4.0 Z",
			corticalRim:
				"M 50.0,2.5 C 60.5,2.5 67.0,8.5 67.0,16.5 C 67.0,24.5 60.5,30.0 50.0,30.0 " +
				"C 39.5,30.0 33.0,24.5 33.0,16.5 C 33.0,8.5 39.5,2.5 50.0,2.5 Z",
		},
	},
} as const;
