import { readFileSync } from "node:fs";
import path from "node:path";

const manifestPath = path.resolve("apps/web/public/radiology/demo_cbct/manifest.json");
const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
const validSlices = manifest.slices.filter(
	(s: string) => readFileSync(path.resolve("apps/web/public/radiology/demo_cbct", s)).byteLength >= 720000
);

const depth = validSlices.length;
console.log(`Depth = ${depth} slices.`);
console.log(`Slice 0 filename: ${validSlices[0]}`);
console.log(`Slice ${Math.floor(depth / 2)} filename: ${validSlices[Math.floor(depth / 2)]}`);
console.log(`Slice ${depth - 1} filename: ${validSlices[depth - 1]}`);
