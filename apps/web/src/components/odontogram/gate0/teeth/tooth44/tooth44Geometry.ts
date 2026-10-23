/**
 * DENTE Dental CRM — Wheeler Ch. 11 Mandibular First Premolar (Tooth 44 / FDI 44 & 34)
 * Crown Monolith (70px, sharp buccal cusp), Transverse Ridge & Single Conical Root.
 * Mandate 8b: Strictly <= 120 lines. ViewBox: "0 0 100 170".
 */

export const TOOTH44_GEOMETRY = {
	viewBox: "0 0 100 170",
	// Width 70px (X = 15..85). Pointed sharp buccal cusp with inward slope
	crownMonolithPath:
		"M 17,74 " +
		"C 14.5,66 14.0,52 15.0,38 " +
		"C 15.5,26 21.0,22.0 32,19.5 " +
		"C 39.0,18.0 43.5,17.2 47,17.2 " +
		"C 50.5,17.2 55.0,18.0 62,19.5 " +
		"C 73.0,22.0 84.5,26 85.0,38 " +
		"C 86.0,52 85.5,66 83,74 " +
		"C 79,75.5 67,76.5 50,76.5 " +
		"C 33,76.5 21,75.5 17,74 Z",
	// Crown path with wedge abfraction notch at cervical margin
	crownMonolithPathWithAbfraction:
		"M 17,74 " +
		"L 17.0,73.5 L 22.0,70.8 L 14.8,67.2 " +
		"C 14.5,66 14.0,52 15.0,38 " +
		"C 15.5,26 21.0,22.0 32,19.5 " +
		"C 39.0,18.0 43.5,17.2 47,17.2 " +
		"C 50.5,17.2 55.0,18.0 62,19.5 " +
		"C 73.0,22.0 84.5,26 85.0,38 " +
		"C 86.0,52 85.5,66 83,74 " +
		"C 79,75.5 67,76.5 50,76.5 " +
		"C 33,76.5 21,75.5 17,74 Z",
	// Single conical root tapering smoothly to apex at (51.0, 147.5)
	rootMonolithPath:
		"M 17,74 " +
		"C 19.0,92 25.0,114 35,133 " +
		"C 41.0,143 46.0,147.0 49.5,147.5 " +
		"C 50.5,147.7 51.5,147.7 52.5,147.5 " +
		"C 56.0,147.0 61.0,143 67,133 " +
		"C 77.0,114 81.0,92 83,74 " +
		"C 79,75.5 67,76.5 50,76.5 " +
		"C 33,76.5 21,75.5 17,74 Z",
	cejPath: "M 17,74 C 28,76 38,76.5 50,76.5 C 62,76.5 72,76 83,74",
	cejCurve: "M 17,74 C 28,76 38,76.5 50,76.5 C 62,76.5 72,76 83,74",
	apex: { x: 51.0, y: 147.5 },
	apices: [{ x: 50.8, y: 147.5, r: 9.5 }] as const,
	cervicalShoulderPath:
		"M 17,74 C 28,76 38,76.5 50,76.5 C 62,76.5 72,76 83,74 L 82.5,71.5 C 72,73.5 62,74.0 50,74.0 C 38,74.0 28,73.5 17.5,71.5 Z",
	compositeFillingPath:
		"M 32,22 C 38,20 46,19 50,20 C 54,19 62,20 66,23 C 65,27 58,29 50,29 C 42,29 34,27 32,22 Z",
	// Longitudinal root depression groove
	rootSulcus: "M 50,80 C 49.5,100 50.2,122 51,142",
	rootSulcusHighlight: "M 51.2,82 C 50.8,101 51.5,122 52.0,141",
	// Buccal cervical ridge convexity in cervical third
	buccalCervicalRidge:
		"M 17,74 C 21,68 35,63.0 50,63.0 C 65,63.0 79,68 83,74 C 70,72.2 30,72.2 17,74 Z",
	cervicalRidgeHighlight: "M 18,72 C 23,67.0 35,64.0 50,64.0 C 65,64.0 77,68.0 82,72",
	// Transverse ridge (crista transversa) connecting buccal & lingual cusps
	transverseRidge: "M 47,17.2 C 48.0,20.0 49.0,22.8 50,25.5",
	transverseRidgeHighlight: "M 47.8,18.0 C 48.8,20.5 49.5,23.0 50.5,25.5",
	// Two distinct fossae: mesial (with mesiolingual groove) and distal
	fossaeAndGrooves: [
		{
			// Mesial circular fossa cup
			id: "fossa-mesialis",
			d: "M 32,23.0 C 37,21.5 42,22.0 45,23.5 C 42,25.2 37,25.5 32,24.5 Z",
		},
		{
			// Mesiolingual developmental groove (characteristic of tooth 44)
			id: "sulcus-mesiolingualis",
			d: "M 34,24.0 C 31,26.0 27,28.5 24,31.5",
		},
		{
			// Distal circular fossa cup
			id: "fossa-distalis",
			d: "M 62,23.0 C 57,21.5 52,22.0 49,23.5 C 52,25.2 57,25.5 62,24.5 Z",
		},
		{
			// Distal developmental groove
			id: "sulcus-distalis",
			d: "M 60,24.0 C 63,26.0 67,28.5 70,31.0",
		},
	],
} as const;
