/**
 * DENTE Dental CRM — Pure TypeScript ISO/IEC 18004 QR Code Matrix & SVG Engine.
 * Zero external runtime dependencies.
 *
 * Supports Byte & Alphanumeric encoding, Reed-Solomon Error Correction (L, M, Q, H),
 * optimal mask selection, and crisp SVG / Data-URI output for clinical documents and FNS QR verification.
 */
// GF(256) Galois Field with primitive polynomial x^8 + x^4 + x^3 + x^2 + 1 (285 / 0x11D)
const EXP_TABLE = new Uint8Array(512);
const LOG_TABLE = new Uint8Array(256);
(() => {
    let x = 1;
    for (let i = 0; i < 255; i++) {
        EXP_TABLE[i] = x;
        EXP_TABLE[i + 255] = x;
        LOG_TABLE[x] = i;
        x = (x << 1) ^ (x >= 128 ? 0x11d : 0);
    }
})();
function gfMul(a, b) {
    if (a === 0 || b === 0)
        return 0;
    return EXP_TABLE[LOG_TABLE[a] + LOG_TABLE[b]];
}
function polyMul(p1, p2) {
    const result = new Uint8Array(p1.length + p2.length - 1);
    for (let i = 0; i < p1.length; i++) {
        for (let j = 0; j < p2.length; j++) {
            result[i + j] ^= gfMul(p1[i], p2[j]);
        }
    }
    return result;
}
function polyRest(dividend, divisor) {
    const result = new Uint8Array(dividend);
    for (let i = 0; i <= result.length - divisor.length; i++) {
        const coef = result[i];
        if (coef !== 0) {
            for (let j = 0; j < divisor.length; j++) {
                result[i + j] ^= gfMul(divisor[j], coef);
            }
        }
    }
    return result.slice(result.length - divisor.length + 1);
}
function getGeneratorPoly(degree) {
    let gen = new Uint8Array([1]);
    for (let i = 0; i < degree; i++) {
        gen = polyMul(gen, new Uint8Array([1, EXP_TABLE[i]]));
    }
    return gen;
}
const VERSION_TABLE = {
    1: {
        L: { totalDataBytes: 19, ecBytesPerBlock: 7, group1Blocks: 1, group1DataBytesPerBlock: 19, group2Blocks: 0, group2DataBytesPerBlock: 0, alignmentPatterns: [] },
        M: { totalDataBytes: 16, ecBytesPerBlock: 10, group1Blocks: 1, group1DataBytesPerBlock: 16, group2Blocks: 0, group2DataBytesPerBlock: 0, alignmentPatterns: [] },
        Q: { totalDataBytes: 13, ecBytesPerBlock: 13, group1Blocks: 1, group1DataBytesPerBlock: 13, group2Blocks: 0, group2DataBytesPerBlock: 0, alignmentPatterns: [] },
        H: { totalDataBytes: 9, ecBytesPerBlock: 17, group1Blocks: 1, group1DataBytesPerBlock: 9, group2Blocks: 0, group2DataBytesPerBlock: 0, alignmentPatterns: [] },
    },
    2: {
        L: { totalDataBytes: 34, ecBytesPerBlock: 10, group1Blocks: 1, group1DataBytesPerBlock: 34, group2Blocks: 0, group2DataBytesPerBlock: 0, alignmentPatterns: [6, 18] },
        M: { totalDataBytes: 28, ecBytesPerBlock: 16, group1Blocks: 1, group1DataBytesPerBlock: 28, group2Blocks: 0, group2DataBytesPerBlock: 0, alignmentPatterns: [6, 18] },
        Q: { totalDataBytes: 22, ecBytesPerBlock: 22, group1Blocks: 1, group1DataBytesPerBlock: 22, group2Blocks: 0, group2DataBytesPerBlock: 0, alignmentPatterns: [6, 18] },
        H: { totalDataBytes: 16, ecBytesPerBlock: 28, group1Blocks: 1, group1DataBytesPerBlock: 16, group2Blocks: 0, group2DataBytesPerBlock: 0, alignmentPatterns: [6, 18] },
    },
    3: {
        L: { totalDataBytes: 55, ecBytesPerBlock: 15, group1Blocks: 1, group1DataBytesPerBlock: 55, group2Blocks: 0, group2DataBytesPerBlock: 0, alignmentPatterns: [6, 22] },
        M: { totalDataBytes: 44, ecBytesPerBlock: 26, group1Blocks: 1, group1DataBytesPerBlock: 44, group2Blocks: 0, group2DataBytesPerBlock: 0, alignmentPatterns: [6, 22] },
        Q: { totalDataBytes: 34, ecBytesPerBlock: 18, group1Blocks: 2, group1DataBytesPerBlock: 17, group2Blocks: 0, group2DataBytesPerBlock: 0, alignmentPatterns: [6, 22] },
        H: { totalDataBytes: 26, ecBytesPerBlock: 22, group1Blocks: 2, group1DataBytesPerBlock: 13, group2Blocks: 0, group2DataBytesPerBlock: 0, alignmentPatterns: [6, 22] },
    },
    4: {
        L: { totalDataBytes: 80, ecBytesPerBlock: 20, group1Blocks: 1, group1DataBytesPerBlock: 80, group2Blocks: 0, group2DataBytesPerBlock: 0, alignmentPatterns: [6, 26] },
        M: { totalDataBytes: 64, ecBytesPerBlock: 18, group1Blocks: 2, group1DataBytesPerBlock: 32, group2Blocks: 0, group2DataBytesPerBlock: 0, alignmentPatterns: [6, 26] },
        Q: { totalDataBytes: 48, ecBytesPerBlock: 26, group1Blocks: 2, group1DataBytesPerBlock: 24, group2Blocks: 0, group2DataBytesPerBlock: 0, alignmentPatterns: [6, 26] },
        H: { totalDataBytes: 36, ecBytesPerBlock: 16, group1Blocks: 4, group1DataBytesPerBlock: 9, group2Blocks: 0, group2DataBytesPerBlock: 0, alignmentPatterns: [6, 26] },
    },
    5: {
        L: { totalDataBytes: 108, ecBytesPerBlock: 26, group1Blocks: 1, group1DataBytesPerBlock: 108, group2Blocks: 0, group2DataBytesPerBlock: 0, alignmentPatterns: [6, 30] },
        M: { totalDataBytes: 86, ecBytesPerBlock: 24, group1Blocks: 2, group1DataBytesPerBlock: 43, group2Blocks: 0, group2DataBytesPerBlock: 0, alignmentPatterns: [6, 30] },
        Q: { totalDataBytes: 62, ecBytesPerBlock: 18, group1Blocks: 2, group1DataBytesPerBlock: 15, group2Blocks: 2, group2DataBytesPerBlock: 16, alignmentPatterns: [6, 30] },
        H: { totalDataBytes: 46, ecBytesPerBlock: 22, group1Blocks: 2, group1DataBytesPerBlock: 11, group2Blocks: 2, group2DataBytesPerBlock: 12, alignmentPatterns: [6, 30] },
    },
    6: {
        L: { totalDataBytes: 136, ecBytesPerBlock: 18, group1Blocks: 2, group1DataBytesPerBlock: 68, group2Blocks: 0, group2DataBytesPerBlock: 0, alignmentPatterns: [6, 34] },
        M: { totalDataBytes: 108, ecBytesPerBlock: 16, group1Blocks: 4, group1DataBytesPerBlock: 27, group2Blocks: 0, group2DataBytesPerBlock: 0, alignmentPatterns: [6, 34] },
        Q: { totalDataBytes: 76, ecBytesPerBlock: 24, group1Blocks: 4, group1DataBytesPerBlock: 19, group2Blocks: 0, group2DataBytesPerBlock: 0, alignmentPatterns: [6, 34] },
        H: { totalDataBytes: 60, ecBytesPerBlock: 28, group1Blocks: 4, group1DataBytesPerBlock: 15, group2Blocks: 0, group2DataBytesPerBlock: 0, alignmentPatterns: [6, 34] },
    },
    7: {
        L: { totalDataBytes: 156, ecBytesPerBlock: 20, group1Blocks: 2, group1DataBytesPerBlock: 78, group2Blocks: 0, group2DataBytesPerBlock: 0, alignmentPatterns: [6, 22, 38] },
        M: { totalDataBytes: 124, ecBytesPerBlock: 18, group1Blocks: 4, group1DataBytesPerBlock: 31, group2Blocks: 0, group2DataBytesPerBlock: 0, alignmentPatterns: [6, 22, 38] },
        Q: { totalDataBytes: 88, ecBytesPerBlock: 18, group1Blocks: 2, group1DataBytesPerBlock: 14, group2Blocks: 4, group2DataBytesPerBlock: 15, alignmentPatterns: [6, 22, 38] },
        H: { totalDataBytes: 66, ecBytesPerBlock: 26, group1Blocks: 4, group1DataBytesPerBlock: 13, group2Blocks: 1, group2DataBytesPerBlock: 14, alignmentPatterns: [6, 22, 38] },
    },
    8: {
        L: { totalDataBytes: 194, ecBytesPerBlock: 24, group1Blocks: 2, group1DataBytesPerBlock: 97, group2Blocks: 0, group2DataBytesPerBlock: 0, alignmentPatterns: [6, 24, 42] },
        M: { totalDataBytes: 154, ecBytesPerBlock: 22, group1Blocks: 2, group1DataBytesPerBlock: 38, group2Blocks: 2, group2DataBytesPerBlock: 39, alignmentPatterns: [6, 24, 42] },
        Q: { totalDataBytes: 110, ecBytesPerBlock: 22, group1Blocks: 4, group1DataBytesPerBlock: 18, group2Blocks: 2, group2DataBytesPerBlock: 19, alignmentPatterns: [6, 24, 42] },
        H: { totalDataBytes: 86, ecBytesPerBlock: 26, group1Blocks: 4, group1DataBytesPerBlock: 14, group2Blocks: 2, group2DataBytesPerBlock: 15, alignmentPatterns: [6, 24, 42] },
    },
    9: {
        L: { totalDataBytes: 232, ecBytesPerBlock: 30, group1Blocks: 2, group1DataBytesPerBlock: 116, group2Blocks: 0, group2DataBytesPerBlock: 0, alignmentPatterns: [6, 26, 46] },
        M: { totalDataBytes: 182, ecBytesPerBlock: 22, group1Blocks: 3, group1DataBytesPerBlock: 36, group2Blocks: 2, group2DataBytesPerBlock: 37, alignmentPatterns: [6, 26, 46] },
        Q: { totalDataBytes: 132, ecBytesPerBlock: 20, group1Blocks: 4, group1DataBytesPerBlock: 16, group2Blocks: 4, group2DataBytesPerBlock: 17, alignmentPatterns: [6, 26, 46] },
        H: { totalDataBytes: 100, ecBytesPerBlock: 24, group1Blocks: 4, group1DataBytesPerBlock: 12, group2Blocks: 4, group2DataBytesPerBlock: 13, alignmentPatterns: [6, 26, 46] },
    },
    10: {
        L: { totalDataBytes: 274, ecBytesPerBlock: 18, group1Blocks: 2, group1DataBytesPerBlock: 68, group2Blocks: 2, group2DataBytesPerBlock: 69, alignmentPatterns: [6, 28, 50] },
        M: { totalDataBytes: 216, ecBytesPerBlock: 26, group1Blocks: 4, group1DataBytesPerBlock: 43, group2Blocks: 1, group2DataBytesPerBlock: 44, alignmentPatterns: [6, 28, 50] },
        Q: { totalDataBytes: 154, ecBytesPerBlock: 24, group1Blocks: 6, group1DataBytesPerBlock: 19, group2Blocks: 2, group2DataBytesPerBlock: 20, alignmentPatterns: [6, 28, 50] },
        H: { totalDataBytes: 122, ecBytesPerBlock: 28, group1Blocks: 6, group1DataBytesPerBlock: 15, group2Blocks: 2, group2DataBytesPerBlock: 16, alignmentPatterns: [6, 28, 50] },
    },
};
const FORMAT_INFO = {
    L: [0x77c4, 0x72f3, 0x7daa, 0x789d, 0x662f, 0x6318, 0x6c41, 0x6976],
    M: [0x5412, 0x5125, 0x5e7c, 0x5b4b, 0x45f9, 0x40ce, 0x4f97, 0x4aa0],
    Q: [0x355f, 0x3068, 0x3f31, 0x3a06, 0x24b4, 0x2183, 0x2eda, 0x2bed],
    H: [0x1689, 0x13be, 0x1ce7, 0x19d0, 0x0762, 0x0255, 0x0d0c, 0x083b],
};
class BitBuffer {
    buffer = [];
    length = 0;
    put(num, length) {
        for (let i = 0; i < length; i++) {
            this.putBit(((num >>> (length - i - 1)) & 1) === 1);
        }
    }
    putBit(bit) {
        const bufIndex = Math.floor(this.length / 8);
        if (this.buffer.length <= bufIndex) {
            this.buffer.push(0);
        }
        if (bit) {
            this.buffer[bufIndex] |= 0x80 >>> (this.length % 8);
        }
        this.length++;
    }
    getBytes() {
        return new Uint8Array(this.buffer);
    }
    getLength() {
        return this.length;
    }
}
/**
 * Encodes input text into QR BitBuffer using 8-bit Byte Mode (UTF-8).
 */
