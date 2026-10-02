/**
 * dicomSliceHeaderParser.ts — Industrial Low-Level DICOM Part 10 Header & Geometry Parser
 *
 * Extracts 16-bit CT pixel headers, spatial orientation (ImagePositionPatient,
 * ImageOrientationPatient, PixelSpacing, RescaleSlope/Intercept), and transfer syntaxes.
 * Governed by Mandate 8b (file length <= 800 lines) and Mandate 8e (Doctor Autonomy).
 */

import { decodeDicomString } from "./dicomMultiFrameLoader";

/**
 * DICOM Part 10 Well-known Transfer Syntax UIDs
 */
export const DICOM_TRANSFER_SYNTAX = {
  IMPLICIT_VR_LITTLE_ENDIAN: "1.2.840.10008.1.2",
  EXPLICIT_VR_LITTLE_ENDIAN: "1.2.840.10008.1.2.1",
  DEFLATED_EXPLICIT_VR_LITTLE_ENDIAN: "1.2.840.10008.1.2.1.99",
  EXPLICIT_VR_BIG_ENDIAN: "1.2.840.10008.1.2.2",
  JPEG_BASELINE_1: "1.2.840.10008.1.2.4.50",
  JPEG_EXTENDED_2_4: "1.2.840.10008.1.2.4.51",
  JPEG_LOSSLESS_14: "1.2.840.10008.1.2.4.57",
  JPEG_LOSSLESS_14_FIRST_ORDER: "1.2.840.10008.1.2.4.70",
  JPEG_LS_LOSSLESS: "1.2.840.10008.1.2.4.80",
  JPEG_2000_LOSSLESS_ONLY: "1.2.840.10008.1.2.4.90",
  JPEG_2000: "1.2.840.10008.1.2.4.91",
  RLE_LOSSLESS: "1.2.840.10008.1.2.5",
} as const;

export function isValidTransferSyntax(syntaxUid: string): boolean {
  return Object.values(DICOM_TRANSFER_SYNTAX).includes(syntaxUid as typeof DICOM_TRANSFER_SYNTAX[keyof typeof DICOM_TRANSFER_SYNTAX]);
}

export function isEncapsulatedTransferSyntax(syntaxUid: string): boolean {
  return syntaxUid !== DICOM_TRANSFER_SYNTAX.IMPLICIT_VR_LITTLE_ENDIAN &&
    syntaxUid !== DICOM_TRANSFER_SYNTAX.EXPLICIT_VR_LITTLE_ENDIAN &&
    syntaxUid !== DICOM_TRANSFER_SYNTAX.EXPLICIT_VR_BIG_ENDIAN;
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
  imageType?: string | undefined;
  imagePositionPatient?: [number, number, number] | undefined;
  imageOrientationPatient?: [number, number, number, number, number, number] | undefined;
  transferSyntaxUid?: string | undefined;
}

/**
 * Evaluates whether a slice is a 2D Scout / Localizer / Topogram / Surview image
 * rather than an axial cross-sectional tomography slice.
 * Standards: DICOM Part 3 C.7.6.1.1.2 (ImageType) and C.7.6.2 (Image Plane).
 */
export function isLocalizerOrScoutSlice(header: ParsedDicomSliceHeader): boolean {
  const typeStr = (header.imageType || "").toUpperCase();
  return (
    typeStr.includes("LOCALIZER") ||
    typeStr.includes("SCOUT") ||
    typeStr.includes("SURVIEW") ||
    typeStr.includes("TOPOGRAM") ||
    typeStr.includes("SCANOGRAM")
  );
}

export interface DicomSliceEntry {
  header: ParsedDicomSliceHeader;
  buffer: ArrayBuffer | null;
  fileName: string;
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

/**
 * Parses raw DICOM Part 10 buffer and extracts slice header tags and geometry.
 */
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
  let imageType: string | undefined;
  let transferSyntaxUid: string | undefined;
  let imagePositionPatient: [number, number, number] | undefined;
  let imageOrientationPatient: [number, number, number, number, number, number] | undefined;

  // Scan up to 256KB or byteLength for standard DICOM tags
  const maxHeaderSearch = Math.min(byteLength - 8, 262144);
  let hasImagePositionPatient = false;

  for (let i = 128; i < maxHeaderSearch; i += 2) {
    if (pixelDataOffset > 0 && i >= pixelDataOffset - 4) {
      break;
    }

    const group = view.getUint16(i, true);
    const element = view.getUint16(i + 2, true);
    if (group === 0) continue;

    // Fast-path group filter: skip groups that never contain geometry, tags, or pixel data
    if (
      group !== 0x0002 &&
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

    if (group === 0x0002 && element === 0x0010) {
      // TransferSyntaxUID
      if (tagLen > 0 && tagValOff + tagLen <= byteLength) {
        try {
          transferSyntaxUid = new TextDecoder("ascii")
            .decode(new Uint8Array(buffer, tagValOff, tagLen))
            .replace(/\0+$/, "")
            .trim();
        } catch {}
      }
    } else if (group === 0x0010 && element === 0x0010) {
      // PatientName
      if (tagLen > 0 && tagValOff + tagLen <= byteLength) {
        try {
          const raw = new Uint8Array(buffer, tagValOff, Math.min(tagLen, 64));
          const decoded = decodeDicomString(raw);
          if (decoded) patientName = decoded;
        } catch {}
      }
    } else if (group === 0x0008 && element === 0x0008) {
      // ImageType
      if (tagLen > 0 && tagValOff + tagLen <= byteLength) {
        try {
          imageType = new TextDecoder("ascii")
            .decode(new Uint8Array(buffer, tagValOff, tagLen))
            .replace(/\0+$/, "")
            .trim();
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
    imageType,
    imagePositionPatient,
    imageOrientationPatient,
    transferSyntaxUid,
  };
}

export interface DecodeSliceVoxelsParams {
  rawSlice: Int16Array | Uint16Array;
  voxelData: Int16Array;
  baseIdx: number;
  sliceVoxelCount: number;
  width: number;
  height: number;
  bitsStored: number;
  isSigned: boolean;
  isLinearInteger: boolean;
  intIntercept: number;
  slope: number;
  intercept: number;
  mask: number;
  signBit: number;
  signExt: number;
  flipX: boolean;
  flipY: boolean;
}

/**
 * High-performance slice voxel decoding with Hounsfield Unit calibration,
 * optional coordinate flip, and min/max calculation.
 */
export function decodeSliceVoxels(params: DecodeSliceVoxelsParams): { minHU: number; maxHU: number } {
  const {
    rawSlice,
    voxelData,
    baseIdx,
    sliceVoxelCount,
    width,
    height,
    bitsStored,
    isSigned,
    isLinearInteger,
    intIntercept,
    slope,
    intercept,
    mask,
    signBit,
    signExt,
    flipX,
    flipY,
  } = params;

  let localMin = 32767;
  let localMax = -32768;

  if (!flipX && !flipY) {
    if (bitsStored >= 16) {
      if (isLinearInteger) {
        for (let i = 0; i < sliceVoxelCount; i++) {
          const val = (rawSlice[i]! + intIntercept) | 0;
          const hu = val < -32768 ? -32768 : val > 32767 ? 32767 : val;
          voxelData[baseIdx + i] = hu;
          if (hu < localMin) localMin = hu;
          if (hu > localMax) localMax = hu;
        }
      } else {
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

  return { minHU: localMin, maxHU: localMax };
}
