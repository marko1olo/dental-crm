import { readFileSync } from 'node:fs';
import path from 'node:path';

const manifest = JSON.parse(readFileSync('apps/web/public/radiology/demo_cbct/manifest.json', 'utf8'));

console.log('Loading slices from disk...');
const t0 = Date.now();
const files = [];
for (let i = 0; i < manifest.slices.length; i++) {
  const fpath = path.join('apps/web/public/radiology/demo_cbct', manifest.slices[i]);
  const buf = readFileSync(fpath);
  files.push({ buffer: buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength), fileName: manifest.slices[i] });
}
console.log('Loaded 313 buffers in', Date.now() - t0, 'ms');

function parseDicomSliceHeader(buffer) {
  const view = new DataView(buffer);
  const byteLength = buffer.byteLength;

  let rows = 800;
  let cols = 800;
  let bitsAllocated = 16;
  let bitsStored = 16;
  let pixelRepresentation = 0;
  let pixelSpacingX = 0.20;
  let pixelSpacingY = 0.20;
  let sliceThickness = 0.20;
  let sliceLocationZ = 0.0;
  let instanceNumber = 1;
  let rescaleSlope = 1.0;
  let rescaleIntercept = 0.0;
  let windowCenter = 1300.0;
  let windowWidth = 4400.0;
  let pixelDataOffset = -1;
  let pixelDataLength = 0;
  let numberOfFrames = 1;

  const maxHeaderSearch = Math.min(byteLength - 8, 262144);

  for (let i = 128; i < maxHeaderSearch; i += 2) {
    if (pixelDataOffset > 0 && i >= pixelDataOffset - 4) break;

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
    } else if (group === 0x0028 && element === 0x0100) {
      bitsAllocated = view.getUint16(tagValOff, true);
    } else if (group === 0x0028 && element === 0x0101) {
      bitsStored = view.getUint16(tagValOff, true);
    } else if (group === 0x0028 && element === 0x0103) {
      pixelRepresentation = view.getUint16(tagValOff, true);
    } else if (group === 0x0028 && element === 0x0030) {
      try {
        const str = new TextDecoder("ascii").decode(new Uint8Array(buffer, tagValOff, tagLen)).trim();
        const parts = str.split("\\").map((s) => Number.parseFloat(s.trim()));
        if (parts.length >= 2) {
          if (!Number.isNaN(parts[0]) && parts[0] > 0) pixelSpacingY = parts[0];
          if (!Number.isNaN(parts[1]) && parts[1] > 0) pixelSpacingX = parts[1];
        }
      } catch {}
    } else if (group === 0x0018 && element === 0x0050) {
      try {
        const str = new TextDecoder("ascii").decode(new Uint8Array(buffer, tagValOff, tagLen)).trim();
        const num = Number.parseFloat(str);
        if (!Number.isNaN(num) && num > 0) sliceThickness = num;
      } catch {}
    } else if (group === 0x0020 && element === 0x0032) {
      try {
        const str = new TextDecoder("ascii").decode(new Uint8Array(buffer, tagValOff, tagLen)).trim();
        const parts = str.split("\\").map((s) => Number.parseFloat(s.trim()));
        if (parts.length >= 3 && !Number.isNaN(parts[2])) {
          sliceLocationZ = parts[2];
        }
      } catch {}
    } else if (group === 0x0020 && element === 0x0013) {
      try {
        const str = new TextDecoder("ascii").decode(new Uint8Array(buffer, tagValOff, tagLen)).trim();
        const num = Number.parseInt(str, 10);
        if (!Number.isNaN(num)) instanceNumber = num;
      } catch {}
    } else if (group === 0x0028 && element === 0x1050) {
      try {
        const str = new TextDecoder("ascii").decode(new Uint8Array(buffer, tagValOff, tagLen)).trim();
        const num = Number.parseFloat(str.split("\\")[0]?.trim() ?? "");
        if (!Number.isNaN(num)) windowCenter = num;
      } catch {}
    } else if (group === 0x0028 && element === 0x1051) {
      try {
        const str = new TextDecoder("ascii").decode(new Uint8Array(buffer, tagValOff, tagLen)).trim();
        const num = Number.parseFloat(str.split("\\")[0]?.trim() ?? "");
        if (!Number.isNaN(num) && num > 0) windowWidth = num;
      } catch {}
    } else if (group === 0x0028 && element === 0x1052) {
      try {
        const str = new TextDecoder("ascii").decode(new Uint8Array(buffer, tagValOff, tagLen)).trim();
        const num = Number.parseFloat(str);
        if (!Number.isNaN(num)) rescaleIntercept = num;
      } catch {}
    } else if (group === 0x0028 && element === 0x1053) {
      try {
        const str = new TextDecoder("ascii").decode(new Uint8Array(buffer, tagValOff, tagLen)).trim();
        const num = Number.parseFloat(str);
        if (!Number.isNaN(num) && num > 0) rescaleSlope = num;
      } catch {}
    } else if (group === 0x7fe0 && element === 0x0010) {
      pixelDataLength = tagLen;
      pixelDataOffset = tagValOff;
      break;
    }
  }

  const bytesPerPixel = bitsAllocated === 8 ? 1 : 2;
  const expectedRawBytes = rows * cols * bytesPerPixel * numberOfFrames;
  if (pixelDataOffset === -1 || pixelDataOffset + expectedRawBytes > byteLength) {
    if (byteLength >= expectedRawBytes) {
      pixelDataOffset = byteLength - expectedRawBytes;
      pixelDataLength = expectedRawBytes;
    } else {
      pixelDataOffset = Math.max(0, byteLength - rows * cols * bytesPerPixel);
      pixelDataLength = byteLength - pixelDataOffset;
    }
  }

  return {
    rows, cols, bitsAllocated, bitsStored, pixelRepresentation,
    pixelSpacing: { x: pixelSpacingX, y: pixelSpacingY },
    sliceThickness, sliceLocationZ, instanceNumber,
    rescaleSlope, rescaleIntercept, windowCenter, windowWidth,
    pixelDataByteOffset: pixelDataOffset, pixelDataByteLength: pixelDataLength,
  };
}

