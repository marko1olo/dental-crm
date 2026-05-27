const QR_VERSION = 4;
const QR_SIZE = 17 + QR_VERSION * 4;
const DATA_CODEWORDS = 80;
const ECC_CODEWORDS = 20;
const MAX_QR_BYTES = 78;

type Bit = 0 | 1;

const gfExp = new Array<number>(512).fill(0);
const gfLog = new Array<number>(256).fill(0);

let gfValue = 1;
for (let index = 0; index < 255; index += 1) {
  gfExp[index] = gfValue;
  gfLog[gfValue] = index;
  gfValue <<= 1;
  if (gfValue & 0x100) gfValue ^= 0x11d;
}
for (let index = 255; index < gfExp.length; index += 1) {
  gfExp[index] = gfExp[index - 255] ?? 0;
}

function gfMultiply(left: number, right: number): number {
  if (left === 0 || right === 0) return 0;
  return gfExp[(gfLog[left] ?? 0) + (gfLog[right] ?? 0)] ?? 0;
}

function reedSolomonGenerator(degree: number): number[] {
  let generator = [1];
  for (let index = 0; index < degree; index += 1) {
    const next = new Array<number>(generator.length + 1).fill(0);
    for (let coefficient = 0; coefficient < generator.length; coefficient += 1) {
      const current = generator[coefficient] ?? 0;
      next[coefficient] = (next[coefficient] ?? 0) ^ current;
      next[coefficient + 1] = (next[coefficient + 1] ?? 0) ^ gfMultiply(current, gfExp[index] ?? 0);
    }
    generator = next;
  }
  return generator;
}

function reedSolomonRemainder(data: number[], degree: number): number[] {
  const generator = reedSolomonGenerator(degree);
  const result = [...data, ...new Array<number>(degree).fill(0)];
  for (let index = 0; index < data.length; index += 1) {
    const factor = result[index] ?? 0;
    if (factor === 0) continue;
    for (let generatorIndex = 0; generatorIndex < generator.length; generatorIndex += 1) {
      result[index + generatorIndex] =
        (result[index + generatorIndex] ?? 0) ^ gfMultiply(generator[generatorIndex] ?? 0, factor);
    }
  }
  return result.slice(data.length);
}

function appendBits(bits: Bit[], value: number, length: number): void {
  for (let index = length - 1; index >= 0; index -= 1) {
    bits.push(((value >>> index) & 1) as Bit);
  }
}

function byteModeCodewords(text: string): number[] | null {
  const bytes = Array.from(Buffer.from(text, "utf8"));
  if (bytes.length > MAX_QR_BYTES) return null;

  const bits: Bit[] = [];
  appendBits(bits, 0b0100, 4);
  appendBits(bits, bytes.length, 8);
  for (const byte of bytes) appendBits(bits, byte, 8);

  const totalBits = DATA_CODEWORDS * 8;
  appendBits(bits, 0, Math.min(4, totalBits - bits.length));
  while (bits.length % 8 !== 0) bits.push(0);

  const codewords: number[] = [];
  for (let index = 0; index < bits.length; index += 8) {
    let codeword = 0;
    for (let bit = 0; bit < 8; bit += 1) {
      codeword = (codeword << 1) | (bits[index + bit] ?? 0);
    }
    codewords.push(codeword);
  }

  for (let padIndex = 0; codewords.length < DATA_CODEWORDS; padIndex += 1) {
    codewords.push(padIndex % 2 === 0 ? 0xec : 0x11);
  }
  return codewords;
}

function blankMatrix(): { modules: boolean[][]; reserved: boolean[][] } {
  return {
    modules: Array.from({ length: QR_SIZE }, () => new Array<boolean>(QR_SIZE).fill(false)),
    reserved: Array.from({ length: QR_SIZE }, () => new Array<boolean>(QR_SIZE).fill(false))
  };
}

function setFunctionModule(
  modules: boolean[][],
  reserved: boolean[][],
  x: number,
  y: number,
  isDark: boolean
): void {
  if (x < 0 || y < 0 || x >= QR_SIZE || y >= QR_SIZE) return;
  modules[y]![x] = isDark;
  reserved[y]![x] = true;
}

function drawFinder(modules: boolean[][], reserved: boolean[][], left: number, top: number): void {
  for (let y = -1; y <= 7; y += 1) {
    for (let x = -1; x <= 7; x += 1) {
      const xx = left + x;
      const yy = top + y;
      const inside = x >= 0 && x <= 6 && y >= 0 && y <= 6;
      const dark =
        inside &&
        (x === 0 || x === 6 || y === 0 || y === 6 || (x >= 2 && x <= 4 && y >= 2 && y <= 4));
      setFunctionModule(modules, reserved, xx, yy, dark);
    }
  }
}

function drawAlignment(modules: boolean[][], reserved: boolean[][], centerX: number, centerY: number): void {
  for (let y = -2; y <= 2; y += 1) {
    for (let x = -2; x <= 2; x += 1) {
      setFunctionModule(modules, reserved, centerX + x, centerY + y, Math.max(Math.abs(x), Math.abs(y)) !== 1);
    }
  }
}

