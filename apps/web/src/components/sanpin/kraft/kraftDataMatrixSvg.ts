export function generateDataMatrixSvg(
	payload: string,
	options: { size?: number; color?: string; bgColor?: string } = {},
): string {
	const size = options.size ?? 120;
	const color = options.color ?? "#000000";
	const bgColor = options.bgColor ?? "#ffffff";
	const matrixDimension = 20;

	const grid: boolean[][] = Array.from({ length: matrixDimension }, () =>
		Array(matrixDimension).fill(false),
	);

	for (let col = 0; col < matrixDimension; col++) {
		grid[matrixDimension - 1]![col] = true;
	}
	for (let row = 0; row < matrixDimension; row++) {
		grid[row]![0] = true;
	}
	for (let col = 0; col < matrixDimension; col++) {
		grid[0]![col] = col % 2 === 0;
	}
	for (let row = 0; row < matrixDimension; row++) {
		grid[row]![matrixDimension - 1] = row % 2 !== 0;
	}

	let seed = 0;
	for (let i = 0; i < payload.length; i++) {
		seed = (seed * 31 + payload.charCodeAt(i)) >>> 0;
	}

	let pseudoRandom = seed;
	const nextBit = () => {
		pseudoRandom = (pseudoRandom * 1664525 + 1013904223) >>> 0;
		return (pseudoRandom & 1) === 1;
	};

	let byteIndex = 0;
	for (let row = 1; row < matrixDimension - 1; row++) {
		for (let col = 1; col < matrixDimension - 1; col++) {
			if (byteIndex < payload.length) {
				const charCode = payload.charCodeAt(byteIndex);
				const bit = ((charCode >> (col % 8)) & 1) === 1;
				grid[row]![col] = bit !== nextBit();
				byteIndex = (byteIndex + 1) % payload.length;
			} else {
				grid[row]![col] = nextBit();
			}
		}
	}

	const moduleSize = size / (matrixDimension + 2);
	let rects = "";

	for (let r = 0; r < matrixDimension; r++) {
		for (let c = 0; c < matrixDimension; c++) {
			if (grid[r]![c]) {
				const x = (c + 1) * moduleSize;
				const y = (r + 1) * moduleSize;
				rects += `<rect x="${x.toFixed(2)}" y="${y.toFixed(2)}" width="${moduleSize.toFixed(2)}" height="${moduleSize.toFixed(2)}" fill="${color}" />`;
			}
		}
	}

	return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}" style="background:${bgColor}; border-radius:4px; display:block;">${rects}</svg>`;
}
