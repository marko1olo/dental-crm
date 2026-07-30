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
const byCount = [...counts].sort((a,b)=>b[1]-a[1]);
const bg = byCount[0][0];
// текст: самый частый цвет, отстоящий от фона по яркости больше всех
const arr = [...counts].map(([k,c])=>({k,c,l:L(k)}));
const lbg = L(bg);
const ink = arr.filter(a=>a.c>=8).sort((a,b)=>Math.abs(b.l-lbg)-Math.abs(a.l-lbg))[0];
const cr = ((Math.max(lbg, ink.l)+0.05)/(Math.min(lbg, ink.l)+0.05));
console.log(`${process.argv[7]||""} bg=${hex(bg)}(${byCount[0][1]}) ink=${hex(ink.k)}(${ink.c}) CR=${cr.toFixed(2)}`);
