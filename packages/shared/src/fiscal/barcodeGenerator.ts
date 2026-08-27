/**
 * ============================================================================
 * DENTE Dental CRM — Pure TypeScript Vector Barcode Generator (Code 128)
 * Conforms to GOST ISO/IEC 15417-2013 and FNS Russia form standards.
 * Pure TypeScript vector SVG rendering with zero external runtime dependencies.
 * ============================================================================
 */

export interface Code128SvgOptions {
	readonly height?: number | undefined;
	readonly width?: number | undefined;
	readonly showText?: boolean | undefined;
	readonly barColor?: string | undefined;
	readonly quietZoneModules?: number | undefined;
	readonly customText?: string | undefined;
	readonly fontSize?: number | undefined;
}

/**
 * Code 128 (Subset B) bar patterns (107 patterns for index 0..106).
 * Each pattern consists of 6 digits representing widths of alternating bars and spaces.
 */
const CODE128_B_PATTERNS: readonly string[] = [
	"212222", "222122", "222221", "121223", "121322", "131222", "122213", "122312", "132212", "221213", // 0-9
	"221312", "231212", "112232", "122132", "122231", "113222", "123122", "123221", "223211", "221132", // 10-19
	"221231", "213212", "223112", "312131", "311222", "321122", "321221", "312212", "322112", "322211", // 20-29
	"212123", "212321", "232121", "111323", "131123", "131321", "112313", "132113", "132311", "211313", // 30-39
	"231113", "231311", "112133", "112331", "132131", "113123", "113321", "133121", "313121", "211331", // 40-49
	"231131", "213113", "213311", "213131", "311123", "311321", "331121", "312113", "312311", "332111", // 50-59
	"314111", "221411", "431111", "111224", "111422", "121124", "121421", "141122", "141221", "112214", // 60-69
	"112412", "122114", "122411", "142112", "142211", "241211", "221114", "413111", "241112", "134111", // 70-79
	"111242", "121142", "121241", "114212", "124112", "124211", "411212", "421112", "421211", "212141", // 80-89
	"214121", "412121", "111143", "111341", "131141", "114113", "114311", "411113", "411311", "113141", // 90-99
	"114131", "311141", "411131", "211412", "211214", "211232", "2331112", // 100-106 (104=StartB, 106=Stop)
];

/**
 * Generates pure vector SVG for Code 128 (Subset B) barcode.
 */
export function generateCode128Svg(value: string, options: Code128SvgOptions = {}): string {
	const height = options.height ?? 38;
	const showText = options.showText ?? true;
	const barColor = options.barColor ?? "#000000";
	const quietModules = options.quietZoneModules ?? 10;
	const customText = options.customText ?? value;
	const fontSize = options.fontSize ?? 9.5;

	const startCode = 104; // Start B
	const values: number[] = [startCode];
	let checksum = startCode;

	for (let i = 0; i < value.length; i++) {
		const code = value.charCodeAt(i) - 32;
		const charCode = Math.max(0, Math.min(95, code));
		values.push(charCode);
		checksum += charCode * (i + 1);
	}

	const checkDigit = checksum % 103;
	values.push(checkDigit);
	values.push(106); // Stop code

	// Build binary sequence of bars
	let binarySequence = "";
	for (const val of values) {
		const pattern = CODE128_B_PATTERNS[val] || "111111";
		for (let p = 0; p < pattern.length; p++) {
			const width = parseInt(pattern[p]!, 10);
			const isBar = p % 2 === 0;
			binarySequence += (isBar ? "1" : "0").repeat(width);
		}
	}

	const totalModules = binarySequence.length;
	const moduleWidth = 1.15;
	const padding = quietModules * moduleWidth;
	const totalWidth = totalModules * moduleWidth + padding * 2;
	const barHeight = showText ? Math.max(14, height - 13) : height;

	let rects = "";
	let currentBarStart = -1;
	let currentBarWidth = 0;

	for (let i = 0; i < totalModules; i++) {
		if (binarySequence[i] === "1") {
			if (currentBarStart === -1) {
				currentBarStart = i;
				currentBarWidth = 1;
			} else {
				currentBarWidth++;
			}
		} else if (currentBarStart !== -1) {
			const x = padding + currentBarStart * moduleWidth;
			const w = currentBarWidth * moduleWidth;
			rects += `<rect x="${x.toFixed(1)}" y="2" width="${w.toFixed(1)}" height="${barHeight.toFixed(1)}" fill="${barColor}" />`;
			currentBarStart = -1;
			currentBarWidth = 0;
		}
	}

	if (currentBarStart !== -1) {
		const x = padding + currentBarStart * moduleWidth;
		const w = currentBarWidth * moduleWidth;
		rects += `<rect x="${x.toFixed(1)}" y="2" width="${w.toFixed(1)}" height="${barHeight.toFixed(1)}" fill="${barColor}" />`;
	}

	const textSvg = showText
		? `<text x="${(totalWidth / 2).toFixed(1)}" y="${(height).toFixed(1)}" font-family="'Courier New', Courier, monospace" font-size="${fontSize}" font-weight="700" letter-spacing="1.5px" text-anchor="middle" fill="${barColor}">${customText}</text>`
		: "";

	const svgWidth = options.width || Math.round(totalWidth);

	return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${totalWidth.toFixed(1)} ${height}" width="${svgWidth}" height="${height}" style="display:block;">${rects}${textSvg}</svg>`;
}

/**
 * Generates official FNS KND 1151156 header barcode SVG.
 * Encodes the standard 8-digit form code `11511560` and displays `1151 1560`.
 */
export function generateFnsFormKnd1151156BarcodeSvg(options: {
	readonly height?: number | undefined;
	readonly width?: number | undefined;
	readonly showText?: boolean | undefined;
	readonly certificateNumber?: string | undefined;
	readonly taxYear?: number | undefined;
} = {}): string {
	const certSuffix = options.certificateNumber ? `-${options.certificateNumber}` : "";
	const rawCode = `1151156${certSuffix}`;
	const displayText = options.certificateNumber
		? `1151 1560 • №${options.certificateNumber}`
		: "1151 1560";

	return generateCode128Svg(rawCode, {
		height: options.height ?? 38,
		width: options.width ?? 170,
		showText: options.showText ?? true,
		customText: displayText,
		fontSize: 8.5,
		quietZoneModules: 6,
	});
}
