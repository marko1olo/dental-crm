/**
 * Попиксельное сравнение снимков «до» и «после».
 * Декодирование — через canvas в браузере, чтобы не тянуть зависимости.
 * Печатает долю изменившихся пикселей по каждой паре.
 */
import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";

const A_DIR = process.argv[2] || "scratch/ui-audit-before";
const B_DIR = process.argv[3] || "scratch/ui-audit-after";
const OUT = "scratch/ui-audit-diff";

const names = fs
  .readdirSync(A_DIR)
  .filter((f) => f.endsWith(".png") && fs.existsSync(path.join(B_DIR, f)))
  .sort();

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
await page.goto("about:blank");
fs.mkdirSync(OUT, { recursive: true });

const results = [];
for (const name of names) {
  const a = fs.readFileSync(path.join(A_DIR, name)).toString("base64");
  const b = fs.readFileSync(path.join(B_DIR, name)).toString("base64");
  const r = await page.evaluate(
    async ({ a, b }) => {
      const load = async (d) => {
        const img = new Image();
        img.src = `data:image/png;base64,${d}`;
        await img.decode();
        return img;
      };
      const ia = await load(a);
      const ib = await load(b);
      const w = Math.min(ia.naturalWidth, ib.naturalWidth);
      const h = Math.min(ia.naturalHeight, ib.naturalHeight);
      const mk = (img) => {
        const c = document.createElement("canvas");
        c.width = w;
        c.height = h;
        c.getContext("2d", { willReadFrequently: true }).drawImage(img, 0, 0);
        return c.getContext("2d", { willReadFrequently: true }).getImageData(0, 0, w, h).data;
      };
      const da = mk(ia);
      const db = mk(ib);
      let diff = 0;
      const outC = document.createElement("canvas");
      outC.width = w;
      outC.height = h;
      const octx = outC.getContext("2d");
      const od = octx.createImageData(w, h);
      for (let i = 0; i < da.length; i += 4) {
        const d = Math.abs(da[i] - db[i]) + Math.abs(da[i + 1] - db[i + 1]) + Math.abs(da[i + 2] - db[i + 2]);
        if (d > 24) {
          diff += 1;
          od.data[i] = 255; od.data[i + 1] = 0; od.data[i + 2] = 0; od.data[i + 3] = 255;
        } else {
          const g = Math.round((da[i] + da[i + 1] + da[i + 2]) / 3 * 0.25 + 190);
          od.data[i] = g; od.data[i + 1] = g; od.data[i + 2] = g; od.data[i + 3] = 255;
        }
      }
      octx.putImageData(od, 0, 0);
      return {
        pct: Number(((100 * diff) / (w * h)).toFixed(2)),
        sizeChanged: ia.naturalWidth !== ib.naturalWidth || ia.naturalHeight !== ib.naturalHeight,
        dims: `${ia.naturalWidth}x${ia.naturalHeight} -> ${ib.naturalWidth}x${ib.naturalHeight}`,
        png: outC.toDataURL("image/png"),
      };
    },
    { a, b },
  );
  if (r.pct >= 1) {
    fs.writeFileSync(path.join(OUT, name), Buffer.from(r.png.split(",")[1], "base64"));
  }
  results.push({ name, ...r });
}
await browser.close();

results.sort((x, y) => y.pct - x.pct);
console.log("снимок                              изменилось  размер");
for (const r of results) {
  console.log(`  ${r.name.replace(".png", "").padEnd(32)} ${String(r.pct).padStart(6)}%  ${r.sizeChanged ? r.dims : "тот же"}`);
}
const changed = results.filter((r) => r.pct >= 1).length;
console.log(`\nизменилось заметно (>=1% пикселей): ${changed} из ${results.length}`);
console.log(`карты различий: ${OUT}`);
