/**
 * realDicomVolumeLoader.ts — Industrial Real DICOM Series Ingestion Engine
 * Parses raw .dcm files, extracts 16-bit CT pixel data, computes spatial geometry
 * (ImagePositionPatient, PixelSpacing, RescaleSlope/Intercept) and constructs
 * a contiguous CbctVoxelVolume in typed memory.
 */

import * as fflate from "fflate";
import type { CbctVoxelVolume } from "./cbctMprMath";

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
  patientName?: string;
  studyDate?: string;
}

export interface DicomSliceEntry {
  header: ParsedDicomSliceHeader;
  buffer: ArrayBuffer;
  fileName: string;
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
  let patientName = "Барабаш С.В.";
  let studyDate = "";

  // Scan up to 16KB or byteLength for standard DICOM tags
  const maxHeaderSearch = Math.min(byteLength - 8, 32768);
  let hasImagePositionPatient = false;

  for (let i = 128; i < maxHeaderSearch; i += 2) {
    // If we already reached or passed the pixel data offset, stop scanning
    if (pixelDataOffset > 0 && i >= pixelDataOffset - 4) {
      break;
    }

    const group = view.getUint16(i, true);
    const element = view.getUint16(i + 2, true);

    if (group === 0x0010 && element === 0x0010) {
      // PatientName
      const vr0 = String.fromCharCode(view.getUint8(i + 4));
      const vr1 = String.fromCharCode(view.getUint8(i + 5));
      const isExplicit = (vr0 >= "A" && vr0 <= "Z") && (vr1 >= "A" && vr1 <= "Z");
      const len = isExplicit ? view.getUint16(i + 6, true) : view.getUint32(i + 4, true);
      const off = isExplicit ? i + 8 : i + 8;
      if (len > 0 && off + len <= byteLength) {
        try {
          const raw = new Uint8Array(buffer, off, Math.min(len, 64));
          const decoded = new TextDecoder("latin1").decode(raw).replace(/\^/g, " ").trim();
          if (decoded) patientName = decoded;
        } catch {}
      }
    } else if (group === 0x0008 && element === 0x0020) {
      // StudyDate
      const len = view.getUint16(i + 6, true);
      if (len >= 8 && i + 8 + len <= byteLength) {
        try {
          studyDate = new TextDecoder("ascii").decode(new Uint8Array(buffer, i + 8, Math.min(len, 12))).trim();
        } catch {}
      }
    } else if (group === 0x0018 && element === 0x0050) {
      // SliceThickness
      const len = view.getUint16(i + 6, true);
      if (len > 0 && i + 8 + len <= byteLength) {
        try {
          const str = new TextDecoder("ascii").decode(new Uint8Array(buffer, i + 8, len)).trim();
          const num = Number.parseFloat(str);
          if (!Number.isNaN(num) && num > 0) sliceThickness = num;
        } catch {}
      }
    } else if (group === 0x0020 && element === 0x0032) {
      // ImagePositionPatient [X, Y, Z] (Cartesian coordinate in mm)
      const len = view.getUint16(i + 6, true);
      if (len > 0 && i + 8 + len <= byteLength) {
        try {
          const str = new TextDecoder("ascii").decode(new Uint8Array(buffer, i + 8, len)).trim();
          const parts = str.split("\\").map((s) => Number.parseFloat(s.trim()));
          if (parts.length >= 3 && !Number.isNaN(parts[2])) {
            sliceLocationZ = parts[2] ?? 0.0;
            hasImagePositionPatient = true;
          }
        } catch {}
      }
    } else if (group === 0x0020 && element === 0x1041) {
      // SliceLocation (only use if ImagePositionPatient is not available)
      const len = view.getUint16(i + 6, true);
      if (len > 0 && i + 8 + len <= byteLength) {
        try {
          const str = new TextDecoder("ascii").decode(new Uint8Array(buffer, i + 8, len)).trim();
          const num = Number.parseFloat(str);
          if (!Number.isNaN(num) && !hasImagePositionPatient) {
            sliceLocationZ = num;
          }
        } catch {}
      }
    } else if (group === 0x0020 && element === 0x0013) {
      // InstanceNumber
      const len = view.getUint16(i + 6, true);
      if (len > 0 && i + 8 + len <= byteLength) {
        try {
          const str = new TextDecoder("ascii").decode(new Uint8Array(buffer, i + 8, len)).trim();
          const num = Number.parseInt(str, 10);
          if (!Number.isNaN(num)) instanceNumber = num;
        } catch {}
      }
    } else if (group === 0x0028 && element === 0x0010) {
      // Rows
      rows = view.getUint16(i + 8, true);
    } else if (group === 0x0028 && element === 0x0011) {
      // Cols
      cols = view.getUint16(i + 8, true);
    } else if (group === 0x0028 && element === 0x0100) {
      // BitsAllocated
      bitsAllocated = view.getUint16(i + 8, true);
    } else if (group === 0x0028 && element === 0x0101) {
      // BitsStored
      bitsStored = view.getUint16(i + 8, true);
    } else if (group === 0x0028 && element === 0x0103) {
      // PixelRepresentation
      pixelRepresentation = view.getUint16(i + 8, true);
    } else if (group === 0x0028 && element === 0x0030) {
      // PixelSpacing
      const len = view.getUint16(i + 6, true);
      if (len > 0 && i + 8 + len <= byteLength) {
        try {
          const str = new TextDecoder("ascii").decode(new Uint8Array(buffer, i + 8, len)).trim();
          const parts = str.split("\\").map((s) => Number.parseFloat(s.trim()));
          if (parts.length >= 2) {
            if (!Number.isNaN(parts[0]) && (parts[0] ?? 0) > 0) pixelSpacingY = parts[0] ?? 0.20;
            if (!Number.isNaN(parts[1]) && (parts[1] ?? 0) > 0) pixelSpacingX = parts[1] ?? 0.20;
          }
        } catch {}
      }
    } else if (group === 0x0028 && element === 0x1050) {
      // WindowCenter
      const len = view.getUint16(i + 6, true);
      if (len > 0 && i + 8 + len <= byteLength) {
        try {
          const str = new TextDecoder("ascii").decode(new Uint8Array(buffer, i + 8, len)).trim();
          const num = Number.parseFloat(str.split("\\")[0]?.trim() ?? "");
          if (!Number.isNaN(num)) windowCenter = num;
        } catch {}
      }
    } else if (group === 0x0028 && element === 0x1051) {
      // WindowWidth
      const len = view.getUint16(i + 6, true);
      if (len > 0 && i + 8 + len <= byteLength) {
        try {
          const str = new TextDecoder("ascii").decode(new Uint8Array(buffer, i + 8, len)).trim();
          const num = Number.parseFloat(str.split("\\")[0]?.trim() ?? "");
          if (!Number.isNaN(num) && num > 0) windowWidth = num;
        } catch {}
      }
    } else if (group === 0x0028 && element === 0x1052) {
      // RescaleIntercept
      const len = view.getUint16(i + 6, true);
      if (len > 0 && i + 8 + len <= byteLength) {
        try {
          const str = new TextDecoder("ascii").decode(new Uint8Array(buffer, i + 8, len)).trim();
          const num = Number.parseFloat(str);
          if (!Number.isNaN(num)) rescaleIntercept = num;
        } catch {}
      }
    } else if (group === 0x0028 && element === 0x1053) {
      // RescaleSlope
      const len = view.getUint16(i + 6, true);
      if (len > 0 && i + 8 + len <= byteLength) {
        try {
          const str = new TextDecoder("ascii").decode(new Uint8Array(buffer, i + 8, len)).trim();
          const num = Number.parseFloat(str);
          if (!Number.isNaN(num) && num > 0) rescaleSlope = num;
        } catch {}
      }
    } else if (group === 0x7fe0 && element === 0x0010) {
      // PixelData
      const vr0 = String.fromCharCode(view.getUint8(i + 4));
      const vr1 = String.fromCharCode(view.getUint8(i + 5));
      const vr = vr0 + vr1;
      if (vr === "OW" || vr === "OB" || vr === "UN") {
        pixelDataLength = view.getUint32(i + 8, true);
        pixelDataOffset = i + 12;
      } else {
        pixelDataLength = view.getUint32(i + 4, true);
        pixelDataOffset = i + 8;
      }
      // Once PixelData tag is located, do not scan further into the raw pixel payload
      break;
    }
  }

