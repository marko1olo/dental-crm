import { readFileSync } from 'node:fs';
import path from 'node:path';

const manifest = JSON.parse(readFileSync('apps/web/public/radiology/demo_cbct/manifest.json', 'utf8'));

// Check how ImagePositionPatient or SliceLocation is extracted
function getSliceInfo(buffer, fileName) {
  const view = new DataView(buffer);
  const byteLength = buffer.byteLength;
  let sliceLocationZ = null;
  let imagePositionPatient = null;
  let instanceNumber = null;
  let rows = 0;
  let cols = 0;

  for (let i = 128; i < Math.min(byteLength - 8, 65536); i += 2) {
    const group = view.getUint16(i, true);
    const element = view.getUint16(i + 2, true);
    if (group === 0) continue;

    const c0 = view.getUint8(i + 4);
    const c1 = view.getUint8(i + 5);
    const isExplicit = c0 >= 65 && c0 <= 90 && c1 >= 65 && c1 <= 90;
    const vr = isExplicit ? String.fromCharCode(c0, c1) : "";

    let tagLen = 0;
    let tagValOff = 0;

    if (isExplicit) {
      if (
        vr === "OB" || vr === "OW" || vr === "OF" || vr === "OD" ||
        vr === "OL" || vr === "OV" || vr === "SV" || vr === "UV" ||
        vr === "SQ" || vr === "UC" || vr === "UR" || vr === "UT" || vr === "UN"
      ) {
        tagLen = view.getUint32(i + 8, true);
        tagValOff = i + 12;
      } else {
        tagLen = view.getUint16(i + 6, true);
        tagValOff = i + 8;
      }
    } else {
      tagLen = view.getUint32(i + 4, true);
      tagValOff = i + 8;
    }

    if (tagLen < 0 || tagValOff + tagLen > byteLength) continue;

    if (group === 0x0028 && element === 0x0010) {
      rows = view.getUint16(tagValOff, true);
    } else if (group === 0x0028 && element === 0x0011) {
      cols = view.getUint16(tagValOff, true);
    } else if (group === 0x0020 && element === 0x0013) {
      const str = new TextDecoder("ascii").decode(new Uint8Array(buffer, tagValOff, tagLen)).trim();
      instanceNumber = Number.parseInt(str, 10);
    } else if (group === 0x0020 && element === 0x1041) {
      const str = new TextDecoder("ascii").decode(new Uint8Array(buffer, tagValOff, tagLen)).trim();
      sliceLocationZ = Number.parseFloat(str);
    } else if (group === 0x0020 && element === 0x0032) {
      const str = new TextDecoder("ascii").decode(new Uint8Array(buffer, tagValOff, tagLen)).trim();
      imagePositionPatient = str;
    }
  }

  return { fileName, rows, cols, instanceNumber, sliceLocationZ, imagePositionPatient };
}

console.log('Sample slice positions:');
for (const idx of [0, 1, 2, 100, 200, 310, 311, 312]) {
  const fpath = path.join('apps/web/public/radiology/demo_cbct', manifest.slices[idx]);
  const buf = readFileSync(fpath);
  const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
  console.log(idx, manifest.slices[idx], getSliceInfo(ab, manifest.slices[idx]));
}