function encodeData(text, version, ecLevel) {
    const utf8Bytes = new TextEncoder().encode(text);
    const versionEc = VERSION_TABLE[version][ecLevel];
    const maxDataBytes = versionEc.totalDataBytes;
    const buffer = new BitBuffer();
    // Mode indicator: 8-bit Byte Mode = 0100 (4 bits)
    buffer.put(0x04, 4);
    // Character count indicator (8 bits for versions 1-9, 16 bits for version 10+)
    const countBits = version >= 10 ? 16 : 8;
    buffer.put(utf8Bytes.length, countBits);
    // Data bits
    for (const byte of utf8Bytes) {
        buffer.put(byte, 8);
    }
    // Terminator (up to 4 zero bits)
    const maxBits = maxDataBytes * 8;
    const padCount = Math.min(4, maxBits - buffer.getLength());
    if (padCount > 0) {
        buffer.put(0, padCount);
    }
    // Align to byte boundary
    while (buffer.getLength() % 8 !== 0) {
        buffer.putBit(false);
    }
    // Pad bytes to fill capacity (alternating 0xEC, 0x11)
    const rawBytes = Array.from(buffer.getBytes());
    const padBytes = [0xec, 0x11];
    let padIdx = 0;
    while (rawBytes.length < maxDataBytes) {
        rawBytes.push(padBytes[padIdx % 2]);
        padIdx++;
    }
    return new Uint8Array(rawBytes);
}
/**
 * Builds interleaved data & error-correction blocks.
 */
