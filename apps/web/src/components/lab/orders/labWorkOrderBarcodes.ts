import { generateQrCodeSvg as sharedGenerateQrCodeSvg } from "@dental/shared";
import { generateBarcodeSvg as canonicalCode128BarcodeSvg } from "../labMath";

export function generateLabOrderNumber(sequenceNum = 1, date = new Date()): string {
	const year = date.getFullYear();
	const month = String(date.getMonth() + 1).padStart(2, "0");
	const seq = String(sequenceNum).padStart(4, "0");
	return `ЛО-${year}/${month}-${seq}`;
}

export function generateBarcodeSvg(data: string, width = 240, height = 50): string {
	return canonicalCode128BarcodeSvg(data, width, height);
}

export function generateQrCodeSvg(content: string, size = 100): string {
	return sharedGenerateQrCodeSvg(content || "DENTE-LAB", { size, margin: 1 });
}

export function generateFdiOdontogramSvg(selectedTeeth: number[] = []): string {
	const selectedSet = new Set(selectedTeeth);
	const upperRight = [18, 17, 16, 15, 14, 13, 12, 11];
	const upperLeft = [21, 22, 23, 24, 25, 26, 27, 28];
	const lowerRight = [48, 47, 46, 45, 44, 43, 42, 41];
	const lowerLeft = [31, 32, 33, 34, 35, 36, 37, 38];

	const renderQuadrant = (teeth: number[], startX: number, startY: number) => {
		return teeth.map((num, i) => {
			const x = startX + i * 32;
			const isSel = selectedSet.has(num);
			const bg = isSel ? "#0d9488" : "#f8fafc";
			const stroke = isSel ? "#0f766e" : "#cbd5e1";
			const textFill = isSel ? "#ffffff" : "#0f172a";
			return `
				<g transform="translate(${x}, ${startY})">
					<rect x="0" y="0" width="28" height="32" rx="4" fill="${bg}" stroke="${stroke}" stroke-width="1.5" />
					<text x="14" y="20" font-family="system-ui, -apple-system, sans-serif" font-size="12" font-weight="700" text-anchor="middle" fill="${textFill}">${num}</text>
				</g>
			`;
		}).join("");
	};

	return `
		<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 540 90" width="540" height="90" style="max-width: 100%;">
			<line x1="268" y1="4" x2="268" y2="86" stroke="#94a3b8" stroke-width="1.5" stroke-dasharray="3 3" />
			<line x1="10" y1="45" x2="526" y2="45" stroke="#cbd5e1" stroke-width="1" />
			<text x="4" y="22" font-family="sans-serif" font-size="10" font-weight="700" fill="#64748b">ВЧ</text>
			<text x="4" y="68" font-family="sans-serif" font-size="10" font-weight="700" fill="#64748b">НЧ</text>
			${renderQuadrant(upperRight, 16, 6)}
			${renderQuadrant(upperLeft, 276, 6)}
			${renderQuadrant(lowerRight, 16, 50)}
			${renderQuadrant(lowerLeft, 276, 50)}
		</svg>
	`;
}
