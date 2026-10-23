/**
 * DENTE Dental CRM — Wheeler Ch. 11 Mandibular Second Premolar (Tooth 45 / FDI 45 & 35)
 * Crown Monolith (72px, 3 cusps), Y-fissure Pattern & Single Conical Root.
 * Mandate 8b: Strictly <= 120 lines. ViewBox: "0 0 100 170".
 */

export const TOOTH45_GEOMETRY = {
	viewBox: "0 0 100 170",
	// Width 72px (X = 14..86). Rounded ovoid contour with prominent buccal cusp
	crownMonolithPath:
		"M 16,74 " +
		"C 13.8,66 13.0,52 14.0,38 " +
		"C 14.8,26 22.0,22.0 34,20.0 " +
		"C 41.0,19.0 45.0,18.0 48,18.0 " +
		"C 51.0,18.0 55.0,19.0 62,20.0 " +
		"C 74.0,22.0 85.2,26 86.0,38 " +
		"C 87.0,52 86.2,66 84,74 " +
		"C 80,75.5 68,76.5 50,76.5 " +
		"C 32,76.5 20,75.5 16,74 Z",
	// Crown path with wedge abfraction defect at cervical margin
	crownMonolithPathWithAbfraction:
		"M 16,74 " +
		"L 16.0,73.5 L 21.0,70.8 L 13.8,67.2 " +
		"C 13.8,66 13.0,52 14.0,38 " +
		"C 14.8,26 22.0,22.0 34,20.0 " +
		"C 41.0,19.0 45.0,18.0 48,18.0 " +
		"C 51.0,18.0 55.0,19.0 62,20.0 " +
		"C 74.0,22.0 85.2,26 86.0,38 " +
		"C 87.0,52 86.2,66 84,74 " +
		"C 80,75.5 68,76.5 50,76.5 " +
		"C 32,76.5 20,75.5 16,74 Z",
	// Single powerful conical root tapering smoothly to apex at (51.0, 147.5)
	rootMonolithPath:
		"M 16,74 " +
		"C 18.0,92 24.0,114 34,133 " +
		"C 40.0,143 45.5,147.2 49,147.8 " +
		"C 51.0,148.0 53.0,148.0 55,147.5 " +
		"C 60.0,146.5 65.0,142 70,133 " +
		"C 78.0,114 82.0,92 84,74 " +
		"C 80,75.5 68,76.5 50,76.5 " +
		"C 32,76.5 20,75.5 16,74 Z",
	cejPath: "M 16,74 C 28,76 38,76.5 50,76.5 C 62,76.5 72,76 84,74",
	cejCurve: "M 16,74 C 28,76 38,76.5 50,76.5 C 62,76.5 72,76 84,74",
	apex: { x: 51.0, y: 147.5 },
	// Central longitudinal root depression groove
	rootSulcus: "M 50,80 C 49.5,100 50.5,122 51,142",
	rootSulcusHighlight: "M 51.5,82 C 51.0,101 52.0,122 52.2,141",
	// Buccal cervical ridge convexity in cervical third
	buccalCervicalRidge:
		"M 16,74 C 20,68 35,63.0 50,63.0 C 65,63.0 80,68 84,74 C 70,72.2 30,72.2 16,74 Z",
	cervicalRidgeHighlight: "M 17,72 C 22,67.0 35,64.0 50,64.0 C 65,64.0 78,68.0 83,72",
	// Classical Y-shaped fissure pattern of the 3-cusp mandibular 2nd premolar
	fissuresYPattern: [
		{
			id: "sulcus-mesialis",
			d: "M 49,23.5 C 41,23.2 33,22.8 25,23.0",
		},
		{
			id: "sulcus-distalis",
			d: "M 49,23.5 C 57,23.2 65,22.8 73,23.0",
		},
		{
			id: "sulcus-lingualis-y",
			d: "M 49,23.5 C 49.2,20.0 49.5,17.0 49.8,14.0",
		},
		{
			id: "fossa-triangularis-mesialis",
			d: "M 25,23.0 C 22,21.5 20,23.0 18,25.0 M 25,23.0 C 22,24.5 20,26.5 19,28.5",
		},
		{
			id: "fossa-triangularis-distalis",
			d: "M 73,23.0 C 76,21.5 78,23.0 80,25.0 M 73,23.0 C 76,24.5 78,26.5 79,28.5",
		},
	],
	centralPit: { cx: 49.0, cy: 23.5, r: 0.9 },
} as const;
