/**
 * DENTE Odontogram Tournament — Competitor #9: Sinelnikov Academic Realism
 * Path definitions, SVG geometries, gradients, and anatomical constants.
 * Authored according to R.D. Sinelnikov Human Anatomy Atlas (Dentes / Osteology).
 */

export interface SinelnikovPalette {
	readonly enamelStart: string;
	readonly enamelMid: string;
	readonly enamelEnd: string;
	readonly enamelStroke: string;
	readonly cementumStart: string;
	readonly cementumEnd: string;
	readonly rootStroke: string;
	readonly grooveStroke: string;
	readonly mamelonFill: string;
	readonly pulpFill: string;
	readonly canalFill: string;
	readonly canalStroke: string;
	readonly periodontitisHalo: string;
	readonly periodontitisCore: string;
	readonly periodontitisSclerosis: string;
	readonly tiPolishedStart: string;
	readonly tiPolishedMid: string;
	readonly tiPolishedEnd: string;
	readonly tiSlaStart: string;
	readonly tiSlaMid: string;
	readonly tiSlaEnd: string;
	readonly tiThreadStroke: string;
	readonly tiHexFill: string;
	readonly boneOutline: string;
}

export const SINELNIKOV_PALETTES: Record<"light" | "dark", SinelnikovPalette> = {
	light: {
		enamelStart: "#FFFFFF",
		enamelMid: "#FAF6ED",
		enamelEnd: "#E8DEC8",
		enamelStroke: "#6C5D47",
		cementumStart: "#E8DFC8",
		cementumEnd: "#C6B491",
		rootStroke: "#5A4B34",
		grooveStroke: "#7E6E54",
		mamelonFill: "rgba(255, 255, 255, 0.75)",
		pulpFill: "#CF6868",
		canalFill: "#DC5959",
		canalStroke: "#942323",
		periodontitisHalo: "rgba(239, 68, 68, 0.22)",
		periodontitisCore: "rgba(185, 28, 28, 0.78)",
		periodontitisSclerosis: "#B91C1C",
		tiPolishedStart: "#F8FAFC",
		tiPolishedMid: "#CBD5E1",
		tiPolishedEnd: "#94A3B8",
		tiSlaStart: "#CBD5E1",
		tiSlaMid: "#64748B",
		tiSlaEnd: "#334155",
		tiThreadStroke: "#1E293B",
		tiHexFill: "#475569",
		boneOutline: "#94A3B8",
	},
	dark: {
		enamelStart: "#F8FAFC",
		enamelMid: "#CBD5E1",
		enamelEnd: "#94A3B8",
		enamelStroke: "#334155",
		cementumStart: "#B2A180",
		cementumEnd: "#78684D",
		rootStroke: "#3A3020",
		grooveStroke: "#52442E",
		mamelonFill: "rgba(248, 250, 252, 0.65)",
		pulpFill: "#E11D48",
		canalFill: "#F43F5E",
		canalStroke: "#9F1239",
		periodontitisHalo: "rgba(248, 113, 113, 0.32)",
		periodontitisCore: "rgba(225, 29, 72, 0.88)",
		periodontitisSclerosis: "#F87171",
		tiPolishedStart: "#F8FAFC",
		tiPolishedMid: "#94A3B8",
		tiPolishedEnd: "#64748B",
		tiSlaStart: "#94A3B8",
		tiSlaMid: "#475569",
		tiSlaEnd: "#1E293B",
		tiThreadStroke: "#0F172A",
		tiHexFill: "#334155",
		boneOutline: "#475569",
	},
};

/**
 * 1. Dens incisivus medialis superior (Tooth 11)
 * Root points UP, Crown points DOWN.
 * Curvature sign: mesial slope more convex.
 * Angle sign: mesio-incisal angle sharp (~88°), disto-incisal angle rounded/obtuse.
 * Root curvature sign: apex deflected distally.
 */
