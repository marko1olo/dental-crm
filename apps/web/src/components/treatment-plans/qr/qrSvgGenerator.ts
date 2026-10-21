/**
 * apps/web/src/components/treatment-plans/qr/qrSvgGenerator.ts
 *
 * Генерация SVG разметки QR-кода без внешних библиотек.
 */

import { generateQrMatrix } from "./qrMatrixGenerator";

export interface QrSvgOptions {
	readonly sizePx?: number;
	readonly fgColor?: string;
	readonly bgColor?: string;
	readonly quietZone?: number;
}

export function generateQrSvgString(text: string, options: QrSvgOptions = {}): string {
	const {
		sizePx = 200,
		fgColor = "#0f172a",
		bgColor = "#ffffff",
		quietZone = 2,
	} = options;

	const matrixRes = generateQrMatrix(text);
	const count = matrixRes.size + quietZone * 2;
	const cellSize = sizePx / count;

	let rects = "";
	for (let r = 0; r < matrixRes.size; r++) {
		for (let c = 0; c < matrixRes.size; c++) {
			const row = matrixRes.modules[r];
			if (row && row[c]) {
				const x = (c + quietZone) * cellSize;
				const y = (r + quietZone) * cellSize;
				rects += `<rect x="${x.toFixed(2)}" y="${y.toFixed(2)}" width="${cellSize.toFixed(2)}" height="${cellSize.toFixed(2)}" fill="${fgColor}" />`;
			}
		}
	}

	return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${sizePx} ${sizePx}" width="${sizePx}" height="${sizePx}"><rect width="100%" height="100%" fill="${bgColor}" />${rects}</svg>`;
}