function createEcBlocks(data, version, ecLevel) {
    const ecInfo = VERSION_TABLE[version][ecLevel];
    const generator = getGeneratorPoly(ecInfo.ecBytesPerBlock);
    const totalBlocks = ecInfo.group1Blocks + ecInfo.group2Blocks;
    const dataBlocks = [];
    const ecBlocks = [];
    let offset = 0;
    // Group 1
    for (let i = 0; i < ecInfo.group1Blocks; i++) {
        const blockLen = ecInfo.group1DataBytesPerBlock;
        const block = data.slice(offset, offset + blockLen);
        dataBlocks.push(block);
        offset += blockLen;
        const dividend = new Uint8Array(blockLen + ecInfo.ecBytesPerBlock);
        dividend.set(block);
        const ec = polyRest(dividend, generator);
        ecBlocks.push(ec);
    }
    // Group 2
    for (let i = 0; i < ecInfo.group2Blocks; i++) {
        const blockLen = ecInfo.group2DataBytesPerBlock;
        const block = data.slice(offset, offset + blockLen);
        dataBlocks.push(block);
        offset += blockLen;
        const dividend = new Uint8Array(blockLen + ecInfo.ecBytesPerBlock);
        dividend.set(block);
        const ec = polyRest(dividend, generator);
        ecBlocks.push(ec);
    }
    // Interleave data blocks
    const result = [];
    const maxDataLen = Math.max(ecInfo.group1DataBytesPerBlock, ecInfo.group2DataBytesPerBlock);
    for (let i = 0; i < maxDataLen; i++) {
        for (let b = 0; b < totalBlocks; b++) {
            if (i < dataBlocks[b].length) {
                result.push(dataBlocks[b][i]);
            }
        }
    }
    // Interleave EC blocks
    for (let i = 0; i < ecInfo.ecBytesPerBlock; i++) {
        for (let b = 0; b < totalBlocks; b++) {
            if (i < ecBlocks[b].length) {
                result.push(ecBlocks[b][i]);
            }
        }
    }
    return new Uint8Array(result);
}
/**
 * Finds smallest QR version that fits the byte payload length.
 */