export const INCISOR_11_PATHS = {
	root: "M 51 16 C 53 15 55 15 56 16.5 C 57.5 18 57 21 57 24 C 58 45 66 65 71 88 C 62 84 46 84 37 89 C 38 68 43 45 49 22 C 50 19 50.5 17 51 16 Z",
	rootGroove: "M 52 25 C 53 45 53 65 52 82",
	crown: "M 37 89 C 35 98 33 112 33 128 C 33 138 32.5 145 32 150 C 35 151 41 150.5 45 150 C 49 149.5 55 149.5 59 149 C 64 148.5 70 147.5 74 146 C 76.5 145 78 143 78 140 C 77 132 75 118 73.5 106 C 72.5 98 71.8 93 71 88 C 62 84 46 84 37 89 Z",
	mesialLobeGroove: "M 43 96 C 42 110 41 128 40 144",
	distalLobeGroove: "M 62 96 C 63 110 64 126 65 142",
	mamelonIncisalBand: "M 32 150 C 35 151 41 150.5 45 150 C 49 149.5 55 149.5 59 149 C 64 148.5 70 147.5 74 146 C 76.5 145 78 143 78 140 L 76 139 C 62 144 45 146 33 145 Z",
	perikymata1: "M 39 96 Q 54 92 69 95",
	perikymata2: "M 37 103 Q 54 99 71 102",
	mesialAngleMarker: "M 32 150 L 35 147",
};

/**
 * 2. Dens premolaris superior primus (Tooth 14)
 * Root points UP, Crown points DOWN.
 * Bifurcated roots (Radix buccalis & Radix palatalis).
 * Deep mesial developmental groove (Sulcus mesialis).
 * 2 root canals clearly visible in endodontic transillumination.
 */
export const PREMOLAR_14_PATHS = {
	roots: "M 40 16 C 41.5 15 43 15 44 17 C 46 25 47 40 52 52 C 54 55 55 56 55 56 C 55 56 56 55 58 52 C 63 41 65 26 67 18 C 68 16.5 70 16.5 71 18 C 72 23 71.5 35 72 48 C 72.5 62 74 76 75 88 C 64 83 46 83 35 88 C 36 74 37.5 58 38 46 C 38.5 34 38 23 40 16 Z",
	bifurcationShadow: "M 52 52 C 54 55 55 56 55 56 C 55 56 56 55 58 52 C 56 62 55 74 54 84",
	crown: "M 35 88 C 34 94 31.5 102 31 112 C 30.5 122 33 132 36 139 L 45 150 L 53 145 L 63 144 L 72 138 C 76 130 77 118 76.5 108 C 76 99 75.5 93 75 88 C 64 83 46 83 35 88 Z",
	centralFissure: "M 42 136 C 49 133 60 132 67 135",
	mesialMarginalGroove: "M 42 136 C 38 132 34 122 33 112",
	pulpChamber: "M 48 93 C 44 99 42 108 42 118 C 44 124 46 125 48 119 C 50 113 53 105 55 105 C 57 105 60 113 62 118 C 64 123 66 122 67 115 C 67 105 65 96 62 93 Z",
	buccalCanal: "M 48 93 C 46 76 44 50 41 20",
	palatalCanal: "M 62 93 C 64 76 67 50 70 22",
};

/**
 * 3. Dens molaris primus inferior (Tooth 46)
 * Crown points UP, Roots point DOWN.
 * 5-cusp crown with W-shaped fissure and vestibular groove with foramen caecum.
 * Curved mesial root & straighter distal root.
 * Periapical periodontitis / granuloma at mesial apex.
 */
