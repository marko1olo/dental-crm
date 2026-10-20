/**
 * DENTE Odontogram Tournament - Competitor #4: CAD/CAM Bio-Engineering
 * Pure mathematical Bezier vectors, biological dimensions, and Straumann SLA engineering data.
 * ZERO JSX - Pure TypeScript contracts and path constants.
 */

export interface CadCamPalette {
	readonly isDark: boolean;
	readonly strokePrimary: string;
	readonly strokeSecondary: string;
	readonly technical: string;
	readonly cadText: string;
	readonly cej: string;
	readonly pulp: string;
	readonly enamelMid: string;
	readonly enamelEnd: string;
	readonly dentinStart: string;
	readonly dentinEnd: string;
	readonly tiStart: string;
	readonly tiEnd: string;
	readonly socketBg: string;
	readonly threadShadow: string;
	readonly threadCrest: string;
}

export const CAD_COLORS: { light: CadCamPalette; dark: CadCamPalette } = {
	light: {
		isDark: false,
		strokePrimary: "#334155",
		strokeSecondary: "#64748b",
		technical: "#0284c7",
		cadText: "#0369a1",
		cej: "#0284c7",
		pulp: "#be123c",
		enamelMid: "#e2e8f0",
		enamelEnd: "#cbd5e1",
		dentinStart: "#fef3c7",
		dentinEnd: "#d97706",
		tiStart: "#475569",
		tiEnd: "#334155",
		socketBg: "#1e293b",
		threadShadow: "#1e293b",
		threadCrest: "#ffffff",
	},
	dark: {
		isDark: true,
		strokePrimary: "#94a3b8",
		strokeSecondary: "#475569",
		technical: "#0ea5e9",
		cadText: "#38bdf8",
		cej: "#38bdf8",
		pulp: "#881337",
		enamelMid: "#94a3b8",
		enamelEnd: "#64748b",
		dentinStart: "#b45309",
		dentinEnd: "#451a03",
		tiStart: "#1e293b",
		tiEnd: "#0f172a",
		socketBg: "#020617",
		threadShadow: "#020617",
		threadCrest: "#cbd5e1",
	},
};

// ---------------------------------------------------------------------------
// 1. INCISOR 11 (Резец 11: микротекстура, пропорции, четкая линия CEJ)
// ---------------------------------------------------------------------------
export const CAD_INCISOR = {
	root: "M 46 88 C 45 68 47 40 56 22 C 58 17 62 17 64 22 C 73 40 75 68 74 88 Z",
	pulp: "M 58 24 C 58.5 22 61.5 22 62 24 C 62 48 64 74 65 92 C 65 98 67 106 66 112 C 60 114 54 112 55 106 C 56 98 57 74 58 48 Z",
	cej: "M 45 88 C 50 82 70 82 75 88",
	crown: "M 45 88 C 41 98 38 116 39 132 C 40 146 41 155 43 156 C 49 157 54 156 59 157 C 65 156 71 157 77 156 C 79 155 80 146 81 132 C 82 116 79 98 75 88 Z",
	grooveM: "M 49 110 C 49 126 50 144 51 154",
	grooveD: "M 71 110 C 71 126 70 144 69 154",
	halo: "M 43 154 C 49 155 59 155 77 154 L 76 150 C 65 151 55 151 44 150 Z",
};

// ---------------------------------------------------------------------------
// 2. PREMOLAR 14 (Премоляр 14: бугры, конусность, NiTi файл и обтурация)
// ---------------------------------------------------------------------------
export const CAD_PREMOLAR = {
	rootPalatal: "M 39 88 C 38 72 38 48 42 24 C 43 20 45 20 46 24 C 49 42 53 52 60 56 C 53 66 48 78 47 88 Z",
	rootBuccal: "M 60 56 C 67 52 71 42 74 24 C 75 20 77 20 78 24 C 82 48 82 72 81 88 L 73 88 C 72 78 67 66 60 56 Z",
	cej: "M 39 88 C 48 83 72 83 81 88",
	crown: "M 39 88 C 34 100 33 120 35 136 C 36 148 42 153 47 153 C 53 153 56 147 60 147 C 64 147 67 158 73 158 C 79 158 84 148 85 136 C 87 120 86 100 81 88 Z",
	ridgeBuccal: "M 73 158 L 65 147 L 60 147",
	ridgePalatal: "M 47 153 L 55 147 L 60 147",
	guttaPercha: "M 43 23 L 45 23 L 48 58 L 52 90 L 48 90 L 45 58 Z",
	nitiShaft: "M 75 22 L 77 22 L 75 58 L 71 90 L 69 90 L 73 58 Z",
	accessCavity: "M 53 100 L 67 100 L 64 128 L 56 128 Z",
};

// ---------------------------------------------------------------------------
// 3. MOLAR 46 (Моляр 46: 5 бугров, каналы, сияющая гранулема)
// ---------------------------------------------------------------------------
export const CAD_MOLAR = {
	crown: "M 29 76 C 26 58 28 38 34 26 C 37 20 41 24 47 24 C 52 24 54 19 59 19 C 64 19 66 23 72 23 C 77 23 80 23 84 27 C 90 38 92 58 89 76 Z",
	fissures: "M 36 28 C 45 35 55 35 60 38 C 65 35 75 35 84 30 M 60 38 L 60 56 M 46 25 L 53 36 M 72 24 L 67 36",
	furcationTrunk: "M 29 76 C 30 92 31 114 34 144 C 35 147 38 147 40 144 C 47 118 51 104 59 96 C 67 104 71 118 78 140 C 80 144 83 144 84 140 C 87 114 88 92 89 76 Z",
	canalMesial: "M 36 142 L 38 142 L 45 98 L 47 72 L 43 72 L 41 98 Z",
	canalDistal: "M 81 138 L 83 138 L 77 98 L 73 72 L 69 72 L 73 98 Z",
	pulpChamber: "M 43 72 L 73 72 L 71 58 L 45 58 Z",
};

// ---------------------------------------------------------------------------
// 4. IMPLANT (Straumann BLX / Bicon: SLA титан, микрорезьба, формирователь)
// ---------------------------------------------------------------------------
export const CAD_IMPLANT = {
	healingAbutment: "M 42 22 C 42 20 44 19 47 19 L 73 19 C 76 19 78 20 78 22 L 81 54 C 81 56 79 57 77 57 L 43 57 C 41 57 39 56 39 54 Z",
	platformCollar: "M 41 57 L 79 57 L 76 65 L 44 65 Z",
	microCollar: "M 44 65 L 76 65 L 75 75 L 45 75 Z",
	fixtureBody: "M 45 75 L 75 75 C 75 100 71 128 65 152 C 64 155 62 156 60 156 C 58 156 56 155 55 152 C 49 128 45 100 45 75 Z",
	apicalFluteLeft: "M 56 138 L 54 152 L 58 148 Z",
	apicalFluteRight: "M 64 138 L 66 152 L 62 148 Z",
};

export interface ImplantThreadData {
	readonly y: number;
	readonly xLeft: number;
	readonly xRight: number;
}

export const CAD_THREADS: readonly ImplantThreadData[] = [
	{ y: 79, xLeft: 42, xRight: 78 },
	{ y: 88, xLeft: 41, xRight: 79 },
	{ y: 98, xLeft: 41, xRight: 79 },
	{ y: 109, xLeft: 42, xRight: 78 },
	{ y: 120, xLeft: 44, xRight: 76 },
	{ y: 131, xLeft: 47, xRight: 73 },
	{ y: 142, xLeft: 51, xRight: 69 },
];