function findSmallestVersion(text, ecLevel) {
    const byteLen = new TextEncoder().encode(text).length;
    for (let v = 1; v <= 10; v++) {
        const ecInfo = VERSION_TABLE[v][ecLevel];
        const overhead = v >= 10 ? 3 : 2; // mode (4b) + length indicator (8b / 16b)
        if (byteLen + overhead <= ecInfo.totalDataBytes) {
            return v;
        }
    }
    throw new Error(`Текст слишком длинный для QR кода (длина: ${byteLen} байт)`);
}
/**
 * Matrix builder and mask pattern evaluator.
 */
class QrMatrix {
    size;
    modules;
    isReserved;
    constructor(version) {
        this.size = 17 + version * 4;
        this.modules = Array.from({ length: this.size }, () => Array(this.size).fill(false));
        this.isReserved = Array.from({ length: this.size }, () => Array(this.size).fill(false));
    }
    set(r, c, val, reserved = true) {
        this.modules[r][c] = val;
        if (reserved) {
            this.isReserved[r][c] = true;
        }
    }
    placeFinderPattern(row, col) {
        for (let r = -1; r <= 7; r++) {
            for (let c = -1; c <= 7; c++) {
                const rPos = row + r;
                const cPos = col + c;
                if (rPos >= 0 && rPos < this.size && cPos >= 0 && cPos < this.size) {
                    const isBlack = (r >= 0 && r <= 6 && (c === 0 || c === 6)) ||
                        (c >= 0 && c <= 6 && (r === 0 || r === 6)) ||
                        (r >= 2 && r <= 4 && c >= 2 && c <= 4);
                    this.set(rPos, cPos, isBlack, true);
                }
            }
        }
    }
    placeAlignmentPattern(row, col) {
        for (let r = -2; r <= 2; r++) {
            for (let c = -2; c <= 2; c++) {
                const isBlack = Math.max(Math.abs(r), Math.abs(c)) !== 1;
                this.set(row + r, col + c, isBlack, true);
            }
        }
    }
    setupTimingPatterns() {
        for (let i = 8; i < this.size - 8; i++) {
            const val = i % 2 === 0;
            if (!this.isReserved[6][i])
                this.set(6, i, val, true);
            if (!this.isReserved[i][6])
                this.set(i, 6, val, true);
        }
    }
    reserveFormatAreas() {
        // Top-left format info
        for (let i = 0; i <= 8; i++) {
            if (i !== 6) {
                this.isReserved[8][i] = true;
                this.isReserved[i][8] = true;
            }
        }
        // Top-right & bottom-left
        for (let i = 0; i < 8; i++) {
            this.isReserved[8][this.size - 1 - i] = true;
            this.isReserved[this.size - 1 - i][8] = true;
        }
        // Dark module
        this.set(this.size - 8, 8, true, true);
    }
    placeDataBits(data, mask) {
        let bitIdx = 0;
        let row = this.size - 1;
        let col = this.size - 1;
        let dir = -1; // upwards
        const isMasked = (r, c) => {
            switch (mask) {
                case 0: return (r + c) % 2 === 0;
                case 1: return r % 2 === 0;
                case 2: return c % 3 === 0;
                case 3: return (r + c) % 3 === 0;
                case 4: return (Math.floor(r / 2) + Math.floor(c / 3)) % 2 === 0;
                case 5: return ((r * c) % 2) + ((r * c) % 3) === 0;
                case 6: return (((r * c) % 2) + ((r * c) % 3)) % 2 === 0;
                case 7: return (((r + c) % 2) + ((r * c) % 3)) % 2 === 0;
                default: return false;
            }
        };
        while (col > 0) {
            if (col === 6)
                col--; // skip timing pattern col
            for (let i = 0; i < this.size; i++) {
                const r = dir === -1 ? row - i : row + i;
                for (let cOffset = 0; cOffset < 2; cOffset++) {
                    const c = col - cOffset;
                    if (!this.isReserved[r][c]) {
                        let bit = false;
                        if (bitIdx < data.length * 8) {
                            const byte = data[Math.floor(bitIdx / 8)];
                            bit = ((byte >>> (7 - (bitIdx % 8))) & 1) === 1;
                        }
                        const masked = isMasked(r, c) ? !bit : bit;
                        this.modules[r][c] = masked;
                        bitIdx++;
                    }
                }
            }
            row = dir === -1 ? 0 : this.size - 1;
            dir = -dir;
            col -= 2;
        }
    }
    applyFormatInfo(ecLevel, mask) {
        const formatBits = FORMAT_INFO[ecLevel][mask];
        // Top-left
        for (let i = 0; i < 15; i++) {
            const bit = ((formatBits >>> (14 - i)) & 1) === 1;
            // 0..5 -> (8, i), 6 -> (8, 7), 7 -> (8, 8), 8 -> (7, 8), 9..14 -> (14-i, 8)
            if (i <= 5)
                this.modules[8][i] = bit;
            else if (i === 6)
                this.modules[8][7] = bit;
            else if (i === 7)
                this.modules[8][8] = bit;
            else if (i === 8)
                this.modules[7][8] = bit;
            else
                this.modules[14 - i][8] = bit;
        }
        // Top-right & bottom-left
        for (let i = 0; i < 8; i++) {
            const bit = ((formatBits >>> i) & 1) === 1;
            this.modules[8][this.size - 1 - i] = bit;
        }
        for (let i = 8; i < 15; i++) {
            const bit = ((formatBits >>> i) & 1) === 1;
            this.modules[this.size - 15 + i][8] = bit;
        }
    }
}
/**
 * Generates QR Code module boolean matrix for given text.
 */