export const MOLAR_46_PATHS = {
	crown: "M 26 65 C 24 56 23 46 24 38 C 24 28 28 22 34 22 C 40 22 44 26 47 27 C 51 25 56 23 62 23 C 67 23 71 27 74 29 C 78 28 83 30 85 36 C 87 46 86 56 84 65 C 72 68 59 71 55 72 C 51 71 38 68 26 65 Z",
	lingualCuspsRelief: "M 30 22 C 34 16 39 16 43 21 C 52 17 59 17 65 22",
	roots: "M 26 65 C 22 78 17 95 18 112 C 19 128 24 142 32 148 C 34 149.5 36 149 37 146 C 41 130 44 105 51 86 C 53 80 54 76 55 76 C 56 76 57 80 59 86 C 65 104 68 126 74 142 C 75.5 145.5 78 145.5 79 143 C 83 130 84 112 85 96 C 85.5 84 85 73 84 65 C 72 68 59 71 55 72 C 51 71 38 68 26 65 Z",
	furcationDepression: "M 55 76 C 55 86 56 98 56 112",
	mesialRootGroove: "M 28 80 C 26 100 26 120 31 138",
	distalRootGroove: "M 76 82 C 77 100 76 118 73 134",
	fissureCentral: "M 32 26 C 45 32 62 31 76 32",
	buccalGrooveForamenCaecum: "M 47 27 C 46 36 45 44 45 50",
	distobuccalGroove: "M 74 29 C 74 38 73 45 72 49",
	periodontitisHalo: "M 16 138 C 12 147 16 160 26 163 C 35 165 45 161 48 150 C 50 143 44 135 36 136 C 30 137 21 133 16 138 Z",
	periodontitisScleroticRim: "M 13 136 C 8 147 13 163 26 166 C 38 168 49 164 53 150 C 55 140 48 131 36 132 C 27 133 18 130 13 136",
	periodontitisCore: "M 23 144 C 19 149 21 157 28 159 C 34 160 40 156 42 150 C 43 145 39 141 33 142 C 29 142 25 141 23 144 Z",
};

/**
 * 4. Classic Two-Stage Dental Implant System with Gingiva Former
 * Healing abutment at top (y=16..43).
 * Platform switching at y=43.
 * Crestal micro-threads (y=44..60).
 * Tapered SLA fixture body with 8 progressive cutting threads.
 * Apical self-tapping relief flutes.
 */
export const IMPLANT_PATHS = {
	healingAbutment: "M 42 16 L 68 16 C 71 16 73 18 73 21 L 71 36 C 75 38 76 41 76 43 L 34 43 C 34 41 35 38 39 36 L 37 21 C 37 18 39 16 42 16 Z",
	hexDrive: "50,22 60,22 64,26 60,30 50,30 46,26",
	fixtureCore: "M 38 59 L 44 140 C 47 148 63 148 66 140 L 72 59 Z",
	microgrooves: [
		{ x1: 37, y1: 47, x2: 73, y2: 47 },
		{ x1: 37.3, y1: 51, x2: 72.7, y2: 51 },
		{ x1: 37.6, y1: 55, x2: 72.4, y2: 55 },
		{ x1: 38, y1: 59, x2: 72, y2: 59 },
	],
	macrothreads: [
		"M 36 67 L 74 69 L 71 72 L 39 70 Z",
		"M 37 77 L 73 79 L 70 82 L 40 80 Z",
		"M 38 87 L 72 89 L 69 92 L 41 90 Z",
		"M 39 97 L 71 99 L 68 102 L 42 100 Z",
		"M 40 107 L 70 109 L 67 112 L 43 110 Z",
		"M 41 117 L 69 119 L 66 122 L 44 120 Z",
		"M 42 127 L 68 129 L 65 132 L 45 130 Z",
		"M 43 135 L 67 137 L 64 139 L 46 138 Z",
	],
	leftCuttingFlute: "M 44 124 L 48 141 L 51 126 Z",
	rightCuttingFlute: "M 66 124 L 62 141 L 59 126 Z",
	alveolarBoneL: "M 16 46 C 26 44 34 44 37 45",
	alveolarBoneR: "M 73 45 C 76 44 84 44 94 46",
};
