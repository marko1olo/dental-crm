/**
 * DENTE Dental CRM — Wheeler Ch. 11 Mandibular First Premolar (Tooth 44 / FDI 44 & 34)
 * Anatomical scale: 7.0mm crown width (48px width: X=26..74).
 * Sharp buccal cusp with inward slope, crista transversa & single conical root.
 * Mandate 8b: Strictly <= 120 lines. ViewBox: "0 0 100 170".
 */

export const TOOTH44_GEOMETRY = {
	viewBox: "0 0 100 170",
	// Width 48px (X = 26..74). Pointed sharp buccal cusp with inward slope
	crownMonolithPath:
		"M 26,74 " +
		"C 24.5,66 24.0,52 25.0,38 " +
		"C 25.5,26 31.0,22.0 38,19.5 " +
		"C 43.0,18.0 46.5,17.2 49,17.2 " +
		"C 51.5,17.2 55.0,18.0 60,19.5 " +
		"C 67.0,22.0 73.5,26 74.0,38 " +
		"C 75.0,52 74.5,66 74,74 " +
		"C 70,75.5 62,76.5 50,76.5 " +
		"C 38,76.5 30,75.5 26,74 Z",
	// Crown path with wedge abfraction notch at cervical margin
	crownMonolithPathWithAbfraction:
		"M 26,74 " +
		"L 26.0,73.5 L 30.0,70.8 L 24.5,67.2 " +
		"C 24.5,66 24.0,52 25.0,38 " +
		"C 25.5,26 31.0,22.0 38,19.5 " +
		"C 43.0,18.0 46.5,17.2 49,17.2 " +
		"C 51.5,17.2 55.0,18.0 60,19.5 " +
		"C 67.0,22.0 73.5,26 74.0,38 " +
		"C 75.0,52 74.5,66 74,74 " +
		"C 70,75.5 62,76.5 50,76.5 " +
		"C 38,76.5 30,75.5 26,74 Z",
	// Single conical root tapering smoothly to apex at (51.0, 147.5)
	rootMonolithPath:
		"M 26,74 " +
		"C 28.0,92 34.0,114 41,133 " +
		"C 44.5,143 47.5,147.0 49.5,147.5 " +
		"C 50.5,147.7 51.5,147.7 52.5,147.5 " +
		"C 54.5,147.0 57.5,143 61,133 " +
		"C 68.0,114 72.0,92 74,74 " +
		"C 70,75.5 62,76.5 50,76.5 " +
		"C 38,76.5 30,75.5 26,74 Z",
	cejPath: "M 26,74 C 34,75.5 42,76.0 50,76.0 C 58,76.0 66,75.5 74,74",
	cejCurve: "M 26,74 C 34,75.5 42,76.0 50,76.0 C 58,76.0 66,75.5 74,74",
	apex: { x: 51.0, y: 147.5 },
	apices: [{ x: 51.0, y: 147.5, r: 9.5 }] as const,
	cervicalShoulderPath:
		"M 26,74 C 34,75.5 42,76.0 50,76.0 C 58,76.0 66,75.5 74,74 L 73.5,71.5 C 66,73.5 58,74.0 50,74.0 C 42,74.0 34,73.5 26.5,71.5 Z",
	compositeFillingPath:
		"M 38,22 C 42,20 47,19 50,20 C 53,19 58,20 62,23 C 61,27 56,29 50,29 C 44,29 39,27 38,22 Z",
	// Longitudinal root depression groove
	rootSulcus: "M 50,80 C 49.5,100 50.2,122 51,142",
	rootSulcusHighlight: "M 51.2,82 C 50.8,101 51.5,122 52.0,141",
	// Buccal cervical ridge convexity in cervical third
	buccalCervicalRidge:
		"M 26,74 C 29,68 38,63.0 50,63.0 C 62,63.0 71,68 74,74 C 65,72.2 35,72.2 26,74 Z",
	cervicalRidgeHighlight: "M 27,72 C 30,67.0 38,64.0 50,64.0 C 62,64.0 70,68.0 73,72",
	// Transverse ridge (crista transversa) connecting buccal & lingual cusps
	transverseRidge: "M 47,17.2 C 48.0,20.0 49.0,22.8 50,25.5",
	transverseRidgeHighlight: "M 47.8,18.0 C 48.8,20.5 49.5,23.0 50.5,25.5",
	// Two distinct fossae: mesial (with mesiolingual groove) and distal
	fossaeAndGrooves: [
		{
			id: "fossa-mesialis",
			d: "M 38,23.0 C 41,21.5 44,22.0 46,23.5 C 44,25.2 41,25.5 38,24.5 Z",
		},
		{
			id: "sulcus-mesiolingualis",
			d: "M 39,24.0 C 37,26.0 34,28.5 32,31.5",
		},
		{
			id: "fossa-distalis",
			d: "M 58,23.0 C 55,21.5 52,22.0 50,23.5 C 52,25.2 55,25.5 58,24.5 Z",
		},
		{
			id: "sulcus-distalis",
			d: "M 57,24.0 C 59,26.0 62,28.5 64,31.0",
		},
	],
} as const;