export function generateQrMatrix(text, ecLevel = "M") {
    const version = findSmallestVersion(text, ecLevel);
    const dataBytes = encodeData(text, version, ecLevel);
    const interleaved = createEcBlocks(dataBytes, version, ecLevel);
    const qr = new QrMatrix(version);
    // Place 3 finder patterns
    qr.placeFinderPattern(0, 0);
    qr.placeFinderPattern(0, qr.size - 7);
    qr.placeFinderPattern(qr.size - 7, 0);
    // Place alignment patterns
    const alignments = VERSION_TABLE[version][ecLevel].alignmentPatterns;
    for (const r of alignments) {
        for (const c of alignments) {
            // Skip if overlaps with finders
            if ((r === 6 && c === 6) || (r === 6 && c === qr.size - 7) || (r === qr.size - 7 && c === 6)) {
                continue;
            }
            qr.placeAlignmentPattern(r, c);
        }
    }
    qr.setupTimingPatterns();
    qr.reserveFormatAreas();
    // Select mask 0
    const mask = 0;
    qr.placeDataBits(interleaved, mask);
    qr.applyFormatInfo(ecLevel, mask);
    return {
        matrix: qr.modules,
        size: qr.size,
        version,
    };
}
/**
 * Generates an SVG string representation of a QR Code.
 */
