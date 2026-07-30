// Read-only diagnostic: which THEME was actually active in a captured plate?
// Samples the surfaces whose tokens differ per theme (--bg, --paper, --ink) and
// dumps a scanline through the reported black bar so overlapping fills are
// distinguishable from text antialiasing. Not part of the shipped app.
import { readFileSync } from "node:fs";
import { PNG } from "pngjs";

const png = PNG.sync.read(readFileSync(process.argv[2]));
const at = (x, y) => {
	const i = (png.width * y + x) << 2;
	return [png.data[i], png.data[i + 1], png.data[i + 2], png.data[i + 3]];
};
const hex = ([r, g, b]) =>
	`#${[r, g, b].map((n) => n.toString(16).padStart(2, "0")).join("")}`;

console.log(`${png.width}x${png.height}`);
for (const [label, x, y] of [
	["page bg (left of cards)", 120, 500],
	["card surface (Savelyeva, blank area)", 420, 150],
	["card surface (Gromov, selected)", 420, 620],
	["right panel surface", 1100, 550],
	["right panel table row", 1100, 200],
]) {
	console.log(`  ${label.padEnd(38)} ${hex(at(x, y))}`);
}

// Darkest pixel in the name row = the h3 text colour (var(--ink)).
for (const [label, y0, y1, x0, x1] of [
	["h3 «Савельева» darkest", 182, 200, 316, 520],
	["p phone darkest", 204, 218, 316, 430],
	["h3 «Громов» darkest", 643, 661, 316, 505],
]) {
	let best = [255, 255, 255];
	let sum = 999;
	for (let y = y0; y <= y1; y++)
		for (let x = x0; x <= x1; x++) {
			const p = at(x, y);
			const s = p[0] + p[1] + p[2];
			if (s < sum) {
				sum = s;
				best = p;
			}
		}
	console.log(`  ${label.padEnd(38)} ${hex(best)}`);
}

// Scanline through the bar: collapse into runs so a second flat rectangle is
// visible as a long run rather than an antialiasing gradient.
for (const y of [255, 259, 263]) {
	const runs = [];
	for (let x = 310; x <= 530; x++) {
		const h = hex(at(x, y));
		const last = runs.at(-1);
		if (last && last.h === h) last.n++;
		else runs.push({ h, n: 1, x });
	}
	console.log(
		`  y=${y}: ` +
			runs
				.filter((r) => r.n >= 3)
				.map((r) => `${r.h}@${r.x}x${r.n}`)
				.join(" "),
	);
}
