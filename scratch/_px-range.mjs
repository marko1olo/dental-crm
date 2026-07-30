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
const arr = [...counts].map(([k,c])=>({k,c,l:L(k)})).sort((a,b)=>a.l-b.l);
const total = arr.reduce((s,a)=>s+a.c,0);
console.log(`${file.split(/[\/]/).pop()} box(${x0},${y0})-(${x1},${y1}) total=${total} distinct=${arr.length}`);
console.log("  darkest :", arr.slice(0,3).map(a=>`${hex(a.k)}x${a.c}(L${a.l.toFixed(3)})`).join(" "));
console.log("  lightest:", arr.slice(-3).map(a=>`${hex(a.k)}x${a.c}(L${a.l.toFixed(3)})`).join(" "));
const dom = [...counts].sort((a,b)=>b[1]-a[1])[0];
console.log("  dominant:", hex(dom[0]), dom[1], "L=", L(dom[0]).toFixed(3));
const cr=(a,b)=>((Math.max(a,b)+0.05)/(Math.min(a,b)+0.05)).toFixed(2);
console.log("  CR dominant vs darkest:", cr(L(dom[0]), arr[0].l), " vs lightest:", cr(L(dom[0]), arr[arr.length-1].l));
