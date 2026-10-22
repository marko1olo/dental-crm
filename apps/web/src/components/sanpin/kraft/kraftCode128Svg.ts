export const CODE128_B_PATTERNS: readonly string[] = [
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
];

export function generateCode128Svg(
	value: string,
	options: { height?: number; width?: number; showText?: boolean; barColor?: string } = {},
): string {
	const height = options.height ?? 40;
	const showText = options.showText ?? true;
	const barColor = options.barColor ?? "#000000";

	const startCode = 104;
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
	values.push(106);

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
	const moduleWidth = 1.2;
	const totalWidth = totalModules * moduleWidth + 20;
	const barHeight = showText ? height - 12 : height;

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
			const x = 10 + currentBarStart * moduleWidth;
			const w = currentBarWidth * moduleWidth;
			rects += `<rect x="${x.toFixed(1)}" y="4" width="${w.toFixed(1)}" height="${barHeight}" fill="${barColor}" />`;
			currentBarStart = -1;
			currentBarWidth = 0;
		}
	}

	if (currentBarStart !== -1) {
		const x = 10 + currentBarStart * moduleWidth;
		const w = currentBarWidth * moduleWidth;
		rects += `<rect x="${x.toFixed(1)}" y="4" width="${w.toFixed(1)}" height="${barHeight}" fill="${barColor}" />`;
	}

	const textSvg = showText
		? `<text x="${(totalWidth / 2).toFixed(1)}" y="${(height + 2).toFixed(1)}" font-family="monospace, monospace" font-size="10" font-weight="600" text-anchor="middle" fill="${barColor}">${value}</text>`
		: "";

	return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${totalWidth.toFixed(1)} ${height}" width="${options.width || totalWidth}" height="${height}" style="display:block;">${rects}${textSvg}</svg>`;
}
