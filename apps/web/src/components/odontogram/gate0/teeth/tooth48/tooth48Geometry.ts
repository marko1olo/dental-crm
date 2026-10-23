/**
 * DENTE Dental CRM — Wheeler Ch. 11 Mandibular Third Molar (Tooth 48 / FDI 48 & 38)
 * Crown Monolith (72px, 4 rounded cusps) & Fused Conical Roots with Distal Apex Curvature.
 * Mandate 8b: Strictly <= 120 lines. ViewBox: "0 0 100 170".
 */

export const TOOTH48_GEOMETRY = {
	viewBox: "0 0 100 170",
	// Width 72px (X = 14..86). Bulbous rounded contours with constricted occlusal table
	crownMonolithPath:
		"M 16,74 " +
		"C 13.8,66 13.0,52 14.0,38 " +
		"C 14.8,27 20.0,19.5 30,19.5 " +
		"C 37.0,19.5 43.5,21.0 50,22.5 " +
		"C 56.5,21.0 63.0,19.5 70,19.5 " +
		"C 80.0,19.5 85.2,27 86.0,38 " +
		"C 87.0,52 86.2,66 84,74 " +
		"C 80,75.5 68,76.5 50,76.5 " +
		"C 32,76.5 20,75.5 16,74 Z",
	crownMonolithPathWithAbfraction:
		"M 16,74 " +
		"L 16.0,73.5 L 21.0,70.8 L 13.8,67.2 " +
		"C 13.8,66 13.0,52 14.0,38 " +
		"C 14.8,27 20.0,19.5 30,19.5 " +
		"C 37.0,19.5 43.5,21.0 50,22.5 " +
		"C 56.5,21.0 63.0,19.5 70,19.5 " +
		"C 80.0,19.5 85.2,27 86.0,38 " +
		"C 87.0,52 86.2,66 84,74 " +
		"C 80,75.5 68,76.5 50,76.5 " +
		"C 32,76.5 20,75.5 16,74 Z",
	// Fused conical root mass tapering with balanced distal curvature towards apex at (60.5, 148.0)
	rootMonolithPath:
		"M 16,74 " +
		"C 17.5,92 23.5,114 34,134 " +
		"C 40.0,143 48.0,147.5 57,148.2 " +
		"C 61.5,148.5 64.5,147.0 67,145.0 " +
		"C 72.0,136 76.5,116 80,94 " +
		"C 81.5,85 83.0,78 84,74 " +
		"C 80,75.5 68,76.5 50,76.5 " +
		"C 32,76.5 20,75.5 16,74 Z",
	cejPath: "M 16,74 C 28,76 38,76.5 50,76.5 C 62,76.5 72,76 84,74",
	cejCurve: "M 16,74 C 28,76 38,76.5 50,76.5 C 62,76.5 72,76 84,74",
	apex: { x: 60.5, y: 148.0 },
	distalCurvedApex: { x: 60.5, y: 148.0 },
	// Longitudinal developmental fusion groove following the distal sweep
	fusedRootSulcus: "M 48,80 C 48,100 52,122 59,142",
	fusedRootHighlight: "M 49.5,82 C 49.5,101 53.5,122 60,141",
	buccalCervicalRidge:
		"M 16,74 C 20,68 35,63.0 50,63.0 C 65,63.0 80,68 84,74 C 70,72.2 30,72.2 16,74 Z",
	cervicalRidgeHighlight: "M 17,72 C 22,67.0 35,64.0 50,64.0 C 65,64.0 78,68.0 83,72",
	fissuresCrenulated: [
		{
			id: "sulcus-centralis",
			d: "M 26,22.0 C 34,22.2 42,22.6 50,22.8 C 58,22.6 66,22.2 74,22.0",
		},
		{
			id: "sulcus-buccalis",
			d: "M 50,22.8 C 49.8,26.5 50.0,30.0 50.2,33.0",
		},
		{
			id: "sulcus-lingualis",
			d: "M 50,22.8 C 50,19.0 50,16.5 50,14.0",
		},
		{
			id: "crenulation-mesial",
			d: "M 38,22.4 C 36,25.0 34,27.0 32,28.5 M 26,22.0 C 22,20.5 20,22.0 18,24.0",
		},
		{
			id: "crenulation-distal",
			d: "M 62,22.4 C 64,25.0 66,27.0 68,28.5 M 74,22.0 C 78,20.5 80,22.0 82,24.0",
		},
	],
	foramenCaecum: { cx: 50.2, cy: 33.0, r: 0.8 },
} as const;