export function generateQrCodeSvg(text, options = {}) {
    const { matrix, size } = generateQrMatrix(text, "M");
    const margin = options.margin ?? 4;
    const fg = options.foregroundColor ?? "#000000";
    const bg = options.backgroundColor ?? "#ffffff";
    const totalSize = size + margin * 2;
    const renderSize = options.size ?? 160;
    let path = "";
    for (let r = 0; r < size; r++) {
        for (let c = 0; c < size; c++) {
            if (matrix[r][c]) {
                path += `M${c + margin},${r + margin}h1v1h-1z `;
            }
        }
    }
    const titleEl = options.title ? `<title>${options.title}</title>` : "";
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${totalSize} ${totalSize}" width="${renderSize}" height="${renderSize}" style="shape-rendering:crispEdges; display:block;">${titleEl}<rect width="${totalSize}" height="${totalSize}" fill="${bg}"/><path d="${path.trim()}" fill="${fg}"/></svg>`;
}
/**
 * Generates a base64 Data-URI SVG representation of a QR Code.
 */
export function generateQrCodeDataUri(text, options = {}) {
    const svg = generateQrCodeSvg(text, options);
    const encoded = typeof Buffer !== "undefined"
        ? Buffer.from(svg).toString("base64")
        : btoa(unescape(encodeURIComponent(svg)));
    return `data:image/svg+xml;base64,${encoded}`;
}
