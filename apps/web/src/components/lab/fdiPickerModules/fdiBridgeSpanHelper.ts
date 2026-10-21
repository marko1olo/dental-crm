export const UPPER_ARCH = [18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28];
export const LOWER_ARCH = [48, 47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37, 38];

export function getBridgeSpanTeeth(currentTeeth: number[]): number[] {
	const resultSet = new Set<number>(currentTeeth);

	// Process upper arch
	const upperSelected = currentTeeth.filter((t) => UPPER_ARCH.includes(t));
	if (upperSelected.length >= 2) {
		const indices = upperSelected.map((t) => UPPER_ARCH.indexOf(t));
		const minIdx = Math.min(...indices);
		const maxIdx = Math.max(...indices);
		for (let i = minIdx; i <= maxIdx; i++) {
			const tooth = UPPER_ARCH[i];
			if (tooth !== undefined) resultSet.add(tooth);
		}
	}

	// Process lower arch
	const lowerSelected = currentTeeth.filter((t) => LOWER_ARCH.includes(t));
	if (lowerSelected.length >= 2) {
		const indices = lowerSelected.map((t) => LOWER_ARCH.indexOf(t));
		const minIdx = Math.min(...indices);
		const maxIdx = Math.max(...indices);
		for (let i = minIdx; i <= maxIdx; i++) {
			const tooth = LOWER_ARCH[i];
			if (tooth !== undefined) resultSet.add(tooth);
		}
	}

	return Array.from(resultSet).sort((a, b) => a - b);
}
