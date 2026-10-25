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
	// Fused conical root mass sweeping strongly distally to the left towards apex at (34.0, 148.0)
	rootMonolithPath:
		"M 16,74 " +
		"C 16.5,88 18.0,105 21.0,122 " +
		"C 23.5,134 27.0,144 32.0,147.5 " +
		"C 34.0,148.5 36.5,148.5 38.5,147.0 " +
		"C 46.0,140.0 57.0,122.0 68.0,102.0 " +
		"C 75.0,88.0 81.0,80.0 84,74 " +
		"C 80,75.5 68,76.5 50,76.5 " +
		"C 32,76.5 20,75.5 16,74 Z",
	cejPath: "M 16,74 C 28,76 38,76.5 50,76.5 C 62,76.5 72,76 84,74",
	cejCurve: "M 16,74 C 28,76 38,76.5 50,76.5 C 62,76.5 72,76 84,74",
	apex: { x: 34.0, y: 148.0 },
	distalCurvedApex: { x: 34.0, y: 148.0 },
	apices: [{ x: 34.0, y: 148.0, r: 9.5 }] as const,
	cervicalShoulderPath:
		"M 16,74 C 28,76 38,76.5 50,76.5 C 62,76.5 72,76 84,74 L 83.5,71.5 C 72,73.5 62,74.0 50,74.0 C 38,74.0 28,73.5 16.5,71.5 Z",
	compositeFillingPath:
		"M 28,22 C 36,21 44,21 50,22 C 56,21 64,21 72,22 C 70,26 62,27 50,27 C 38,27 30,26 28,22 Z",
	// Longitudinal developmental fusion groove following the distal sweep to the left
	fusedRootSulcus: "M 48,80 C 46,98 42,120 35.5,143",
	fusedRootHighlight: "M 49.5,82 C 47.5,99 43.5,120 37.0,142",
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
	crownCuspSlopes: [
		{ id: "mb", d: "M 22,21 C 28,18 38,20 46,22 C 38,25 28,24 22,21 Z", type: "highlight" as const },
		{ id: "db", d: "M 54,22 C 62,20 72,18 78,21 C 72,24 62,25 54,22 Z", type: "shadow" as const },
	],
	crownSpecularRidges: [
		{ id: "mb", d: "M 24,18 C 30,19.5 38,21 46,22" },
		{ id: "db", d: "M 54,22 C 62,21 70,19.5 76,18" },
	],
	crownEquatorHighlight: "M 19,50 C 34,54 66,54 81,50",
} as const;
