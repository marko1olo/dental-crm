const cp1252SpecialBytes = new Map<number, number>([
  [0x20ac, 0x80],
  [0x201a, 0x82],
  [0x0192, 0x83],
  [0x201e, 0x84],
  [0x2026, 0x85],
  [0x2020, 0x86],
  [0x2021, 0x87],
  [0x02c6, 0x88],
  [0x2030, 0x89],
  [0x0160, 0x8a],
  [0x2039, 0x8b],
  [0x0152, 0x8c],
  [0x017d, 0x8e],
  [0x2018, 0x91],
  [0x2019, 0x92],
  [0x201c, 0x93],
  [0x201d, 0x94],
  [0x2022, 0x95],
  [0x2013, 0x96],
  [0x2014, 0x97],
  [0x02dc, 0x98],
  [0x2122, 0x99],
  [0x0161, 0x9a],
  [0x203a, 0x9b],
  [0x0153, 0x9c],
  [0x017e, 0x9e],
  [0x0178, 0x9f]
]);

function likelyMojibake(value: string): boolean {
  return /(?:Ã.|Â.|Ð.|Ñ.|â.)/.test(value);
}

function encodeCp1252Mojibake(value: string): Uint8Array | null {
  const bytes: number[] = [];
  for (const char of value) {
    const codePoint = char.codePointAt(0);
    if (codePoint === undefined) return null;
    if (codePoint <= 0xff) {
      bytes.push(codePoint);
      continue;
    }
    const specialByte = cp1252SpecialBytes.get(codePoint);
    if (specialByte === undefined) return null;
    bytes.push(specialByte);
  }
  return Uint8Array.from(bytes);
}

function cyrillicCount(value: string): number {
  return (value.match(/[А-Яа-яЁё]/g) ?? []).length;
}

function mojibakeMarkerCount(value: string): number {
  return (value.match(/[ÃÂÐÑâ]/g) ?? []).length;
}

export function repairMojibakeText(value: string): string {
  if (!likelyMojibake(value)) return value;
  const bytes = encodeCp1252Mojibake(value);
  if (bytes) {
    const decoded = Buffer.from(bytes).toString("utf8");
    if (
      decoded &&
      !decoded.includes("\uFFFD") &&
      (cyrillicCount(decoded) > cyrillicCount(value) || mojibakeMarkerCount(decoded) < mojibakeMarkerCount(value))
    ) {
      return decoded;
    }
  }

  const repairedByToken = value
    .split(/(\s+)/)
    .map((part) => {
      if (!likelyMojibake(part)) return part;
      const partBytes = encodeCp1252Mojibake(part);
      if (!partBytes) return part;
      const decoded = Buffer.from(partBytes).toString("utf8");
      if (!decoded || decoded.includes("\uFFFD")) return part;
      if (cyrillicCount(decoded) <= cyrillicCount(part) && mojibakeMarkerCount(decoded) >= mojibakeMarkerCount(part)) return part;
      return decoded;
    })
    .join("");

  if (
    cyrillicCount(repairedByToken) > cyrillicCount(value) ||
    mojibakeMarkerCount(repairedByToken) < mojibakeMarkerCount(value)
  ) {
    return repairedByToken;
  }
  return value;
}

export function repairMojibakeDeep<T>(value: T): T {
  if (typeof value === "string") {
    return repairMojibakeText(value) as T;
  }
  if (Array.isArray(value)) {
    return value.map((item) => repairMojibakeDeep(item)) as T;
  }
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, entry]) => [key, repairMojibakeDeep(entry)])
    ) as T;
  }
  return value;
}
