/**
 * Periapical Pathology Geometry for Upper Second Premolar Tooth 15
 * Authentic osteolytic patterns for Radicular Cyst and Granuloma on single apex:
 * - Single Apex: (50.5, 13.0)
 * Mandate 8b <= 120 lines. ViewBox: "0 0 100 170".
 */

export const TOOTH15_PERIAPICAL_GEOMETRY = {
	granuloma: {
		palatal: {
			core:
				"M 50.5,6.5 C 56.5,6.5 60.5,10.5 60.5,15.5 C 60.5,20.5 56.0,24.5 50.5,24.5 " +
				"C 45.0,24.5 40.5,20.5 40.5,15.5 C 40.5,10.5 45.0,6.5 50.5,6.5 Z",
			capsuleRim:
				"M 50.5,4.5 C 58.0,4.5 62.5,9.0 62.5,15.5 C 62.5,22.0 57.5,26.5 50.5,26.5 " +
				"C 43.5,26.5 38.5,22.0 38.5,15.5 C 38.5,9.0 43.5,4.5 50.5,4.5 Z",
		},
		mb: { core: "", capsuleRim: "" },
		db: { core: "", capsuleRim: "" },
	},

	radicularCyst: {
		palatal: {
			lumen:
				"M 50.5,5.0 C 59.0,5.0 64.5,11.0 64.5,17.5 C 64.5,24.0 58.5,28.5 50.5,28.5 " +
				"C 42.5,28.5 36.5,24.0 36.5,17.5 C 36.5,11.0 42.5,5.0 50.5,5.0 Z",
			corticalRim:
				"M 50.5,3.5 C 60.5,3.5 66.5,10.0 66.5,17.5 C 66.5,25.5 59.5,30.5 50.5,30.5 " +
				"C 41.5,30.5 34.5,25.5 34.5,17.5 C 34.5,10.0 41.5,3.5 50.5,3.5 Z",
		},
		mb: { lumen: "", corticalRim: "" },
	},
} as const;
