/**
 * anatomicalCanalBaseline.ts — FDI ISO 3950 Root Canal Counts and Dentition Classification
 */

/**
 * Returns baseline anatomical root canal count according to FDI ISO 3950 standards.
 */
export function getAnatomicalRootCanalCount(toothNumber: number): number {
	const quadrant = Math.floor(toothNumber / 10);
	const pos = toothNumber % 10;

	// Молочные зубы (51-85)
	if (quadrant >= 5 && quadrant <= 8) {
		if (pos === 1 || pos === 2 || pos === 3) return 1;
		if (pos === 4 || pos === 5) return quadrant === 5 || quadrant === 6 ? 3 : 2;
		return 1;
	}

	// Постоянные зубы (11-48)
	// Резцы и клыки (11-13, 21-23, 31-33, 41-43) — 1 канал
	if (pos >= 1 && pos <= 3) return 1;

	// Премоляры верхней челюсти (14, 24 — 2 канала; 15, 25 — 1-2 канала, базово 2)
	if ((quadrant === 1 || quadrant === 2) && (pos === 4 || pos === 5)) {
		return pos === 4 ? 2 : 1;
	}

	// Премоляры нижней челюсти (34, 35, 44, 45 — 1 канал)
	if ((quadrant === 3 || quadrant === 4) && (pos === 4 || pos === 5)) {
		return 1;
	}

	// Моляры верхней челюсти (16, 17, 18, 26, 27, 28 — 3-4 канала, базово 3)
	if ((quadrant === 1 || quadrant === 2) && pos >= 6) {
		return 3;
	}

	// Моляры нижней челюсти (36, 37, 38, 46, 47, 48 — 3 канала)
	if ((quadrant === 3 || quadrant === 4) && pos >= 6) {
		return 3;
	}

	return 1;
}

/**
 * Returns true if tooth number corresponds to deciduous (primary) dentition (FDI 51-85).
 */
export function isDeciduousTooth(toothNumber: number): boolean {
	const q = Math.floor(toothNumber / 10);
	return q >= 5 && q <= 8;
}
