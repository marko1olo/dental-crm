/**
 * dicomMultiFrameLoader.ts — Multi-Frame Enhanced CT DICOM Ingestion Engine
 *
 * Designed for single-file multi-slice acquisitions produced by dental CBCT
 * systems (Planmeca ProMax 3D / Romexis, KaVo 3D eXam / OP 3D, Dentsply Sirona
 * Orthophos SL / Galileos, Carestream CS 8100/9600).
 *
 * Conforms to DICOM Part 3 / PS 3.3 Multi-Frame Module & Enhanced CT Storage.
 */

import type { CbctVoxelVolume } from "./cbctMprMath";

export interface MultiFrameDicomHeader {
  rows: number;
  cols: number;
  numberOfFrames: number;
  bitsAllocated: number;
  bitsStored: number;
  highBit: number;
  pixelRepresentation: number; // 0 = unsigned, 1 = 2's complement signed
  pixelSpacing: { x: number; y: number };
  sliceThickness: number;
  spacingBetweenSlices: number;
  zSpacing: number; // Resolved physical Z spacing in mm
  rescaleSlope: number;
  rescaleIntercept: number;
  windowCenter: number;
  windowWidth: number;
  pixelDataByteOffset: number;
  pixelDataByteLength: number;
  patientName: string;
  patientId: string;
  studyDate: string;
  seriesDescription: string;
  sopClassUid: string;
  transferSyntaxUid: string;
  isEncapsulated: boolean;
  isZDescending: boolean;
}

/**
 * Decodes a raw DICOM byte sequence into a clean string, attempting UTF-8 first,
 * then Windows-1251 (Cyrillic), with fallback to Latin-1.
 */
export function decodeDicomString(raw: Uint8Array): string {
  let text = "";
  try {
    text = new TextDecoder("utf-8", { fatal: true }).decode(raw);
  } catch {
    try {
      text = new TextDecoder("windows-1251").decode(raw);
    } catch {
      text = new TextDecoder("latin1").decode(raw);
    }
  }
  return text.replace(/\0+$/, "").replace(/\^/g, " ").trim();
}

/**
 * Fast discriminator checking whether the provided ArrayBuffer is a Multi-Frame DICOM
 * by searching for DICOM Tag (0028, 0008) Number of Frames > 1.
 */
export function isMultiFrameDicom(buffer: ArrayBuffer): boolean {
  if (!buffer || buffer.byteLength < 132) return false;

  const view = new DataView(buffer);
  const byteLength = buffer.byteLength;

  let startOffset = 128;
  if (byteLength >= 132) {
    const d = view.getUint8(128);
    const i = view.getUint8(129);
    const c = view.getUint8(130);
    const m = view.getUint8(131);
    if (d === 0x44 && i === 0x49 && c === 0x43 && m === 0x4d) {
      startOffset = 132;
    } else {
      startOffset = 0;
    }
  }

  // Scan header up to 512KB for tag (0028, 0008)
  const maxSearch = Math.min(byteLength - 8, 524288);
  for (let i = startOffset; i < maxSearch; i += 2) {
    const group = view.getUint16(i, true);
    const element = view.getUint16(i + 2, true);

    // Stop searching once we encounter the PixelData element
    if (group === 0x7fe0 && element === 0x0010) {
      break;
    }

    if (group === 0x0028 && element === 0x0008) {
      const c0 = view.getUint8(i + 4);
      const c1 = view.getUint8(i + 5);
      const isExplicit = c0 >= 65 && c0 <= 90 && c1 >= 65 && c1 <= 90;
      const len = isExplicit ? view.getUint16(i + 6, true) : view.getUint32(i + 4, true);
      const off = i + 8;

      if (len > 0 && len <= 16 && off + len <= byteLength) {
        try {
          const str = new TextDecoder("ascii").decode(new Uint8Array(buffer, off, len)).replace(/\0+$/, "").trim();
          const frames = Number.parseInt(str, 10);
          if (!Number.isNaN(frames)) {
            return frames > 1;
          }
        } catch {}
      }

      // Non-standard binary fallback (uint16 / uint32)
      if (len === 2 && off + 2 <= byteLength) {
        const frames = view.getUint16(off, true);
        if (frames > 1) return true;
      } else if (len === 4 && off + 4 <= byteLength) {
        const frames = view.getUint32(off, true);
        if (frames > 1) return true;
      }
    }
  }

  return false;
}

