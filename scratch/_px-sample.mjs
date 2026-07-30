import fs from "node:fs";
import { PNG } from "pngjs";
const [file, x0, y0, x1, y1] = [process.argv[2], +process.argv[3], +process.argv[4], +process.argv[5], +process.argv[6]];
const png = PNG.sync.read(fs.readFileSync(file));
const counts = new Map();
for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
  const i = (png.width * y + x) << 2;
  const k = `${png.data[i]},${png.data[i+1]},${png.data[i+2]}`;
  counts.set(k, (counts.get(k) || 0) + 1);
}
const hex = (k) => "#" + k.split(",").map(n => (+n).toString(16).padStart(2, "0")).join("");
const L = (k) => { const c = k.split(",").map(n => +n / 255).map(v => v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4); return 0.2126*c[0] + 0.7152*c[1] + 0.0722*c[2]; };
const sorted = [...counts].sort((a,b)=>b[1]-a[1]).slice(0, 6);
console.log(file.split(/[\/]/).pop(), `${png.width}x${png.height}`, `box(${x0},${y0})-(${x1},${y1})`);
for (const [k,c] of sorted) console.log("   ", hex(k).padEnd(9), String(c).padStart(6), "L=", L(k).toFixed(4));
if (sorted.length > 1) {
  const a = L(sorted[0][0]), b = L(sorted.map(s=>s[0]).sort((p,q)=>Math.abs(L(q)-a)-Math.abs(L(p)-a))[0]);
  console.log("    max contrast in box:", ((Math.max(a,b)+0.05)/(Math.min(a,b)+0.05)).toFixed(2));
}
