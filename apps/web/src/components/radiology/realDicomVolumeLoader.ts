/**
 * realDicomVolumeLoader.ts — Industrial Real DICOM Series Ingestion Engine
 * Parses raw .dcm files, extracts 16-bit CT pixel data, computes spatial geometry
 * (ImagePositionPatient, PixelSpacing, RescaleSlope/Intercept) and constructs
 * a contiguous CbctVoxelVolume in typed memory.
 */

import * as fflate from "fflate";
import type { CbctVoxelVolume } from "./cbctMprMath";
import {
  isMultiFrameDicom,
  buildVolumeFromMultiFrameDicom,
  parseMultiFrameDicomHeader,
  decodeDicomString,
  type MultiFrameDicomHeader,
} from "./dicomMultiFrameLoader";

export {
  isMultiFrameDicom,
  buildVolumeFromMultiFrameDicom,
  parseMultiFrameDicomHeader,
  decodeDicomString,
  type MultiFrameDicomHeader,
};

declare module "./cbctMprMath" {
  interface CbctVoxelVolume {
    readonly imageOrientationPatient?: readonly [number, number, number, number, number, number] | undefined;
    readonly isFlippedX?: boolean | undefined;
    readonly isFlippedY?: boolean | undefined;
    readonly isFlippedZ?: boolean | undefined;
  }
}

export interface ParsedDicomSliceHeader {
  rows: number;
  cols: number;
  bitsAllocated: number;
  bitsStored: number;
  pixelRepresentation: number; // 0 = unsigned, 1 = 2's complement signed
  pixelSpacing: { x: number; y: number };
  sliceThickness: number;
  sliceLocationZ: number;
  instanceNumber: number;
  rescaleSlope: number;
  rescaleIntercept: number;
  windowCenter: number;
  windowWidth: number;
  pixelDataByteOffset: number;
  pixelDataByteLength: number;
  numberOfFrames?: number | undefined;
  patientName?: string | undefined;
  studyDate?: string | undefined;
  imagePositionPatient?: [number, number, number] | undefined;
  imageOrientationPatient?: [number, number, number, number, number, number] | undefined;
}

export interface DicomSliceEntry {
  header: ParsedDicomSliceHeader;
  buffer: ArrayBuffer | null;
  fileName: string;
}

export interface DicomStreamingUploadTarget {
  gl: WebGL2RenderingContext;
  texture: WebGLTexture;
  /** If true, texImage3D is pre-allocated with null initial storage before streaming */
  allocateStorage?: boolean;
}

export interface DicomVolumeIngestionOptions {
  onProgress?: (percent: number, message: string) => void;
  onSliceDecoded?: (sliceIndex: number, totalSlices: number, sliceData: Int16Array) => void;
  gpuUploadTarget?: DicomStreamingUploadTarget | null;
  concurrency?: number;
}

/**
 * Uploads a single calibrated 2D slice directly into layer z of a WebGL 3D Texture.
 * Zero-copy GPU upload: avoids maintaining temporary 225MB intermediate CPU buffers.
 */
export function uploadSliceTo3dTexture(
  gl: WebGL2RenderingContext,
  targetZ: number,
  width: number,
  height: number,
  sliceData: Int16Array,
): void {
  gl.pixelStorei(gl.UNPACK_ALIGNMENT, 2);
  gl.texSubImage3D(
    gl.TEXTURE_3D,
    0,
    0,
    0,
    targetZ,
    width,
    height,
    1,
    gl.RED_INTEGER,
    gl.SHORT,
    sliceData,
  );
}

/**
 * Accurately extracts calibrated Hounsfield Units (HU) from raw DICOM voxel words
 * according to DICOM PS 3.5 Section 8.2 and PS 3.3 C.11.1.
 *
 * Handles:
 * 1. BitsStored masking (12-bit, 14-bit, 16-bit) to strip high/overlay bits.
 * 2. Proper two's complement sign-extension for signed representations (PixelRepresentation=1).
 * 3. Linear RescaleSlope and RescaleIntercept calibration (HU = raw * slope + intercept).
 * 4. Int16 clamping [-32768, 32767] to prevent numeric overflow.
 */
