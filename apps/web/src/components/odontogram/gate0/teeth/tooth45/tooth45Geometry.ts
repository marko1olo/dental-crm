/**
 * DENTE Dental CRM — Wheeler Ch. 11 Mandibular Second Premolar (Tooth 45 / FDI 45 & 35)
 * Anatomical scale: 7.0mm crown width (50px width: X=25..75).
 * Crown Monolith (50px, 3 cusps), Y-fissure Pattern & Single Conical Root.
 * Mandate 8b: Strictly <= 120 lines. ViewBox: "0 0 100 170".
 */

export const TOOTH45_GEOMETRY = {
	viewBox: "0 0 100 170",
	// Width 50px (X = 25..75). Rounded ovoid contour with prominent buccal cusp
	crownMonolithPath:
		"M 28.0,74.0 " +
		"C 25.0,66.0 24.5,52.0 25.5,38.0 " +
		"C 26.0,26.0 32.0,22.0 40.0,20.0 " +
		"C 44.0,19.0 47.0,18.0 49.5,18.0 " +
		"C 52.0,18.0 55.0,19.0 59.0,20.0 " +
		"C 67.0,22.0 74.0,26.0 74.5,38.0 " +
		"C 75.5,52.0 75.0,66.0 72.0,74.0 " +
		"C 67.0,75.5 59.0,76.5 50.0,76.5 " +
		"C 41.0,76.5 33.0,75.5 28.0,74.0 Z",
	// Crown path with wedge abfraction defect at cervical margin
	crownMonolithPathWithAbfraction:
		"M 28.0,74.0 " +
		"L 28.0,73.5 L 32.5,70.8 L 26.0,67.2 " +
		"C 25.0,66.0 24.5,52.0 25.5,38.0 " +
		"C 26.0,26.0 32.0,22.0 40.0,20.0 " +
		"C 44.0,19.0 47.0,18.0 49.5,18.0 " +
		"C 52.0,18.0 55.0,19.0 59.0,20.0 " +
		"C 67.0,22.0 74.0,26.0 74.5,38.0 " +
		"C 75.5,52.0 75.0,66.0 72.0,74.0 " +
		"C 67.0,75.5 59.0,76.5 50.0,76.5 " +
		"C 41.0,76.5 33.0,75.5 28.0,74.0 Z",
	// Single powerful conical root tapering smoothly to apex at (42.0, 147.5) with pronounced distal tilt to the left
	rootMonolithPath:
		"M 28.0,74.0 " +
		"C 28.5,92.0 30.5,114.0 35.0,132.0 " +
		"C 37.5,141.0 39.5,146.0 42.0,147.5 " +
		"C 44.5,147.7 47.5,146.5 50.5,144.5 " +
		"C 55.5,141.0 60.5,134.0 64.0,126.0 " +
		"C 69.5,110.0 72.0,92.0 72.0,74.0 " +
		"C 67.0,75.5 59.0,76.5 50.0,76.5 " +
		"C 41.0,76.5 33.0,75.5 28.0,74.0 Z",
	cejPath: "M 28.0,74.0 C 35.0,75.8 42.0,76.5 50.0,76.5 C 58.0,76.5 65.0,75.8 72.0,74.0",
	cejCurve: "M 28.0,74.0 C 35.0,75.8 42.0,76.5 50.0,76.5 C 58.0,76.5 65.0,75.8 72.0,74.0",
	apex: { x: 42.0, y: 147.5 },
	apices: [{ x: 42.0, y: 147.5, r: 9.0 }] as const,
	cervicalShoulderPath:
		"M 28.0,74.0 C 35.0,75.8 42.0,76.5 50.0,76.5 C 58.0,76.5 65.0,75.8 72.0,74.0 " +
		"L 71.5,71.5 C 65.0,73.5 58.0,74.0 50.0,74.0 C 42.0,74.0 35.0,73.5 28.5,71.5 Z",
	compositeFillingPath:
		"M 37.0,23.0 C 42.0,21.0 47.0,21.0 50.0,22.0 C 53.0,21.0 58.0,21.0 63.0,23.0 C 61.5,27.0 56.5,28.0 50.0,28.0 C 43.5,28.0 38.5,27.0 37.0,23.0 Z",
	// Central longitudinal root depression groove with pronounced distal tilt
	rootSulcus: "M 50.5,80.0 C 48.5,100.0 45.5,122.0 42.0,142.0",
	rootSulcusHighlight: "M 51.5,82.0 C 49.5,101.0 46.5,122.0 43.0,141.0",
	// Buccal cervical ridge convexity in cervical third
	buccalCervicalRidge:
		"M 28.0,74.0 C 31.0,68.0 40.0,63.0 50.0,63.0 C 60.0,63.0 69.0,68.0 72.0,74.0 C 63.0,72.2 37.0,72.2 28.0,74.0 Z",
	cervicalRidgeHighlight: "M 29.0,72.0 C 33.0,67.0 40.0,64.0 50.0,64.0 C 60.0,64.0 67.0,68.0 71.0,72.0",
	// Classical Y-shaped fissure pattern of the 3-cusp mandibular 2nd premolar
	fissuresYPattern: [
		{ id: "sulcus-mesialis", d: "M 49.5,23.5 C 44.5,22.0 40.0,22.0 35.0,23.0" },
		{ id: "sulcus-distalis", d: "M 49.5,23.5 C 54.5,22.0 59.0,22.0 64.0,23.0" },
		{ id: "sulcus-lingualis-y", d: "M 49.5,23.5 L 49.5,31.0" },
	],
	yFissureStem: "M 49.5,23.5 L 49.5,31.0",
	yFissureMesialArm: "M 49.5,23.5 C 44.5,22.0 40.0,22.0 35.0,23.0",
	yFissureDistalArm: "M 49.5,23.5 C 54.5,22.0 59.0,22.0 64.0,23.0",
	centralPit: { x: 49.5, y: 23.5, cx: 49.5, cy: 23.5, r: 1.2 },
	mesialPit: { x: 35.0, y: 23.0 },
	distalPit: { x: 64.0, y: 23.0 },
	zirconiaCrownShell:
		"M 28,74.5 C 24,67 22,54 22,38 C 22.5,28 26,19 36,17 C 42,16 46,14.5 50,14.5 " +
		"C 54,14.5 58,16 64,17 C 74,19 77.5,28 78,38 C 78,54 76,67 72,74.5 C 60,76.5 40,76.5 28,74.5 Z",
	crownCuspSlopes: [
		{ id: "buccal-m", d: "M 50,14.5 C 44,16 38,18 34,22 C 38,24 44,23 50,22 Z", type: "highlight" as const },
		{ id: "buccal-d", d: "M 50,14.5 C 56,16 62,18 66,22 C 62,24 56,23 50,22 Z", type: "shadow" as const },
		{ id: "ml-cusp", d: "M 36,17 C 32,19 28,21 26,24 C 30,25 35,24 38,23 Z", type: "highlight" as const },
		{ id: "dl-cusp", d: "M 64,17 C 68,19 72,21 74,24 C 70,25 65,24 62,23 Z", type: "shadow" as const },
	],
	crownSpecularRidges: [
		{ id: "buccal-crest", d: "M 36,17 C 43,15 47,14.5 50,14.5 C 53,14.5 57,15 64,17" },
		{ id: "buccal-ridge", d: "M 50,14.5 L 50,22" },
		{ id: "lingual-crest", d: "M 38,23 C 44,24 56,24 62,23" },
	],
	crownEquatorHighlight: "M 30,52 C 40,56 60,56 70,52",
	postShaft: "M 48.8,52.0 L 51.2,52.0 C 51.2,74.0 49.8,96.0 46.8,120.0 L 44.4,120.0 C 47.4,96.0 48.8,74.0 48.8,52.0 Z",
	coreStump: "M 33.0,73.5 C 33.5,60.0 36.0,48.0 42.0,38.0 C 46.0,37.5 54.0,37.5 58.0,38.0 C 64.0,48.0 66.5,60.0 67.0,73.5 C 61.0,75.5 55.0,76.0 50.0,76.0 C 45.0,76.0 39.0,75.5 33.0,73.5 Z",
} as const;