/**
 * Parses all relevant Multi-Frame DICOM header tags and extracts spatial geometry.
 */
export function parseMultiFrameDicomHeader(buffer: ArrayBuffer): MultiFrameDicomHeader {
  const view = new DataView(buffer);
  const byteLength = buffer.byteLength;

  let rows = 512;
  let cols = 512;
  let numberOfFrames = 1;
  let bitsAllocated = 16;
  let bitsStored = 16;
  let highBit = 15;
  let pixelRepresentation = 0;
  let pixelSpacingX = 0.20;
  let pixelSpacingY = 0.20;
  let sliceThickness = 0.0;
  let spacingBetweenSlices = 0.0;
  let rescaleSlope = 1.0;
  let rescaleIntercept = 0.0;
  let windowCenter = 1300.0;
  let windowWidth = 4400.0;
  let pixelDataByteOffset = -1;
  let pixelDataByteLength = 0;
  let patientName = "Не указан";
  let patientId = "";
  let studyDate = "";
  let seriesDescription = "";
  let sopClassUid = "";
  let transferSyntaxUid = "";
  let isEncapsulated = false;

  const zPositions: number[] = [];

  let startOffset = 128;
  if (byteLength >= 132) {
    const d = view.getUint8(128);
    const i = view.getUint8(129);
    const c = view.getUint8(130);
    const m = view.getUint8(131);
    if (d === 0x44 && i === 0x49 && c === 0x43 && m === 0x4d) {
      startOffset = 132;
    } else {
      startOffset = 0;
    }
  }

  // Scan up to 2MB or byteLength - 8 for metadata tags
  const maxSearch = Math.min(byteLength - 8, 2097152);

  for (let i = startOffset; i < maxSearch; i += 2) {
    if (pixelDataByteOffset > 0 && i >= pixelDataByteOffset - 4) {
      break;
    }

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
        transferSyntaxUid = new TextDecoder("ascii")
          .decode(new Uint8Array(buffer, tagValOff, tagLen))
          .replace(/\0+$/, "")
          .trim();
        if (transferSyntaxUid.startsWith("1.2.840.10008.1.2.4") || transferSyntaxUid === "1.2.840.10008.1.2.5") {
          isEncapsulated = true;
        }
      }
    } else if (group === 0x0008 && element === 0x0016) {
      // SOPClassUID
      if (tagLen > 0 && tagValOff + tagLen <= byteLength) {
        sopClassUid = new TextDecoder("ascii")
          .decode(new Uint8Array(buffer, tagValOff, tagLen))
          .replace(/\0+$/, "")
          .trim();
      }
    } else if (group === 0x0008 && element === 0x0020) {
      // StudyDate
      if (tagLen > 0 && tagValOff + tagLen <= byteLength) {
        studyDate = new TextDecoder("ascii")
          .decode(new Uint8Array(buffer, tagValOff, Math.min(tagLen, 12)))
          .replace(/\0+$/, "")
          .trim();
      }
    } else if (group === 0x0008 && element === 0x103e) {
      // SeriesDescription
      if (tagLen > 0 && tagValOff + tagLen <= byteLength) {
        seriesDescription = decodeDicomString(new Uint8Array(buffer, tagValOff, Math.min(tagLen, 128)));
      }
    } else if (group === 0x0010 && element === 0x0010) {
      // PatientName
      if (tagLen > 0 && tagValOff + tagLen <= byteLength) {
        const decoded = decodeDicomString(new Uint8Array(buffer, tagValOff, Math.min(tagLen, 128)));
        if (decoded) patientName = decoded;
      }
    } else if (group === 0x0010 && element === 0x0020) {
      // PatientID
      if (tagLen > 0 && tagValOff + tagLen <= byteLength) {
        patientId = decodeDicomString(new Uint8Array(buffer, tagValOff, Math.min(tagLen, 64)));
      }
    } else if (group === 0x0018 && element === 0x0050) {
      // SliceThickness
      if (tagLen > 0 && tagValOff + tagLen <= byteLength) {
        const str = new TextDecoder("ascii")
          .decode(new Uint8Array(buffer, tagValOff, tagLen))
          .replace(/\0+$/, "")
          .trim();
        const val = Number.parseFloat(str);
        if (!Number.isNaN(val) && val > 0) sliceThickness = val;
      }
    } else if (group === 0x0018 && element === 0x0088) {
      // SpacingBetweenSlices
      if (tagLen > 0 && tagValOff + tagLen <= byteLength) {
        const str = new TextDecoder("ascii")
          .decode(new Uint8Array(buffer, tagValOff, tagLen))
          .replace(/\0+$/, "")
          .trim();
        const val = Number.parseFloat(str);
        if (!Number.isNaN(val) && val > 0) spacingBetweenSlices = val;
      }
    } else if (group === 0x0020 && element === 0x0032) {
      // ImagePositionPatient [X, Y, Z]
      if (tagLen > 0 && tagValOff + tagLen <= byteLength) {
        const str = new TextDecoder("ascii")
          .decode(new Uint8Array(buffer, tagValOff, tagLen))
          .replace(/\0+$/, "")
          .trim();
        const parts = str.split("\\").map((s) => Number.parseFloat(s.trim()));
        if (parts.length >= 3 && !Number.isNaN(parts[2])) {
          zPositions.push(parts[2]!);
        }
      }
    } else if (group === 0x0028 && element === 0x0008) {
      // NumberOfFrames
      if (tagLen > 0 && tagValOff + tagLen <= byteLength) {
        const str = new TextDecoder("ascii")
          .decode(new Uint8Array(buffer, tagValOff, tagLen))
          .replace(/\0+$/, "")
          .trim();
        const num = Number.parseInt(str, 10);
        if (!Number.isNaN(num) && num > 0) {
          numberOfFrames = num;
        } else if (tagLen === 2) {
          const bVal = view.getUint16(tagValOff, true);
          if (bVal > 0) numberOfFrames = bVal;
        } else if (tagLen === 4) {
          const bVal = view.getUint32(tagValOff, true);
          if (bVal > 0) numberOfFrames = bVal;
        }
      }
    } else if (group === 0x0028 && element === 0x0010) {
      // Rows
      if (tagValOff + 2 <= byteLength) {
        rows = view.getUint16(tagValOff, true);
      }
    } else if (group === 0x0028 && element === 0x0011) {
      // Columns
      if (tagValOff + 2 <= byteLength) {
        cols = view.getUint16(tagValOff, true);
      }
    } else if (group === 0x0028 && element === 0x0030) {
      // PixelSpacing [RowSpacing, ColSpacing]
      if (tagLen > 0 && tagValOff + tagLen <= byteLength) {
        const str = new TextDecoder("ascii")
          .decode(new Uint8Array(buffer, tagValOff, tagLen))
          .replace(/\0+$/, "")
          .trim();
        const parts = str.split("\\").map((s) => Number.parseFloat(s.trim()));
        if (parts.length >= 2) {
          if (!Number.isNaN(parts[0]) && (parts[0] ?? 0) > 0) pixelSpacingY = parts[0] ?? 0.20;
          if (!Number.isNaN(parts[1]) && (parts[1] ?? 0) > 0) pixelSpacingX = parts[1] ?? 0.20;
        }
      }
    } else if (group === 0x0028 && element === 0x0100) {
      // BitsAllocated
      if (tagValOff + 2 <= byteLength) {
        bitsAllocated = view.getUint16(tagValOff, true);
      }
    } else if (group === 0x0028 && element === 0x0101) {
      // BitsStored
      if (tagValOff + 2 <= byteLength) {
        bitsStored = view.getUint16(tagValOff, true);
      }
    } else if (group === 0x0028 && element === 0x0102) {
      // HighBit
      if (tagValOff + 2 <= byteLength) {
        highBit = view.getUint16(tagValOff, true);
      }
    } else if (group === 0x0028 && element === 0x0103) {
      // PixelRepresentation
      if (tagValOff + 2 <= byteLength) {
        pixelRepresentation = view.getUint16(tagValOff, true);
      }
    } else if (group === 0x0028 && element === 0x1050) {
      // WindowCenter
      if (tagLen > 0 && tagValOff + tagLen <= byteLength) {
        const str = new TextDecoder("ascii")
          .decode(new Uint8Array(buffer, tagValOff, tagLen))
          .replace(/\0+$/, "")
          .trim();
        const val = Number.parseFloat(str.split("\\")[0]?.trim() ?? "");
        if (!Number.isNaN(val)) windowCenter = val;
      }
    } else if (group === 0x0028 && element === 0x1051) {
      // WindowWidth
      if (tagLen > 0 && tagValOff + tagLen <= byteLength) {
        const str = new TextDecoder("ascii")
          .decode(new Uint8Array(buffer, tagValOff, tagLen))
          .replace(/\0+$/, "")
          .trim();
        const val = Number.parseFloat(str.split("\\")[0]?.trim() ?? "");
        if (!Number.isNaN(val) && val > 0) windowWidth = val;
      }
    } else if (group === 0x0028 && element === 0x1052) {
      // RescaleIntercept
      if (tagLen > 0 && tagValOff + tagLen <= byteLength) {
        const str = new TextDecoder("ascii")
          .decode(new Uint8Array(buffer, tagValOff, tagLen))
          .replace(/\0+$/, "")
          .trim();
        const val = Number.parseFloat(str);
        if (!Number.isNaN(val)) rescaleIntercept = val;
      }
    } else if (group === 0x0028 && element === 0x1053) {
      // RescaleSlope
      if (tagLen > 0 && tagValOff + tagLen <= byteLength) {
        const str = new TextDecoder("ascii")
          .decode(new Uint8Array(buffer, tagValOff, tagLen))
          .replace(/\0+$/, "")
          .trim();
        const val = Number.parseFloat(str);
        if (!Number.isNaN(val) && val > 0) rescaleSlope = val;
      }
    } else if (group === 0x7fe0 && element === 0x0010) {
      // PixelData
      if (isExplicit) {
        if (vr === "OW" || vr === "OB" || vr === "UN") {
          pixelDataByteLength = view.getUint32(i + 8, true);
          pixelDataByteOffset = i + 12;
        } else {
          pixelDataByteLength = view.getUint16(i + 6, true);
          pixelDataByteOffset = i + 8;
        }
      } else {
        pixelDataByteLength = view.getUint32(i + 4, true);
        pixelDataByteOffset = i + 8;
      }

      if (pixelDataByteLength === 0xffffffff) {
        isEncapsulated = true;
      }
      break;
    }
  }

  // Determine physical Z spacing and orientation
  let perFrameDeltaZ = 0;
  let isZDescending = false;

  if (zPositions.length >= 2 && numberOfFrames > 1) {
    const firstZ = zPositions[0]!;
    const lastZ = zPositions[zPositions.length - 1]!;
    if (firstZ > lastZ) {
      isZDescending = true;
    }
    const computed = Math.abs(lastZ - firstZ) / (zPositions.length - 1);
    if (computed > 0.001 && computed < 50.0) {
      perFrameDeltaZ = computed;
    }
  }

  // Hierarchy for Z-spacing: SpacingBetweenSlices -> perFrameDeltaZ -> SliceThickness -> isotropic voxel
  let zSpacing = 0.20;
  if (spacingBetweenSlices > 0 && spacingBetweenSlices < 50.0) {
    zSpacing = spacingBetweenSlices;
  } else if (perFrameDeltaZ > 0.001 && perFrameDeltaZ < 50.0) {
    zSpacing = perFrameDeltaZ;
  } else if (sliceThickness > 0 && sliceThickness < 50.0) {
    zSpacing = sliceThickness;
  } else if (pixelSpacingX > 0) {
    zSpacing = pixelSpacingX;
  }

  // PixelData offset fallback if not found explicitly or length mismatch
  const bytesPerPixel = bitsAllocated === 8 ? 1 : 2;
  const expectedTotalBytes = rows * cols * bytesPerPixel * numberOfFrames;

  if (pixelDataByteOffset === -1 || pixelDataByteOffset + expectedTotalBytes > byteLength) {
    if (byteLength >= expectedTotalBytes) {
      pixelDataByteOffset = byteLength - expectedTotalBytes;
      pixelDataByteLength = expectedTotalBytes;
    } else {
      pixelDataByteOffset = Math.max(0, byteLength - rows * cols * bytesPerPixel);
      pixelDataByteLength = byteLength - pixelDataByteOffset;
    }
  }

  return {
    rows,
    cols,
    numberOfFrames,
    bitsAllocated,
    bitsStored,
    highBit,
    pixelRepresentation,
    pixelSpacing: { x: pixelSpacingX, y: pixelSpacingY },
    sliceThickness: sliceThickness > 0 ? sliceThickness : zSpacing,
    spacingBetweenSlices,
    zSpacing,
    rescaleSlope,
    rescaleIntercept,
    windowCenter,
    windowWidth,
    pixelDataByteOffset,
    pixelDataByteLength,
    patientName,
    patientId,
    studyDate,
    seriesDescription,
    sopClassUid,
    transferSyntaxUid,
    isEncapsulated,
    isZDescending,
  };
}