export function extractCalibratedVoxelHU(
  rawWord: number,
  bitsStored: number,
  isSigned: boolean,
  rescaleSlope: number,
  rescaleIntercept: number,
): number {
  let val = rawWord;
  const bits = bitsStored > 0 && bitsStored <= 16 ? bitsStored : 16;

  if (bits < 16) {
    const mask = (1 << bits) - 1;
    val = val & mask;
    if (isSigned) {
      const signBit = 1 << (bits - 1);
      if ((val & signBit) !== 0) {
        val = val - (1 << bits); // proper 2's complement sign extension
      }
    }
  } else if (isSigned) {
    val = (val << 16) >> 16;
  }

  const slope = Number.isFinite(rescaleSlope) && rescaleSlope > 0 ? rescaleSlope : 1.0;
  const intercept = Number.isFinite(rescaleIntercept) ? rescaleIntercept : 0.0;

  const hu = Math.round(val * slope + intercept);
  return Math.max(-32768, Math.min(32767, hu));
}

/**
 * Calculates physical projection distance along the acquisition slice normal vector.
 * DICOM Part 3 PS 3.3 C.7.6.2: dist = P . (u_row x v_col).
 * Falls back to sliceLocationZ when orientation cosines are absent.
 */
export function computeSliceNormalDistance(
  pos: [number, number, number] | undefined,
  orient: [number, number, number, number, number, number] | undefined,
  fallbackZ: number,
): number {
  if (!pos || !orient) return fallbackZ;
  const [Xx, Xy, Xz, Yx, Yy, Yz] = orient;
  const nx = Xy * Yz - Xz * Yy;
  const ny = Xz * Yx - Xx * Yz;
  const nz = Xx * Yy - Xy * Yx;
  return pos[0] * nx + pos[1] * ny + pos[2] * nz;
}

