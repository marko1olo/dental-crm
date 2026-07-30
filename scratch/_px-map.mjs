import fs from "node:fs";
import { PNG } from "pngjs";
const [file, x0, y0, x1, y1] = [process.argv[2], +process.argv[3], +process.argv[4], +process.argv[5], +process.argv[6]];
const png = PNG.sync.read(fs.readFileSync(file));
const ramp = " .:-=+*#%@";
for (let y = y0; y <= y1; y++) {
  let row = String(y).padStart(4) + " ";
  for (let x = x0; x <= x1; x++) {
    const i = (png.width * y + x) << 2;
    const c = [png.data[i], png.data[i+1], png.data[i+2]].map(n=>n/255).map(v=>v<=0.03928?v/12.92:((v+0.055)/1.055)**2.4);
    const l = 0.2126*c[0]+0.7152*c[1]+0.0722*c[2];
    row += ramp[Math.min(9, Math.floor(l*10))];
  }
  console.log(row);
}
