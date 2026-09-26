/**
 * labBarcodeQr.ts — Vector Code 128 (ISO/IEC 15417) & QR Code (ISO/IEC 18004) Generators
 * for Dental Lab Orders & Statutory Form ZTL-1.
 */

import { generateQrCodeSvg as sharedGenerateQrCodeSvg, type QrSvgOptions } from "@dental/shared";

// Canonical Code 128 (ISO/IEC 15417) Patterns for Symbol Indexes 0 to 106
const CODE128_PATTERNS = [
	"212222", "222122", "222221", "121223", "121322", "131222", "122213", "122312", "132212", "221213",
	"221312", "231212", "112232", "122132", "122231", "113222", "123122", "123221", "223211", "221132",
	"221231", "213212", "223112", "312131", "311222", "321122", "321221", "312212", "322112", "322211",
	"212123", "212321", "232121", "111323", "131123", "131321", "112313", "132113", "132311", "211313",
	"231113", "231311", "112133", "112331", "132131", "113123", "113321", "133121", "313121", "211331",
	"231131", "213113", "213311", "213131", "311123", "311321", "331121", "312113", "312311", "332111",
	"314111", "221411", "431111", "111224", "111422", "121124", "121421", "141122", "141221", "112214",
	"112412", "122114", "122411", "142112", "142211", "241211", "221114", "413111", "241112", "134111",
	"111242", "121142", "121241", "114212", "124112", "124211", "411212", "421112", "421211", "212141",
	"214121", "412121", "111143", "111341", "131141", "114113", "114311", "411113", "411311", "113141",
	"114131", "311141", "411131", "211412", "211214", "211232", "2331112",
] as const;

/**
 * Generates an SVG vector barcode for the lab work order using canonical Code 128 (ISO/IEC 15417).
 */
export function generateBarcodeSvg(data: string, width = 240, height = 50): string {
	const rawText = (data || "").trim() || "ZTL-ORDER";
	// Transliterate common Russian lab prefixes so Code 128 bars are cleanly scannable in standard ASCII
	const barData = rawText
		.replace(/ЗТЛ/gi, "ZTL")
		.replace(/ЛО/gi, "LO")
		.replace(/НАРЯД/gi, "NARYAD")
		.replace(/[^\x20-\x7E]/g, "-")
		.slice(0, 24) || "ZTL-ORDER";

	const symbols: number[] = [];
	let checksum = 104; // Start Code B (symbol index 104)

	for (let i = 0; i < barData.length; i++) {
		const code = barData.charCodeAt(i);
		const sym = code >= 32 && code <= 126 ? code - 32 : 0;
		symbols.push(sym);
		checksum += (i + 1) * sym;
	}
	checksum %= 103;

	const sequence = [104, ...symbols, checksum, 106];
	let x = 10;
	let bars = "";
	const barHeight = 35;

	for (const symIndex of sequence) {
		const pattern = CODE128_PATTERNS[symIndex];
		if (!pattern) continue;
		for (let p = 0; p < pattern.length; p++) {
			const width = Number(pattern[p]);
			const isBar = p % 2 === 0;
			if (isBar) {
				bars += `<rect x="${x}" y="5" width="${width}" height="${barHeight}" fill="#0f172a"/>`;
			}
			x += width;
		}
	}
	const totalWidth = Math.max(x + 10, 160);
	return `<svg viewBox="0 0 ${totalWidth} 50" width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg" class="w-full h-12" style="max-width: 100%; height: auto;"><rect width="100%" height="100%" fill="#ffffff"/>${bars}<text x="${totalWidth / 2}" y="47" font-size="7.5" font-weight="700" font-family="monospace" text-anchor="middle" fill="#0f172a">${rawText}</text></svg>`;
}

/**
 * Generates an ISO/IEC 18004 Reed-Solomon QR Code vector SVG for the lab work order.
 * Strictly zero fake Math.sin generators — uses canonical Galois Field GF(256) Reed-Solomon engine.
 */
export function generateQrCodeSvg(text: string, options?: number | QrSvgOptions): string {
	const safeText = text || "DENTE-ZTL";
	const opts = typeof options === "number" ? { size: options, margin: 2 } : (options ?? { margin: 2 });
	return sharedGenerateQrCodeSvg(safeText, opts);
}

export function formatGostOrderNumber(token?: string, date?: Date): string {
	const d = date || new Date();
	const year = d.getFullYear().toString().slice(-2);
	const month = String(d.getMonth() + 1).padStart(2, "0");
	const shortToken = (token || "00000000").slice(0, 6).toUpperCase();
	return `ЗТЛ-${year}${month}-${shortToken}`;
}
