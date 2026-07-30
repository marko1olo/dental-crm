// Read-only diagnostic: find the dark rectangles inside the left-hand patient
// column of a captured plate and report their EXACT rgb, so the fix is driven by
// a measured colour instead of a guess. Not part of the shipped app.
import { readFileSync } from "node:fs";
import { PNG } from "pngjs";

const file = process.argv[2];
const maxX = Number(process.argv[3] ?? 620);
const png = PNG.sync.read(readFileSync(file));
console.log(`file=${file} ${png.width}x${png.height} scan x<${maxX}`);

const at = (x, y) => {
	const i = (png.width * y + x) << 2;
	return [png.data[i], png.data[i + 1], png.data[i + 2], png.data[i + 3]];
};
const lum = ([r, g, b]) => 0.2126 * r + 0.7152 * g + 0.0722 * b;

// Row-by-row: longest horizontal run of dark pixels in the scanned column.
const rows = [];
for (let y = 0; y < png.height; y++) {
	let best = 0;
	let bestStart = -1;
	let run = 0;
	let start = -1;
	for (let x = 0; x < Math.min(maxX, png.width); x++) {
		if (lum(at(x, y)) < 70) {
			if (run === 0) start = x;
			run++;
			if (run > best) {
				best = run;
				bestStart = start;
			}
		} else run = 0;
	}
	if (best >= 40) rows.push({ y, start: bestStart, len: best });
}

// Group consecutive rows into rectangles.
const boxes = [];
for (const row of rows) {
	const last = boxes.at(-1);
	if (last && row.y === last.y1 + 1 && Math.abs(row.start - last.x0) < 12) {
		last.y1 = row.y;
		last.len = Math.max(last.len, row.len);
	} else boxes.push({ x0: row.start, y0: row.y, y1: row.y, len: row.len });
}

for (const b of boxes) {
	const h = b.y1 - b.y0 + 1;
	if (h < 6) continue;
	const cy = Math.round((b.y0 + b.y1) / 2);
	// Histogram of the whole box so the dominant fill is unambiguous.
	const counts = new Map();
	for (let y = b.y0; y <= b.y1; y++)
		for (let x = b.x0; x < b.x0 + b.len; x++) {
			const [r, g, bl] = at(x, y);
			const k = `${r},${g},${bl}`;
			counts.set(k, (counts.get(k) ?? 0) + 1);
		}
	const top = [...counts].sort((a, z) => z[1] - a[1]).slice(0, 4);
	const hex = (k) =>
		`#${k
			.split(",")
			.map((n) => Number(n).toString(16).padStart(2, "0"))
			.join("")}`;
	console.log(
		`box x=${b.x0}..${b.x0 + b.len - 1} y=${b.y0}..${b.y1} (w=${b.len} h=${h}) ` +
			`edgeTopPx=${JSON.stringify(at(b.x0 + 2, cy))} ` +
			`fill=${top.map(([k, n]) => `${hex(k)}x${n}`).join(" ")}`,
	);
}
