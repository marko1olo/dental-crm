/**
 * apps/web/src/components/treatment-plans/qr/qrPatterns.ts
 *
 * Отрисовка шаблонов поиска, выравнивания и синхронизации QR-матрицы.
 */

export function drawFinderPattern(
	matrix: boolean[][],
	reserved: boolean[][],
	matrixSize: number,
	row: number,
	col: number,
): void {
	for (let r = -1; r <= 7; r++) {
		for (let c = -1; c <= 7; c++) {
			const currR = row + r;
			const currC = col + c;
			if (currR >= 0 && currR < matrixSize && currC >= 0 && currC < matrixSize) {
				const isBorder = r === 0 || r === 6 || c === 0 || c === 6;
				const isInner = r >= 2 && r <= 4 && c >= 2 && c <= 4;
				const isFinder = isBorder || isInner;
				const rRow = matrix[currR];
				const rRes = reserved[currR];
				if (rRow && rRes) {
					rRow[currC] = isFinder;
					rRes[currC] = true;
				}
			}
		}
	}
}

export function drawTimingPatterns(
	matrix: boolean[][],
	reserved: boolean[][],
	matrixSize: number,
): void {
	for (let i = 8; i < matrixSize - 8; i++) {
		const isBlack = i % 2 === 0;
		const r6 = reserved[6];
		const m6 = matrix[6];
		if (r6 && m6 && !r6[i]) {
			m6[i] = isBlack;
			r6[i] = true;
		}
		const ri = reserved[i];
		const mi = matrix[i];
		if (ri && mi && !ri[6]) {
			mi[6] = isBlack;
			ri[6] = true;
		}
	}
}

export function drawAlignmentPattern(
	matrix: boolean[][],
	reserved: boolean[][],
	matrixSize: number,
): void {
	const alignPos = matrixSize - 7;
	for (let r = alignPos - 2; r <= alignPos + 2; r++) {
		for (let c = alignPos - 2; c <= alignPos + 2; c++) {
			const rRow = reserved[r];
			const mRow = matrix[r];
			if (rRow && mRow && !rRow[c]) {
				const isBorder =
					r === alignPos - 2 ||
					r === alignPos + 2 ||
					c === alignPos - 2 ||
					c === alignPos + 2;
				const isCenter = r === alignPos && c === alignPos;
				mRow[c] = isBorder || isCenter;
				rRow[c] = true;
			}
		}
	}
}
