/**
 * DENTE Dental CRM — CAD/CAM Milled Anatomical Cusp Slopes for Tooth 46
 * Mesial light / distal shadow facets (Mandate 8b <= 120 lines).
 */

export const ZIRCONIA_CUSP_SLOPES = [
	{
		id: "mb-m",
		type: "highlight",
		d: "M 24,17 C 19.8,18.5 16,21 15,24 C 19.5,25.2 23.5,24.2 26.5,21.5 C 25.8,19 25.2,18 24,17 Z",
	},
	{
		id: "mb-d",
		type: "shadow",
		d: "M 24,17 C 28.5,19 33.5,21 38,22.5 C 36.8,27.5 34.5,31 31.5,28 C 27.8,24.5 25,20.2 24,17 Z",
	},
	{
		id: "ml-m",
		type: "highlight",
		d: "M 32,9 C 27.2,11 23.2,13 22,15 C 24.8,17 27.8,19 32,20 C 32.8,16 32.8,12 32,9 Z",
	},
	{
		id: "ml-d",
		type: "shadow",
		d: "M 32,9 C 35.8,13 39.5,18 42,22 C 44.8,19 46.8,15 48,12 C 42.2,10 37.2,9 32,9 Z",
	},
	{
		id: "db-m",
		type: "highlight",
		d: "M 50,18 C 46.2,19.5 43.2,21 41,22.8 C 40.5,26.5 44.2,25 50,18 Z",
	},
	{
		id: "db-d",
		type: "shadow",
		d: "M 50,18 C 52.8,19.5 55.8,21 59,22.2 C 57.8,26.5 54.2,25 50,18 Z",
	},
	{
		id: "dl-m",
		type: "highlight",
		d: "M 62,10 C 57.2,10.5 52.2,11 48,12 C 49.8,16 51,19 52,22.2 C 55.8,18 58.8,14 62,10 Z",
	},
	{
		id: "dl-d",
		type: "shadow",
		d: "M 62,10 C 65.8,11 69.8,13 73,14 C 71.2,17 69.2,20 68,22.5 C 65.8,18 63.8,14 62,10 Z",
	},
	{
		id: "d-m",
		type: "highlight",
		d: "M 75,21.5 C 71.2,21.8 67.2,22 62,22.2 C 63.8,25.2 67.8,25.2 75,21.5 Z",
	},
	{
		id: "d-d",
		type: "shadow",
		d: "M 75,21.5 C 77.8,22 80.8,22.5 83,23 C 81.2,25.8 78.2,25.8 75,21.5 Z",
	},
] as const;
