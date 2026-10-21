import { generateQrCodeSvg as sharedGenerateQrCodeSvg } from "@dental/shared";
import { generateBarcodeSvg as canonicalCode128BarcodeSvg } from "../labMath";

/**
 * 32-зубная формула FDI в виде компактного SVG вектора.
 */
export function generateOdontogramSvg(selectedTeeth: readonly number[] = []): string {
	const selectedSet = new Set(selectedTeeth);
	const upperRight = [18, 17, 16, 15, 14, 13, 12, 11];
	const upperLeft = [21, 22, 23, 24, 25, 26, 27, 28];
	const lowerRight = [48, 47, 46, 45, 44, 43, 42, 41];
	const lowerLeft = [31, 32, 33, 34, 35, 36, 37, 38];

	const renderQuadrant = (teeth: number[], startX: number, startY: number) => {
		return teeth
			.map((num, i) => {
				const x = startX + i * 30;
				const isSel = selectedSet.has(num);
				const bg = isSel ? "#0d9488" : "#f8fafc";
				const stroke = isSel ? "#0f766e" : "#cbd5e1";
				const textFill = isSel ? "#ffffff" : "#0f172a";

				return `<g transform="translate(${x}, ${startY})">
					<rect x="0" y="0" width="26" height="30" rx="4" fill="${bg}" stroke="${stroke}" stroke-width="1.5" />
					<text x="13" y="19" font-family="system-ui, -apple-system, sans-serif" font-size="11" font-weight="700" text-anchor="middle" fill="${textFill}">${num}</text>
				</g>`;
			})
			.join("");
	};

	return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 520 86" width="520" height="86" style="max-width: 100%;">
		<line x1="258" y1="4" x2="258" y2="82" stroke="#94a3b8" stroke-width="1.5" stroke-dasharray="3 3" />
		<line x1="8" y1="43" x2="508" y2="43" stroke="#cbd5e1" stroke-width="1" />
		<text x="4" y="20" font-family="sans-serif" font-size="9" font-weight="700" fill="#64748b">ВЧ</text>
		<text x="4" y="66" font-family="sans-serif" font-size="9" font-weight="700" fill="#64748b">НЧ</text>
		${renderQuadrant(upperRight, 14, 6)}
		${renderQuadrant(upperLeft, 264, 6)}
		${renderQuadrant(lowerRight, 14, 48)}
		${renderQuadrant(lowerLeft, 264, 48)}
	</svg>`;
}

export function generateBarcodeSvg(data: string, width = 220, height = 48): string {
	return canonicalCode128BarcodeSvg(data, width, height);
}

export function generateQrCodeSvg(content: string, size = 90): string {
	return sharedGenerateQrCodeSvg(content || "DENTE-ZTL", { size, margin: 1 });
}