export function parseDicomSliceHeader(buffer: ArrayBuffer): ParsedDicomSliceHeader {
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
  let patientName = "Не указан";
  let studyDate = "";
  let imagePositionPatient: [number, number, number] | undefined;
  let imageOrientationPatient: [number, number, number, number, number, number] | undefined;

  // Scan up to 256KB or byteLength for standard DICOM tags
  const maxHeaderSearch = Math.min(byteLength - 8, 262144);
  let hasImagePositionPatient = false;

  for (let i = 128; i < maxHeaderSearch; i += 2) {
    // If we already reached or passed the pixel data offset, stop scanning
    if (pixelDataOffset > 0 && i >= pixelDataOffset - 4) {
      break;
    }

    const group = view.getUint16(i, true);
    const element = view.getUint16(i + 2, true);
    if (group === 0) continue;

    // Fast-path group filter: skip groups that never contain geometry, tags, or pixel data
    if (
      group !== 0x0008 &&
      group !== 0x0010 &&
      group !== 0x0018 &&
      group !== 0x0020 &&
      group !== 0x0028 &&
      group !== 0x7fe0
    ) {
      continue;
    }

    const c0 = view.getUint8(i + 4);
    const c1 = view.getUint8(i + 5);
    const isExplicit = c0 >= 65 && c0 <= 90 && c1 >= 65 && c1 <= 90;
    const vr = isExplicit ? String.fromCharCode(c0, c1) : "";

    let tagLen = 0;
    let tagValOff = 0;

    if (isExplicit) {
      if (
        vr === "OB" ||
        vr === "OW" ||
        vr === "OF" ||
        vr === "OD" ||
        vr === "OL" ||
        vr === "OV" ||
        vr === "SV" ||
        vr === "UV" ||
        vr === "SQ" ||
        vr === "UC" ||
        vr === "UR" ||
        vr === "UT" ||
        vr === "UN"
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

    if (group === 0x0010 && element === 0x0010) {
      // PatientName
      if (tagLen > 0 && tagValOff + tagLen <= byteLength) {
        try {
          const raw = new Uint8Array(buffer, tagValOff, Math.min(tagLen, 64));
          const decoded = decodeDicomString(raw);
          if (decoded) patientName = decoded;
        } catch {}
      }
    } else if (group === 0x0008 && element === 0x0020) {
      // StudyDate
      if (tagLen >= 8 && tagValOff + tagLen <= byteLength) {
        try {
          studyDate = new TextDecoder("ascii").decode(new Uint8Array(buffer, tagValOff, Math.min(tagLen, 12))).trim();
        } catch {}
      }
    } else if (group === 0x0018 && element === 0x0050) {
      // SliceThickness
      if (tagLen > 0 && tagValOff + tagLen <= byteLength) {
        try {
          const str = new TextDecoder("ascii").decode(new Uint8Array(buffer, tagValOff, tagLen)).trim();
          const num = Number.parseFloat(str);
          if (!Number.isNaN(num) && num > 0) sliceThickness = num;
        } catch {}
      }
    } else if (group === 0x0020 && element === 0x0032) {
      // ImagePositionPatient [X, Y, Z] (Cartesian coordinate in mm)
      if (tagLen > 0 && tagValOff + tagLen <= byteLength) {
        try {
          const str = new TextDecoder("ascii").decode(new Uint8Array(buffer, tagValOff, tagLen)).trim();
          const parts = str.split("\\").map((s) => Number.parseFloat(s.trim()));
          if (parts.length >= 3) {
            imagePositionPatient = [parts[0] ?? 0, parts[1] ?? 0, parts[2] ?? 0];
            if (!Number.isNaN(parts[2])) {
              sliceLocationZ = parts[2] ?? 0.0;
              hasImagePositionPatient = true;
            }
          }
        } catch {}
      }
    } else if (group === 0x0020 && element === 0x0037) {
      // ImageOrientationPatient [Xx, Xy, Xz, Yx, Yy, Yz]
      if (tagLen > 0 && tagValOff + tagLen <= byteLength) {
        try {
          const str = new TextDecoder("ascii").decode(new Uint8Array(buffer, tagValOff, tagLen)).trim();
          const parts = str.split("\\").map((s) => Number.parseFloat(s.trim()));
          if (parts.length >= 6 && parts.every((p) => !Number.isNaN(p))) {
            imageOrientationPatient = [
              parts[0] ?? 1,
              parts[1] ?? 0,
              parts[2] ?? 0,
              parts[3] ?? 0,
              parts[4] ?? 1,
              parts[5] ?? 0,
            ];
          }
        } catch {}
      }
    } else if (group === 0x0020 && element === 0x1041) {
      // SliceLocation (only use if ImagePositionPatient is not available)
      if (tagLen > 0 && tagValOff + tagLen <= byteLength) {
        try {
          const str = new TextDecoder("ascii").decode(new Uint8Array(buffer, tagValOff, tagLen)).trim();
          const num = Number.parseFloat(str);
          if (!Number.isNaN(num) && !hasImagePositionPatient) {
            sliceLocationZ = num;
          }
        } catch {}
      }
    } else if (group === 0x0020 && element === 0x0013) {
      // InstanceNumber
      if (tagLen > 0 && tagValOff + tagLen <= byteLength) {
        try {
          const str = new TextDecoder("ascii").decode(new Uint8Array(buffer, tagValOff, tagLen)).trim();
          const num = Number.parseInt(str, 10);
          if (!Number.isNaN(num)) instanceNumber = num;
        } catch {}
      }
    } else if (group === 0x0028 && element === 0x0008) {
      // NumberOfFrames
      if (tagLen > 0 && tagValOff + tagLen <= byteLength) {
        try {
          const str = new TextDecoder("ascii").decode(new Uint8Array(buffer, tagValOff, tagLen)).replace(/\0+$/, "").trim();
          const num = Number.parseInt(str, 10);
          if (!Number.isNaN(num) && num > 0) {
            numberOfFrames = num;
          } else if (tagLen === 2) {
            const binVal = view.getUint16(tagValOff, true);
            if (binVal > 0) numberOfFrames = binVal;
          } else if (tagLen === 4) {
            const binVal = view.getUint32(tagValOff, true);
            if (binVal > 0) numberOfFrames = binVal;
          }
        } catch {}
      }
    } else if (group === 0x0028 && element === 0x0010) {
      // Rows
      rows = view.getUint16(tagValOff, true);
    } else if (group === 0x0028 && element === 0x0011) {
      // Cols
      cols = view.getUint16(tagValOff, true);
    } else if (group === 0x0028 && element === 0x0100) {
      // BitsAllocated
      bitsAllocated = view.getUint16(tagValOff, true);
    } else if (group === 0x0028 && element === 0x0101) {
      // BitsStored
      bitsStored = view.getUint16(tagValOff, true);
    } else if (group === 0x0028 && element === 0x0103) {
      // PixelRepresentation
      pixelRepresentation = view.getUint16(tagValOff, true);
    } else if (group === 0x0028 && element === 0x0030) {
      // PixelSpacing
      if (tagLen > 0 && tagValOff + tagLen <= byteLength) {
        try {
          const str = new TextDecoder("ascii").decode(new Uint8Array(buffer, tagValOff, tagLen)).trim();
          const parts = str.split("\\").map((s) => Number.parseFloat(s.trim()));
          if (parts.length >= 2) {
            if (!Number.isNaN(parts[0]) && (parts[0] ?? 0) > 0) pixelSpacingY = parts[0] ?? 0.20;
            if (!Number.isNaN(parts[1]) && (parts[1] ?? 0) > 0) pixelSpacingX = parts[1] ?? 0.20;
          }
        } catch {}
      }
    } else if (group === 0x0028 && element === 0x1050) {
      // WindowCenter
      if (tagLen > 0 && tagValOff + tagLen <= byteLength) {
        try {
          const str = new TextDecoder("ascii").decode(new Uint8Array(buffer, tagValOff, tagLen)).trim();
          const num = Number.parseFloat(str.split("\\")[0]?.trim() ?? "");
          if (!Number.isNaN(num)) windowCenter = num;
        } catch {}
      }
    } else if (group === 0x0028 && element === 0x1051) {
      // WindowWidth
      if (tagLen > 0 && tagValOff + tagLen <= byteLength) {
        try {
          const str = new TextDecoder("ascii").decode(new Uint8Array(buffer, tagValOff, tagLen)).trim();
          const num = Number.parseFloat(str.split("\\")[0]?.trim() ?? "");
          if (!Number.isNaN(num) && num > 0) windowWidth = num;
        } catch {}
      }
    } else if (group === 0x0028 && element === 0x1052) {
      // RescaleIntercept
      if (tagLen > 0 && tagValOff + tagLen <= byteLength) {
        try {
          const str = new TextDecoder("ascii").decode(new Uint8Array(buffer, tagValOff, tagLen)).trim();
          const num = Number.parseFloat(str);
          if (!Number.isNaN(num)) rescaleIntercept = num;
        } catch {}
      }
    } else if (group === 0x0028 && element === 0x1053) {
      // RescaleSlope
      if (tagLen > 0 && tagValOff + tagLen <= byteLength) {
        try {
          const str = new TextDecoder("ascii").decode(new Uint8Array(buffer, tagValOff, tagLen)).trim();
          const num = Number.parseFloat(str);
          if (!Number.isNaN(num) && num > 0) rescaleSlope = num;
        } catch {}
      }
    } else if (group === 0x7fe0 && element === 0x0010) {
      // PixelData
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
    rows,
    cols,
    bitsAllocated,
    bitsStored,
    pixelRepresentation,
    pixelSpacing: { x: pixelSpacingX, y: pixelSpacingY },
    sliceThickness,
    sliceLocationZ,
    instanceNumber,
    rescaleSlope,
    rescaleIntercept,
    windowCenter,
    windowWidth,
    pixelDataByteOffset: pixelDataOffset,
    pixelDataByteLength: pixelDataLength,
    numberOfFrames,
    patientName,
    studyDate,
    imagePositionPatient,
    imageOrientationPatient,
  };
}

export async function buildVolumeFromDicomBuffers(
  items: Array<{ buffer: ArrayBuffer; fileName?: string }>,
  options?: ((percent: number, message: string) => void) | DicomVolumeIngestionOptions,
): Promise<CbctVoxelVolume> {
  if (!items || items.length === 0) {
    throw new Error("Не передано ни одного буфера DICOM для загрузки");
  }

  const onProgress = typeof options === "function" ? options : options?.onProgress;
  const onSliceDecoded = typeof options === "object" ? options?.onSliceDecoded : undefined;
  const gpuTarget = typeof options === "object" ? options?.gpuUploadTarget : undefined;

  // If a single DICOM file is provided and it is a Multi-Frame volume (Planmeca, KaVo, Sirona)
  if (items.length === 1 && isMultiFrameDicom(items[0]!.buffer)) {
    return buildVolumeFromMultiFrameDicom(items[0]!.buffer, options);
  }

  onProgress?.(5, "Чтение заголовков " + items.length + " срезов КЛКТ...");

  const sliceEntries: DicomSliceEntry[] = [];
  const totalFiles = items.length;

  for (let i = 0; i < totalFiles; i++) {
    const item = items[i]!;
    const buf = item.buffer;
    const header = parseDicomSliceHeader(buf);
    sliceEntries.push({ header, buffer: buf, fileName: item.fileName || `slice_${i}.dcm` });

    if (i % 25 === 0 || i === totalFiles - 1) {
      const pct = 5 + Math.round((i / totalFiles) * 35);
      onProgress?.(pct, "Прочитано " + (i + 1) + " из " + totalFiles + " срезов...");
    }
  }

  // Sort slices in ascending order of physical Z (Inferior/Caudal -> Superior/Cranial)
  sliceEntries.sort((a, b) => {
    const distA = computeSliceNormalDistance(
      a.header.imagePositionPatient,
      a.header.imageOrientationPatient,
      a.header.sliceLocationZ,
    );
    const distB = computeSliceNormalDistance(
      b.header.imagePositionPatient,
      b.header.imageOrientationPatient,
      b.header.sliceLocationZ,
    );
    if (Math.abs(distA - distB) > 0.0001) {
      return distA - distB;
    }
    if (a.header.instanceNumber !== b.header.instanceNumber) {
      return a.header.instanceNumber - b.header.instanceNumber;
    }
    return a.fileName.localeCompare(b.fileName, undefined, { numeric: true });
  });

  onProgress?.(45, "Сборка 3D массива вокселей в непрерывную память...");

  const refHeader = sliceEntries[0]!.header;
  const width = refHeader.cols;
  const height = refHeader.rows;
  const depth = sliceEntries.length;

  let computedSpacingZ = refHeader.sliceThickness;
  if (depth > 1) {
    const distFirst = computeSliceNormalDistance(
      sliceEntries[0]!.header.imagePositionPatient,
      sliceEntries[0]!.header.imageOrientationPatient,
      sliceEntries[0]!.header.sliceLocationZ,
    );
    const distLast = computeSliceNormalDistance(
      sliceEntries[depth - 1]!.header.imagePositionPatient,
      sliceEntries[depth - 1]!.header.imageOrientationPatient,
      sliceEntries[depth - 1]!.header.sliceLocationZ,
    );
    const deltaZ = Math.abs(distLast - distFirst) / (depth - 1);
    if (deltaZ > 0.001 && deltaZ < 10.0) computedSpacingZ = deltaZ;
  }

  const refOrient = refHeader.imageOrientationPatient ?? [1, 0, 0, 0, 1, 0];
  const [Xx, , , , Yy] = refOrient;
  // If Xx < -0.5, row axis points towards patient Right (-X) instead of standard Left (+X).
  // Invert X row traversal to restore anatomical Patient Right on canvas Left.
  const flipX = Xx < -0.5;
  // If Yy < -0.5, col axis points towards patient Anterior (-Y) instead of standard Posterior (+Y).
  const flipY = (Yy ?? 1) < -0.5;

  const totalVoxels = width * height * depth;
  const voxelData = new Int16Array(totalVoxels);
  const sliceVoxelCount = width * height;

  // Zero-copy direct 3D Texture allocation if GPU target is provided
  if (gpuTarget?.gl && gpuTarget.texture) {
    const gl = gpuTarget.gl;
    gl.bindTexture(gl.TEXTURE_3D, gpuTarget.texture);
    gl.pixelStorei(gl.UNPACK_ALIGNMENT, 2);
    if (gpuTarget.allocateStorage !== false) {
      gl.texImage3D(
        gl.TEXTURE_3D,
        0,
        gl.R16I,
        width,
        height,
        depth,
        0,
        gl.RED_INTEGER,
        gl.SHORT,
        null, // preallocate VRAM backing store without CPU data copy
      );
    }
  }

  let minVoxelHU = 32767;
  let maxVoxelHU = -32768;

  // Hoisted calibration invariants across the entire series
  const isSigned = refHeader.pixelRepresentation === 1;
  const bitsStored = refHeader.bitsStored > 0 && refHeader.bitsStored <= 16 ? refHeader.bitsStored : 16;
  const slope = Number.isFinite(refHeader.rescaleSlope) && refHeader.rescaleSlope > 0 ? refHeader.rescaleSlope : 1.0;
  const intercept = Number.isFinite(refHeader.rescaleIntercept) ? refHeader.rescaleIntercept : 0.0;
  const isLinearInteger = slope === 1.0 && Math.floor(intercept) === intercept;
  const intIntercept = intercept | 0;
  const mask = bitsStored < 16 ? (1 << bitsStored) - 1 : 0xffff;
  const signBit = bitsStored < 16 ? 1 << (bitsStored - 1) : 0x8000;
  const signExt = bitsStored < 16 ? 1 << bitsStored : 0x10000;

  for (let z = 0; z < depth; z++) {
    const entry = sliceEntries[z]!;
    if (!entry.buffer) continue;
    const offset = entry.header.pixelDataByteOffset;
    const baseIdx = z * sliceVoxelCount;

    let rawSlice: Int16Array | Uint16Array;
    if (offset % 2 === 0 && entry.buffer.byteLength >= offset + sliceVoxelCount * 2) {
      // Zero-copy direct TypedArray view over existing buffer (avoids 100s of MBs of allocation)
      rawSlice = isSigned
        ? new Int16Array(entry.buffer, offset, sliceVoxelCount)
        : new Uint16Array(entry.buffer, offset, sliceVoxelCount);
    } else {
      const sliceArrayBuf = entry.buffer.slice(offset, offset + sliceVoxelCount * 2);
      const validEvenLength = sliceArrayBuf.byteLength - (sliceArrayBuf.byteLength % 2);
      const safeBuf = validEvenLength === sliceArrayBuf.byteLength ? sliceArrayBuf : sliceArrayBuf.slice(0, validEvenLength);
      rawSlice = isSigned ? new Int16Array(safeBuf) : new Uint16Array(safeBuf);
    }

    let localMin = minVoxelHU;
    let localMax = maxVoxelHU;

    if (!flipX && !flipY) {
      if (bitsStored >= 16) {
        if (isLinearInteger) {
          // Ultra-fast path: standard CT with integer intercept (e.g. -1000 / -1024)
          for (let i = 0; i < sliceVoxelCount; i++) {
            const val = (rawSlice[i]! + intIntercept) | 0;
            const hu = val < -32768 ? -32768 : val > 32767 ? 32767 : val;
            voxelData[baseIdx + i] = hu;
            if (hu < localMin) localMin = hu;
            if (hu > localMax) localMax = hu;
          }
        } else {
          // General float rescale
          for (let i = 0; i < sliceVoxelCount; i++) {
            let val = rawSlice[i]!;
            if (isSigned) val = (val << 16) >> 16;
            const hu = Math.round(val * slope + intercept);
            const clamped = hu < -32768 ? -32768 : hu > 32767 ? 32767 : hu;
            voxelData[baseIdx + i] = clamped;
            if (clamped < localMin) localMin = clamped;
            if (clamped > localMax) localMax = clamped;
          }
        }
      } else {
        // 12-bit or 14-bit masked detector path
        if (isLinearInteger) {
          for (let i = 0; i < sliceVoxelCount; i++) {
            let val = rawSlice[i]! & mask;
            if (isSigned && (val & signBit) !== 0) val -= signExt;
            const hu = (val + intIntercept) | 0;
            const clamped = hu < -32768 ? -32768 : hu > 32767 ? 32767 : hu;
            voxelData[baseIdx + i] = clamped;
            if (clamped < localMin) localMin = clamped;
            if (clamped > localMax) localMax = clamped;
          }
        } else {
          for (let i = 0; i < sliceVoxelCount; i++) {
            let val = rawSlice[i]! & mask;
            if (isSigned && (val & signBit) !== 0) val -= signExt;
            const hu = Math.round(val * slope + intercept);
            const clamped = hu < -32768 ? -32768 : hu > 32767 ? 32767 : hu;
            voxelData[baseIdx + i] = clamped;
            if (clamped < localMin) localMin = clamped;
            if (clamped > localMax) localMax = clamped;
          }
        }
      }
    } else {
      // Flipped coordinates path (patient orientation adjustment)
      for (let y = 0; y < height; y++) {
        const srcY = flipY ? height - 1 - y : y;
        const rowOffset = baseIdx + y * width;
        const srcRowOffset = srcY * width;
        for (let x = 0; x < width; x++) {
          const srcX = flipX ? width - 1 - x : x;
          const raw = rawSlice[srcRowOffset + srcX]!;
          let val = bitsStored < 16 ? raw & mask : raw;
          if (isSigned) {
            if (bitsStored < 16) {
              if ((val & signBit) !== 0) val -= signExt;
            } else {
              val = (val << 16) >> 16;
            }
          }
          const hu = isLinearInteger ? ((val + intIntercept) | 0) : Math.round(val * slope + intercept);
          const clamped = hu < -32768 ? -32768 : hu > 32767 ? 32767 : hu;
          voxelData[rowOffset + x] = clamped;
          if (clamped < localMin) localMin = clamped;
          if (clamped > localMax) localMax = clamped;
        }
      }
    }

    minVoxelHU = localMin;
    maxVoxelHU = localMax;

    // Zero-copy direct streaming into WebGL 3D texture as slice arrives
    if (gpuTarget?.gl && gpuTarget.texture) {
      uploadSliceTo3dTexture(
        gpuTarget.gl,
        z,
        width,
        height,
        voxelData.subarray(baseIdx, baseIdx + sliceVoxelCount),
      );
    }

    onSliceDecoded?.(z, depth, voxelData.subarray(baseIdx, baseIdx + sliceVoxelCount));

    // Zero-leak GC: immediately free this slice's raw ArrayBuffer from V8 heap
    entry.buffer = null;

    if (z % 20 === 0 || z === depth - 1) {
      const pct = 45 + Math.round((z / depth) * 50);
      onProgress?.(pct, "Копирование слоя " + (z + 1) + "/" + depth + " в VRAM...");
    }
  }

  onProgress?.(100, "КЛКТ исследование готово к 3D MPR реслайсингу");

  const physicalWidthMm = width * refHeader.pixelSpacing.x;
  const physicalHeightMm = height * refHeader.pixelSpacing.y;
  const physicalDepthMm = depth * computedSpacingZ;

  return {
    id: `dicom-series-${Date.now()}`,
    dimensions: { width, height, depth },
    spacingMm: { x: refHeader.pixelSpacing.x, y: refHeader.pixelSpacing.y, z: computedSpacingZ },
    originMm: { x: -physicalWidthMm * 0.5, y: -physicalHeightMm * 0.5, z: -physicalDepthMm * 0.5 },
    physicalSizeMm: { x: physicalWidthMm, y: physicalHeightMm, z: physicalDepthMm },
    data: voxelData,
    minHU: minVoxelHU,
    maxHU: maxVoxelHU,
    rescaleSlope: refHeader.rescaleSlope,
    rescaleIntercept: refHeader.rescaleIntercept,
    defaultWindowWidth: refHeader.windowWidth > 0 ? refHeader.windowWidth : 4400,
    defaultWindowLevel: refHeader.windowCenter !== 0 ? refHeader.windowCenter : 1300,
    imageOrientationPatient: refHeader.imageOrientationPatient,
    isFlippedX: flipX,
    isFlippedY: flipY,
    isDisposed: false,
  };
}

export async function buildVolumeFromDicomFiles(
  files: File[],
  options?: ((percent: number, message: string) => void) | DicomVolumeIngestionOptions,
): Promise<CbctVoxelVolume> {
  if (!files || files.length === 0) {
    throw new Error("Не передано ни одного файла DICOM для загрузки");
  }

  const onProgress = typeof options === "function" ? options : options?.onProgress;
  const concurrency = (typeof options === "object" && options?.concurrency && options.concurrency > 0)
    ? options.concurrency
    : 32;

  const total = files.length;
  const items: Array<{ buffer: ArrayBuffer; fileName: string }> = new Array(total);

  // Parallel chunked reading via Promise.all (avoids 100s of sequential awaits)
  for (let i = 0; i < total; i += concurrency) {
    const chunk = files.slice(i, i + concurrency);
    const bufs = await Promise.all(chunk.map((f) => f.arrayBuffer()));
    for (let j = 0; j < bufs.length; j++) {
      items[i + j] = { buffer: bufs[j]!, fileName: chunk[j]!.name };
    }
    if (onProgress) {
      const pct = Math.round(((i + chunk.length) / total) * 35);
      onProgress(pct, `Параллельное чтение срезов КТ (${i + chunk.length}/${total})...`);
    }
  }

  return buildVolumeFromDicomBuffers(items, options);
}

export async function buildVolumeFromDicomZip(
  zipBuffer: ArrayBuffer,
  onProgress?: (percent: number, message: string) => void,
): Promise<CbctVoxelVolume> {
  onProgress?.(5, "Распаковка ZIP-архива КЛКТ в памяти...");
  const unzipped = fflate.unzipSync(new Uint8Array(zipBuffer), {
    filter: (file) => {
      const lower = file.name.toLowerCase();
      return (
        !lower.includes("__macosx") &&
        !lower.startsWith("._") &&
        !file.name.toUpperCase().includes("DICOMDIR") &&
        (lower.endsWith(".dcm") || lower.endsWith(".dicom") || !lower.includes("."))
      );
    },
  });
  const fileKeys = Object.keys(unzipped);
  if (fileKeys.length === 0) throw new Error("В переданном ZIP-архиве не найдено файлов DICOM (.dcm)");
  const items: Array<{ buffer: ArrayBuffer; fileName: string }> = [];
  for (const key of fileKeys) {
    const u8 = unzipped[key]!;
    items.push({ buffer: u8.buffer, fileName: key });
    delete unzipped[key];
  }
  return buildVolumeFromDicomBuffers(items, onProgress);
}

function getViteApiUrl(): string {
  try {
    const meta = import.meta as unknown as { env?: Record<string, string> };
    if (meta && meta.env && typeof meta.env.VITE_API_URL === "string") {
      return meta.env.VITE_API_URL;
    }
  } catch {}
  return "";
}

export function buildDicomwebWadoUrl(
  studyUid: string,
  seriesUid: string,
  instanceUid: string,
  baseUrl?: string,
): string {
  const apiBase = (baseUrl ?? getViteApiUrl()).replace(/\/+$/, "");
  return `${apiBase}/api/dicomweb/studies/${encodeURIComponent(studyUid)}/series/${encodeURIComponent(seriesUid)}/instances/${encodeURIComponent(instanceUid)}`;
}

export function buildCornerstoneWadoImageId(
  studyUid: string,
  seriesUid: string,
  instanceUid: string,
  baseUrl?: string,
): string {
  return `wadouri:${buildDicomwebWadoUrl(studyUid, seriesUid, instanceUid, baseUrl)}`;
}

export async function buildVolumeFromDicomweb(
  studyUid: string,
  seriesUid: string,
  options?: {
    onProgress?: (percent: number, message: string) => void;
    headers?: Record<string, string>;
    baseUrl?: string;
  },
): Promise<CbctVoxelVolume> {
  const onProgress = options?.onProgress;
  onProgress?.(5, "Запрос метаданных серии из PACS WADO-RS...");

  const apiBase = (options?.baseUrl ?? getViteApiUrl()).replace(/\/+$/, "");

  let headers = options?.headers;
  if (!headers) {
    try {
      const { readDenteClinicToken, readDenteStaffToken } = await import("../../lib/safeLocalStorage");
      const clinicToken = readDenteClinicToken();
      const staffToken = readDenteStaffToken();
      headers = {};
      if (clinicToken) headers["x-dente-clinic-token"] = clinicToken;
      if (staffToken) {
        headers["x-dente-staff-token"] = staffToken;
        headers.Authorization = `Bearer ${staffToken}`;
      } else if (clinicToken) {
        headers.Authorization = `Bearer ${clinicToken}`;
      }
    } catch {
      headers = {};
    }
  }

  const metaUrl = `${apiBase}/api/dicomweb/studies/${encodeURIComponent(studyUid)}/series/${encodeURIComponent(seriesUid)}/metadata`;
  const metaRes = await fetch(metaUrl, {
    headers: { Accept: "application/dicom+json", ...headers },
  });
  if (!metaRes.ok) {
    throw new Error(`PACS WADO-RS metadata request failed: HTTP ${metaRes.status}`);
  }
  const metaJson = (await metaRes.json()) as Array<Record<string, { Value?: unknown[] }>>;
  if (!Array.isArray(metaJson) || metaJson.length === 0) {
    throw new Error("В запрошенной серии PACS не найдено снимков DICOM");
  }

  const items: Array<{ buffer: ArrayBuffer; fileName: string }> = [];
  const total = metaJson.length;

  for (let i = 0; i < total; i++) {
    const item = metaJson[i];
    const sopUid = item?.["00080018"]?.Value?.[0] as string | undefined;
    if (!sopUid) continue;

    const frameUrl = `${apiBase}/api/dicomweb/studies/${encodeURIComponent(studyUid)}/series/${encodeURIComponent(seriesUid)}/instances/${encodeURIComponent(sopUid)}`;
    const frameRes = await fetch(frameUrl, {
      headers: { Accept: "application/dicom", ...headers },
    });
    if (!frameRes.ok) {
      throw new Error(`PACS WADO-RS instance download failed (${sopUid}): HTTP ${frameRes.status}`);
    }
    const buf = await frameRes.arrayBuffer();
    items.push({ buffer: buf, fileName: `${sopUid}.dcm` });

    if (i % 5 === 0 || i === total - 1) {
      const pct = 10 + Math.round((i / total) * 35);
      onProgress?.(pct, `Загрузка DICOM кадров (${i + 1}/${total})...`);
    }
  }

  return buildVolumeFromDicomBuffers(items, onProgress);
}