  const expectedRawBytes = rows * cols * 2;
  if (pixelDataOffset === -1 || pixelDataOffset + expectedRawBytes > byteLength) {
    if (byteLength >= expectedRawBytes) {
      pixelDataOffset = byteLength - expectedRawBytes;
      pixelDataLength = expectedRawBytes;
    } else {
      pixelDataOffset = Math.max(0, byteLength - (rows * cols));
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
    patientName,
    studyDate,
  };
}

export async function buildVolumeFromDicomBuffers(
  items: Array<{ buffer: ArrayBuffer; fileName?: string }>,
  onProgress?: (percent: number, message: string) => void,
): Promise<CbctVoxelVolume> {
  if (!items || items.length === 0) {
    throw new Error("Не передано ни одного буфера DICOM для загрузки");
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
    if (Math.abs(a.header.sliceLocationZ - b.header.sliceLocationZ) > 0.0001) {
      return a.header.sliceLocationZ - b.header.sliceLocationZ;
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
    const zFirst = sliceEntries[0]!.header.sliceLocationZ;
    const zLast = sliceEntries[depth - 1]!.header.sliceLocationZ;
    const deltaZ = Math.abs(zLast - zFirst) / (depth - 1);
    if (deltaZ > 0.001 && deltaZ < 10.0) computedSpacingZ = deltaZ;
  }

  const totalVoxels = width * height * depth;
  const voxelData = new Int16Array(totalVoxels);
  const sliceVoxelCount = width * height;

  let minVoxelHU = 32767;
  let maxVoxelHU = -32768;

  for (let z = 0; z < depth; z++) {
    const entry = sliceEntries[z]!;
    const offset = entry.header.pixelDataByteOffset;
    const isSigned = entry.header.pixelRepresentation === 1;
    const slope = entry.header.rescaleSlope;
    const intercept = entry.header.rescaleIntercept;
    const baseIdx = z * sliceVoxelCount;

    // Safely copy slice buffer to ensure alignment
    const sliceArrayBuf = entry.buffer.slice(offset, offset + sliceVoxelCount * 2);

    if (isSigned) {
      const rawSlice = new Int16Array(sliceArrayBuf);
      for (let i = 0; i < sliceVoxelCount; i++) {
        // Clamp to prevent Int16 integer overflow on dense metal/enamel
        const hu = Math.max(-32768, Math.min(32767, Math.round((rawSlice[i] ?? 0) * slope + intercept)));
        voxelData[baseIdx + i] = hu;
        if (hu < minVoxelHU) minVoxelHU = hu;
        if (hu > maxVoxelHU) maxVoxelHU = hu;
      }
    } else {
      const rawSlice = new Uint16Array(sliceArrayBuf);
      for (let i = 0; i < sliceVoxelCount; i++) {
        // Clamp to prevent Int16 integer overflow on dense metal/enamel
        const hu = Math.max(-32768, Math.min(32767, Math.round((rawSlice[i] ?? 0) * slope + intercept)));
        voxelData[baseIdx + i] = hu;
        if (hu < minVoxelHU) minVoxelHU = hu;
        if (hu > maxVoxelHU) maxVoxelHU = hu;
      }
    }

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
    defaultWindowWidth: refHeader.windowWidth > 0 ? refHeader.windowWidth : 4400,
    defaultWindowLevel: refHeader.windowCenter !== 0 ? refHeader.windowCenter : 1300,
    isDisposed: false,
  };
}

export async function buildVolumeFromDicomFiles(
  files: File[],
  onProgress?: (percent: number, message: string) => void,
): Promise<CbctVoxelVolume> {
  if (!files || files.length === 0) {
    throw new Error("Не передано ни одного файла DICOM для загрузки");
  }

  const items: Array<{ buffer: ArrayBuffer; fileName: string }> = [];
  const total = files.length;
  for (let i = 0; i < total; i++) {
    const f = files[i]!;
    const buf = await f.arrayBuffer();
    items.push({ buffer: buf, fileName: f.name });
  }

  return buildVolumeFromDicomBuffers(items, onProgress);
}

export async function buildVolumeFromDicomZip(
  zipBuffer: ArrayBuffer,
  onProgress?: (percent: number, message: string) => void,
): Promise<CbctVoxelVolume> {
  onProgress?.(5, "Распаковка ZIP-архива КЛКТ в памяти...");
  const unzipped = fflate.unzipSync(new Uint8Array(zipBuffer), {
    filter: (file) => {
      const lower = file.name.toLowerCase();
      return (!lower.includes("__macosx") && !lower.startsWith("._") && (lower.endsWith(".dcm") || lower.endsWith(".dicom") || !lower.includes(".")));
    },
  });
  const fileKeys = Object.keys(unzipped);
  if (fileKeys.length === 0) throw new Error("В переданном ZIP-архиве не найдено файлов DICOM (.dcm)");
  const items: Array<{ buffer: ArrayBuffer; fileName: string }> = [];
  for (const key of fileKeys) {
    const u8 = unzipped[key]!;
    items.push({ buffer: u8.buffer, fileName: key });
  }
  return buildVolumeFromDicomBuffers(items, onProgress);
}