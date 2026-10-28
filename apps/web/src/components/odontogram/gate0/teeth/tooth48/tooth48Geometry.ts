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
	// Fused conical root with smooth tapered waist and distal hook at apical third
	rootMonolithPath:
		"M 16,74 " +
		"C 17.5,88 20.5,104 25.0,118 " +
		"C 28.5,129 32.5,138 36.0,144.5 " +
		"C 37.5,146.5 40.5,146.5 42.0,144.5 " +
		"C 46.5,138 55.0,128 64.0,116 " +
		"C 73.0,102 81.0,88 84,74 " +
		"C 80,75.5 68,76.5 50,76.5 " +
		"C 32,76.5 20,75.5 16,74 Z",
	cejPath: "M 16,74 C 28,76 38,76.5 50,76.5 C 62,76.5 72,76 84,74",
	cejCurve: "M 16,74 C 28,76 38,76.5 50,76.5 C 62,76.5 72,76 84,74",
	apex: { x: 39.0, y: 145.5 },
	distalCurvedApex: { x: 39.0, y: 145.5 },
	apices: [{ x: 39.0, y: 145.5, r: 9.5 }] as const,
	cervicalShoulderPath:
		"M 16,74 C 28,76 38,76.5 50,76.5 C 62,76.5 72,76 84,74 L 83.5,71.5 C 72,73.5 62,74.0 50,74.0 C 38,74.0 28,73.5 16.5,71.5 Z",
	// Sculpted CAD/CAM zirconia crown shell with 4 distinct cusp tips
	zirconiaCrownShell:
		"M 16,74 C 13.8,66 13,52 14,38 C 14.8,28 18,19 24,18 C 28,14 31,12 36,13 " +
		"C 42,14 45,17 49,18 C 53,16 58,13 64,14 C 70,14 74,17 78,19 " +
		"C 84,20 86,29 86,38 C 87,52 86.2,66 84,74 C 68,76.5 32,76.5 16,74 Z",
	compositeFillingPath:
		"M 28,22 C 36,21 44,21 50,22 C 56,21 64,21 72,22 C 70,26 62,27 50,27 C 38,27 30,26 28,22 Z",
	// Developmental sulcus down the conical root trunk into distal curve
	fusedRootSulcus: "M 50,78 C 50,98 47,120 40.5,143",
	fusedRootHighlight: "M 51,80 C 51,99 48,121 41.5,142",
	buccalCervicalRidge:
		"M 16,74 C 20,68 35,63.0 50,63.0 C 65,63.0 80,68 84,74 C 70,72.2 30,72.2 16,74 Z",
	cervicalRidgeHighlight: "M 17,72 C 22,67.0 35,64.0 50,64.0 C 65,64.0 78,68.0 83,72",
	fissuresCrenulated: [
		{ id: "sulcus-centralis", d: "M 27,22.0 C 35,22.8 43,23.2 50,22.5 C 57,21.8 65,22.4 73,22.2" },
		{ id: "sulcus-buccalis", d: "M 44,22.8 C 43,26.5 42,30.0 41,33.5" },
		{ id: "sulcus-lingualis", d: "M 54,22.2 C 54.5,18.5 55,16.0 55,13.5" },
		{ id: "cren-m", d: "M 34,22.6 C 32,25.0 30,26.5 28,27.5 M 27,22 C 23,20.5 21,22 19,24" },
		{ id: "cren-d", d: "M 63,22.3 C 65,24.8 67,26.5 69,27.5 M 73,22 C 77,20.5 79,22 81,24" },
	],
	foramenCaecum: { cx: 50.2, cy: 33.0, r: 0.8 },
	crownCuspSlopes: [
		{ id: "mb-m", d: "M 24,18 C 19,20 16,22 15,26 C 20,26 23,24 26,22 Z", type: "highlight" as const },
		{ id: "mb-d", d: "M 24,18 C 28,20 32,21 36,22 C 34,25.5 31,27.5 27,26 Z", type: "shadow" as const },
		{ id: "ml-m", d: "M 36,13 C 31,15 28,17 26,19 C 30,20 33,21 36,22 Z", type: "highlight" as const },
		{ id: "ml-d", d: "M 36,13 C 40,16 44,18 47,21 C 44,22 40,22 36,22 Z", type: "shadow" as const },
		{ id: "db-m", d: "M 49,22 C 53,20.5 59,19.5 65,19 C 63,22 60,24 56,25 Z", type: "highlight" as const },
		{ id: "db-d", d: "M 65,19 C 71,19 75,21 81,24 C 76,25.5 72,25.5 67,24 Z", type: "shadow" as const },
		{ id: "dl-m", d: "M 64,14 C 59,16 55,18 51,21 C 55,22 60,22 64,14 Z", type: "highlight" as const },
		{ id: "dl-d", d: "M 64,14 C 68,16 72,18 75,20 C 72,22 68,23 64,22 Z", type: "shadow" as const },
	],
	crownSpecularRidges: [
		{ id: "mb", d: "M 23,19 C 27,20 32,21 37,22" },
		{ id: "ml", d: "M 35,14 C 37,16 39,19 41,22" },
		{ id: "db", d: "M 53,22 C 59,21 65,20 71,19" },
		{ id: "dl", d: "M 63,15 C 61,17 58,19 55,22" },
	],
	crownEquatorHighlight: "M 18,50 C 33,54 67,54 82,50",
	postShaft: "M 60.8,52.0 L 63.2,52.0 C 63.5,71.0 59.5,92.0 49.5,118.0 L 46.5,118.0 C 56.5,92.0 60.5,71.0 60.8,52.0 Z",
	coreStump: "M 24.0,74.0 C 25.0,60.0 28.0,48.0 33.0,39.0 C 40.0,37.5 45.0,39.0 50.0,39.0 C 55.0,39.0 60.0,37.5 67.0,39.0 C 72.0,48.0 75.0,60.0 76.0,74.0 C 68.0,75.5 50.0,76.5 24.0,74.0 Z",
} as const;