function reserveFormat(modules: boolean[][], reserved: boolean[][]): void {
  for (let index = 0; index <= 5; index += 1) {
    setFunctionModule(modules, reserved, 8, index, false);
    setFunctionModule(modules, reserved, index, 8, false);
  }
  setFunctionModule(modules, reserved, 8, 7, false);
  setFunctionModule(modules, reserved, 8, 8, false);
  setFunctionModule(modules, reserved, 7, 8, false);

  for (let index = 0; index < 8; index += 1) {
    setFunctionModule(modules, reserved, QR_SIZE - 1 - index, 8, false);
  }
  for (let index = 0; index < 7; index += 1) {
    setFunctionModule(modules, reserved, 8, QR_SIZE - 1 - index, false);
  }
}

function drawFunctionPatterns(modules: boolean[][], reserved: boolean[][]): void {
  drawFinder(modules, reserved, 0, 0);
  drawFinder(modules, reserved, QR_SIZE - 7, 0);
  drawFinder(modules, reserved, 0, QR_SIZE - 7);
  drawAlignment(modules, reserved, 26, 26);

  for (let index = 8; index < QR_SIZE - 8; index += 1) {
    const dark = index % 2 === 0;
    setFunctionModule(modules, reserved, index, 6, dark);
    setFunctionModule(modules, reserved, 6, index, dark);
  }

  reserveFormat(modules, reserved);
  setFunctionModule(modules, reserved, 8, QR_SIZE - 8, true);
}

function formatBits(): number {
  const errorCorrectionLevelL = 0b01;
  const maskPattern = 0b000;
  const data = (errorCorrectionLevelL << 3) | maskPattern;
  let value = data << 10;
  const generator = 0x537;
  for (let bit = 14; bit >= 10; bit -= 1) {
    if (((value >>> bit) & 1) !== 0) value ^= generator << (bit - 10);
  }
  return ((data << 10) | (value & 0x3ff)) ^ 0x5412;
}

function getBit(value: number, bit: number): boolean {
  return ((value >>> bit) & 1) !== 0;
}

function drawFormatBits(modules: boolean[][], reserved: boolean[][]): void {
  const bits = formatBits();
  for (let index = 0; index <= 5; index += 1) setFunctionModule(modules, reserved, 8, index, getBit(bits, index));
  setFunctionModule(modules, reserved, 8, 7, getBit(bits, 6));
  setFunctionModule(modules, reserved, 8, 8, getBit(bits, 7));
  setFunctionModule(modules, reserved, 7, 8, getBit(bits, 8));
  for (let index = 9; index < 15; index += 1) {
    setFunctionModule(modules, reserved, 14 - index, 8, getBit(bits, index));
  }
  for (let index = 0; index < 8; index += 1) {
    setFunctionModule(modules, reserved, QR_SIZE - 1 - index, 8, getBit(bits, index));
  }
  for (let index = 8; index < 15; index += 1) {
    setFunctionModule(modules, reserved, 8, QR_SIZE - 15 + index, getBit(bits, index));
  }
  setFunctionModule(modules, reserved, 8, QR_SIZE - 8, true);
}

function drawData(modules: boolean[][], reserved: boolean[][], codewords: number[]): void {
  const bits: Bit[] = [];
  for (const codeword of codewords) appendBits(bits, codeword, 8);

  let bitIndex = 0;
  let upward = true;
  for (let x = QR_SIZE - 1; x > 0; x -= 2) {
    if (x === 6) x -= 1;
    for (let vertical = 0; vertical < QR_SIZE; vertical += 1) {
      const y = upward ? QR_SIZE - 1 - vertical : vertical;
      for (let dx = 0; dx < 2; dx += 1) {
        const xx = x - dx;
        if (reserved[y]?.[xx]) continue;
        let bit = bitIndex < bits.length ? bits[bitIndex] ?? 0 : 0;
        bitIndex += 1;
        if ((xx + y) % 2 === 0) bit = bit === 1 ? 0 : 1;
        modules[y]![xx] = bit === 1;
      }
    }
    upward = !upward;
  }
}

function modulesToSvg(modules: boolean[][]): string {
  const quietZone = 4;
  const viewBoxSize = QR_SIZE + quietZone * 2;
  const pathParts: string[] = [];
  for (let y = 0; y < QR_SIZE; y += 1) {
    for (let x = 0; x < QR_SIZE; x += 1) {
      if (modules[y]?.[x]) pathParts.push(`M${x + quietZone} ${y + quietZone}h1v1H${x + quietZone}z`);
    }
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${viewBoxSize} ${viewBoxSize}" shape-rendering="crispEdges" role="img" aria-label="DENTE Telegram QR"><rect width="100%" height="100%" fill="#fff"/><path fill="#111827" d="${pathParts.join("")}"/></svg>`;
}

export function createTelegramQrSvg(payload: string | null): string | null {
  if (!payload) return null;
  const data = byteModeCodewords(payload);
  if (!data) return null;
  const ecc = reedSolomonRemainder(data, ECC_CODEWORDS);
  const { modules, reserved } = blankMatrix();
  drawFunctionPatterns(modules, reserved);
  drawData(modules, reserved, [...data, ...ecc]);
  drawFormatBits(modules, reserved);
  return modulesToSvg(modules);
}