/**
 * Ingests a Multi-Frame Enhanced CT DICOM ArrayBuffer and produces a contiguous
 * CbctVoxelVolume in typed memory ready for 3D MPR reslicing.
 */
export async function buildVolumeFromMultiFrameDicom(
  buffer: ArrayBuffer,
  onProgress?: (percent: number, message: string) => void,
): Promise<CbctVoxelVolume> {
  onProgress?.(5, "Чтение метаданных Multi-Frame DICOM...");

  const header = parseMultiFrameDicomHeader(buffer);

  if (header.numberOfFrames <= 1) {
    throw new Error(
      `DICOM файл содержит только ${header.numberOfFrames} кадр(ов). Для серии отдельных файлов срезов используйте стандартный загрузчик.`,
    );
  }

  if (header.isEncapsulated) {
    throw new Error(
      "Сжатый Multi-Frame DICOM (JPEG/RLE) не поддерживается. Экспортируйте КТ в несжатом формате (Explicit VR Little Endian).",
    );
  }

  const width = header.cols;
  const height = header.rows;
  const depth = header.numberOfFrames;

  if (width <= 0 || height <= 0) {
    throw new Error(`Некорректные размеры матрицы DICOM: ${width}x${height}`);
  }

  const sliceVoxelCount = width * height;
  const totalVoxels = sliceVoxelCount * depth;
  const bytesPerPixel = header.bitsAllocated === 8 ? 1 : 2;
  const frameByteLength = sliceVoxelCount * bytesPerPixel;
  const expectedTotalBytes = frameByteLength * depth;

  let pixelDataOffset = header.pixelDataByteOffset;

  if (pixelDataOffset < 0 || pixelDataOffset + expectedTotalBytes > buffer.byteLength) {
    if (buffer.byteLength >= expectedTotalBytes) {
      pixelDataOffset = buffer.byteLength - expectedTotalBytes;
    } else {
      throw new Error(
        `Размер буфера DICOM (${buffer.byteLength} байт) недостаточен для ${depth} кадров ${width}x${height}x${bytesPerPixel}B (требуется ${expectedTotalBytes} байт)`,
      );
    }
  }

  onProgress?.(15, `Выделение памяти под 3D объем ${width}x${height}x${depth} вокселей...`);

  const voxelData = new Int16Array(totalVoxels);
  const slope = header.rescaleSlope;
  const intercept = header.rescaleIntercept;
  const isSigned = header.pixelRepresentation === 1;
  const bits = header.bitsAllocated;

  let minVoxelHU = 32767;
  let maxVoxelHU = -32768;

  for (let z = 0; z < depth; z++) {
    const frameOffset = pixelDataOffset + z * frameByteLength;
    // Align orientation to Inferior -> Superior (Z increasing upwards)
    const targetZ = header.isZDescending ? depth - 1 - z : z;
    const baseIdx = targetZ * sliceVoxelCount;

    if (bits === 16) {
      let rawSlice: Int16Array | Uint16Array;
      if (frameOffset % 2 === 0) {
        rawSlice = isSigned
          ? new Int16Array(buffer, frameOffset, sliceVoxelCount)
          : new Uint16Array(buffer, frameOffset, sliceVoxelCount);
      } else {
        const sliceBuf = buffer.slice(frameOffset, frameOffset + frameByteLength);
        rawSlice = isSigned ? new Int16Array(sliceBuf) : new Uint16Array(sliceBuf);
      }

      for (let i = 0; i < sliceVoxelCount; i++) {
        const raw = rawSlice[i] ?? 0;
        const hu = Math.max(-32768, Math.min(32767, Math.round(raw * slope + intercept)));
        voxelData[baseIdx + i] = hu;
        if (hu < minVoxelHU) minVoxelHU = hu;
        if (hu > maxVoxelHU) maxVoxelHU = hu;
      }
    } else {
      // 8-bit fallback
      const rawSlice = isSigned
        ? new Int8Array(buffer, frameOffset, sliceVoxelCount)
        : new Uint8Array(buffer, frameOffset, sliceVoxelCount);

      for (let i = 0; i < sliceVoxelCount; i++) {
        const raw = rawSlice[i] ?? 0;
        const hu = Math.max(-32768, Math.min(32767, Math.round(raw * slope + intercept)));
        voxelData[baseIdx + i] = hu;
        if (hu < minVoxelHU) minVoxelHU = hu;
        if (hu > maxVoxelHU) maxVoxelHU = hu;
      }
    }

    if (z % 25 === 0 || z === depth - 1) {
      const pct = 15 + Math.round(((z + 1) / depth) * 80);
      onProgress?.(pct, `Обработка кадра ${z + 1}/${depth} Multi-Frame CT...`);
    }
  }

  onProgress?.(100, "Multi-Frame КЛКТ объем успешно сформирован");

  const physicalWidthMm = width * header.pixelSpacing.x;
  const physicalHeightMm = height * header.pixelSpacing.y;
  const physicalDepthMm = depth * header.zSpacing;

  return {
    id: `dicom-multiframe-${Date.now()}`,
    dimensions: { width, height, depth },
    spacingMm: { x: header.pixelSpacing.x, y: header.pixelSpacing.y, z: header.zSpacing },
    originMm: { x: -physicalWidthMm * 0.5, y: -physicalHeightMm * 0.5, z: -physicalDepthMm * 0.5 },
    physicalSizeMm: { x: physicalWidthMm, y: physicalHeightMm, z: physicalDepthMm },
    data: voxelData,
    minHU: minVoxelHU,
    maxHU: maxVoxelHU,
    rescaleSlope: header.rescaleSlope,
    rescaleIntercept: header.rescaleIntercept,
    defaultWindowWidth: header.windowWidth > 0 ? header.windowWidth : 4400,
    defaultWindowLevel: header.windowCenter !== 0 ? header.windowCenter : 1300,
    isDisposed: false,
  };
}
