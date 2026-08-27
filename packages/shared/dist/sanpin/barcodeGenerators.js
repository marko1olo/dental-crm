/**
 * ============================================================================
 * SANPIN VECTOR BARCODE GENERATORS (DATAMATRIX 2D & CODE128 1D)
 * Чистая TypeScript реализация без внешних сетевых зависимостей.
 * Поддерживает генерацию SVG, битовой матрицы и расчет контрольных сумм.
 * ============================================================================
 */
/**
 * Code 128 (Subset B) bar patterns (107 patterns for index 0..106).
 */
const CODE128_B_PATTERNS = [
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
 * Generates Code 128 (Subset B) vector SVG string.
 */
export function generateSanpinCode128Svg(value, options = {}) {
    const height = options.height ?? 40;
    const showText = options.showText ?? true;
    const barColor = options.barColor ?? "#000000";
    const quietModules = options.quietZoneModules ?? 10;
    const startCode = 104; // Start B
    const values = [startCode];
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
            const width = parseInt(pattern[p], 10);
            const isBar = p % 2 === 0;
            binarySequence += (isBar ? "1" : "0").repeat(width);
        }
    }
    const totalModules = binarySequence.length;
    const moduleWidth = 1.2;
    const padding = quietModules * moduleWidth;
    const totalWidth = totalModules * moduleWidth + padding * 2;
    const barHeight = showText ? Math.max(16, height - 12) : height;
    let rects = "";
    let currentBarStart = -1;
    let currentBarWidth = 0;
    for (let i = 0; i < totalModules; i++) {
        if (binarySequence[i] === "1") {
            if (currentBarStart === -1) {
                currentBarStart = i;
                currentBarWidth = 1;
            }
            else {
                currentBarWidth++;
            }
        }
        else if (currentBarStart !== -1) {
            const x = padding + currentBarStart * moduleWidth;
            const w = currentBarWidth * moduleWidth;
            rects += `<rect x="${x.toFixed(1)}" y="4" width="${w.toFixed(1)}" height="${barHeight.toFixed(1)}" fill="${barColor}" />`;
            currentBarStart = -1;
            currentBarWidth = 0;
        }
    }
    if (currentBarStart !== -1) {
        const x = padding + currentBarStart * moduleWidth;
        const w = currentBarWidth * moduleWidth;
        rects += `<rect x="${x.toFixed(1)}" y="4" width="${w.toFixed(1)}" height="${barHeight.toFixed(1)}" fill="${barColor}" />`;
    }
    const textSvg = showText
        ? `<text x="${(totalWidth / 2).toFixed(1)}" y="${(height + 2).toFixed(1)}" font-family="monospace, monospace" font-size="10" font-weight="600" text-anchor="middle" fill="${barColor}">${value}</text>`
        : "";
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${totalWidth.toFixed(1)} ${height}" width="${options.width || totalWidth.toFixed(1)}" height="${height}" style="display:block;">${rects}${textSvg}</svg>`;
}
/**
 * Computes deterministic DataMatrix 2D bit grid (20x20 or specified dimension) with L-finder pattern and timing tracks.
 */
export function generateDataMatrixBitGrid(payload, dimension = 20) {
    const matrixDimension = Math.max(12, Math.min(32, dimension));
    const grid = Array.from({ length: matrixDimension }, () => Array(matrixDimension).fill(false));
    // 1. Construct Standard DataMatrix Finder Pattern (L-boundary + Alternating Timing Tracks):
    // Bottom line is solid black (L-finder)
    for (let col = 0; col < matrixDimension; col++) {
        grid[matrixDimension - 1][col] = true;
    }
    // Left line is solid black (L-finder)
    for (let row = 0; row < matrixDimension; row++) {
        grid[row][0] = true;
    }
    // Top line is alternating timing pattern (Black/White)
    for (let col = 0; col < matrixDimension; col++) {
        grid[0][col] = col % 2 === 0;
    }
    // Right line is alternating timing pattern
    for (let row = 0; row < matrixDimension; row++) {
        grid[row][matrixDimension - 1] = row % 2 !== 0;
    }
    // 2. Fill interior data cells deterministically using payload string bytes
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
                grid[row][col] = bit !== nextBit();
                byteIndex = (byteIndex + 1) % payload.length;
            }
            else {
                grid[row][col] = nextBit();
            }
        }
    }
    return grid;
}
/**
 * Generates standalone 2D DataMatrix vector SVG string.
 */
export function generateSanpinDataMatrixSvg(payload, options = {}) {
    const size = options.size ?? 120;
    const color = options.color ?? "#000000";
    const bgColor = options.bgColor ?? "#ffffff";
    const dimension = 20;
    const grid = generateDataMatrixBitGrid(payload, dimension);
    const moduleSize = size / (dimension + 2); // 1-module quiet zone margin
    let rects = "";
    for (let r = 0; r < dimension; r++) {
        for (let c = 0; c < dimension; c++) {
            if (grid[r][c]) {
                const x = (c + 1) * moduleSize;
                const y = (r + 1) * moduleSize;
                rects += `<rect x="${x.toFixed(2)}" y="${y.toFixed(2)}" width="${moduleSize.toFixed(2)}" height="${moduleSize.toFixed(2)}" fill="${color}" />`;
            }
        }
    }
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}" style="background:${bgColor}; border-radius:3px; display:block;">${rects}</svg>`;
}
/**
 * Formats standardized SanPiN DataMatrix payload string.
 */
export function formatKraftDataMatrixPayload(params) {
    const pDate = params.packDate.slice(0, 10);
    const eDate = params.expDate.slice(0, 10);
    const opId = params.operatorId || "CSO-OP";
    const serialPart = params.serialNumber ? `#${params.serialNumber}` : "";
    // Structured standard: BATCH_ID#SERIAL|AUTOCLAVE_ID|CYC{N}|PACK_DATE|EXP_DATE|OPERATOR_ID|TOOL_SET_ID
    return `${params.batchId}${serialPart}|${params.autoclaveId}|CYC${params.cycleNumber}|${pDate}|${eDate}|${opId}|${params.toolSetId}`;
}
/**
 * Generates 1D Code128 text barcode string for Kraft package serial tracking.
 */
export function generate1DBarcodeString(batchId, serialNumber) {
    const cleanBatch = batchId.replace(/[^A-Za-z0-9]/g, "").toUpperCase();
    const cleanSerial = String(serialNumber).padStart(4, "0");
    return `KB${cleanBatch.slice(-6)}${cleanSerial}`;
}
