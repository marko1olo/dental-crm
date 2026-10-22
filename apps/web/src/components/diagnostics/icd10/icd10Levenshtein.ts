/**
 * Расчет расстояния Левенштейна для нечеткого поиска с опечатками.
 */
export function levenshteinDistance(a: string, b: string): number {
	if (a === b) return 0;
	if (a.length === 0) return b.length;
	if (b.length === 0) return a.length;

	const matrix: number[][] = [];

	for (let i = 0; i <= b.length; i++) {
		const row: number[] = [i];
		matrix[i] = row;
	}

	for (let j = 0; j <= a.length; j++) {
		const row0 = matrix[0];
		if (row0) {
			row0[j] = j;
		}
	}

	for (let i = 1; i <= b.length; i++) {
		const prevRow = matrix[i - 1];
		const currRow = matrix[i];
		if (!prevRow || !currRow) continue;

		for (let j = 1; j <= a.length; j++) {
			const charB = b.charAt(i - 1);
			const charA = a.charAt(j - 1);
			if (charB === charA) {
				currRow[j] = prevRow[j - 1] ?? 0;
			} else {
				const replaceCost = (prevRow[j - 1] ?? 0) + 1;
				const insertCost = (currRow[j - 1] ?? 0) + 1;
				const deleteCost = (prevRow[j] ?? 0) + 1;
				currRow[j] = Math.min(replaceCost, insertCost, deleteCost);
			}
		}
	}

	const lastRow = matrix[b.length];
	return lastRow?.[a.length] ?? Math.max(a.length, b.length);
}