console.log('Parsing headers and building volume...');
const t1 = Date.now();
const sliceEntries = [];
for (let i = 0; i < files.length; i++) {
  const item = files[i];
  const header = parseDicomSliceHeader(item.buffer);
  // Filter out non-matching thumbnail slices (e.g. 256x256 scout/thumbnail)
  if (header.rows === 600 && header.cols === 600) {
    sliceEntries.push({ header, buffer: item.buffer, fileName: item.fileName });
  }
}
console.log('Filtered valid CT slices:', sliceEntries.length, 'in', Date.now() - t1, 'ms');

// Sort slices
sliceEntries.sort((a, b) => {
  if (Math.abs(a.header.sliceLocationZ - b.header.sliceLocationZ) > 0.0001) {
    return a.header.sliceLocationZ - b.header.sliceLocationZ;
  }
  if (a.header.instanceNumber !== b.header.instanceNumber) {
    return a.header.instanceNumber - b.header.instanceNumber;
  }
  return a.fileName.localeCompare(b.fileName, undefined, { numeric: true });
});

console.log('Z range:', sliceEntries[0].header.sliceLocationZ, 'to', sliceEntries[sliceEntries.length - 1].header.sliceLocationZ);

const refHeader = sliceEntries[0].header;
const width = refHeader.cols;
const height = refHeader.rows;
const depth = sliceEntries.length;

let computedSpacingZ = refHeader.sliceThickness;
if (depth > 1) {
  const zFirst = sliceEntries[0].header.sliceLocationZ;
  const zLast = sliceEntries[depth - 1].header.sliceLocationZ;
  const deltaZ = Math.abs(zLast - zFirst) / (depth - 1);
  if (deltaZ > 0.001 && deltaZ < 10.0) computedSpacingZ = deltaZ;
}

console.log('Allocating volume:', width, 'x', height, 'x', depth, '(voxels:', width*height*depth, 'spacingZ:', computedSpacingZ, ')');
const t2 = Date.now();
const totalVoxels = width * height * depth;
const voxelData = new Int16Array(totalVoxels);
const sliceVoxelCount = width * height;

let minVoxelHU = 32767;
let maxVoxelHU = -32768;

for (let z = 0; z < depth; z++) {
  const entry = sliceEntries[z];
  const offset = entry.header.pixelDataByteOffset;
  const isSigned = entry.header.pixelRepresentation === 1;
  const slope = entry.header.rescaleSlope;
  const intercept = entry.header.rescaleIntercept;
  const baseIdx = z * sliceVoxelCount;

  let rawSlice;
  if (offset % 2 === 0 && entry.buffer.byteLength >= offset + sliceVoxelCount * 2) {
    rawSlice = isSigned
      ? new Int16Array(entry.buffer, offset, sliceVoxelCount)
      : new Uint16Array(entry.buffer, offset, sliceVoxelCount);
  } else {
    const sliceArrayBuf = entry.buffer.slice(offset, offset + sliceVoxelCount * 2);
    const validEvenLength = sliceArrayBuf.byteLength - (sliceArrayBuf.byteLength % 2);
    const safeBuf = validEvenLength === sliceArrayBuf.byteLength ? sliceArrayBuf : sliceArrayBuf.slice(0, validEvenLength);
    rawSlice = isSigned ? new Int16Array(safeBuf) : new Uint16Array(safeBuf);
  }

  for (let i = 0; i < sliceVoxelCount; i++) {
    const hu = Math.max(-32768, Math.min(32767, Math.round((rawSlice[i] ?? 0) * slope + intercept)));
    voxelData[baseIdx + i] = hu;
    if (hu < minVoxelHU) minVoxelHU = hu;
    if (hu > maxVoxelHU) maxVoxelHU = hu;
  }
}

console.log('Volume assembled in', Date.now() - t2, 'ms! Min HU:', minVoxelHU, 'Max HU:', maxVoxelHU);
