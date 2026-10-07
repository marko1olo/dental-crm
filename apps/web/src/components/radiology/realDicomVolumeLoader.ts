/**
 * realDicomVolumeLoader.ts — Industrial Real DICOM Series Ingestion Engine
 *
 * Coordinates DICOM Part 10 slice series ingestion, worker-based decoding,
 * zero-copy WebGL 3D texture uploading, ZIP unpacking, and PACS WADO-RS streaming.
 * Governed by Mandate 8b (file length <= 800 lines, target <= 620 lines) and Mandate 8e.
 */

import * as fflate from "fflate";
import { getDenteAuthHeaders } from "../../lib/denteRequestHeaders";
import type { CbctVoxelVolume } from "./cbctMprMath";
import {
  isMultiFrameDicom,
  buildVolumeFromMultiFrameDicom,
  parseMultiFrameDicomHeader,
  decodeDicomString,
  type MultiFrameDicomHeader,
} from "./dicomMultiFrameLoader";
import type { CbctWorkerBridge, DecodeDicomSliceTask } from "./mpr/cbctWorkerBridge";
import {
  parseDicomSliceHeader,
  computeSliceNormalDistance,
  extractCalibratedVoxelHU,
  decodeSliceVoxels,
  isLocalizerOrScoutSlice,
  DICOM_TRANSFER_SYNTAX,
  isValidTransferSyntax,
  isEncapsulatedTransferSyntax,
  type ParsedDicomSliceHeader,
  type DicomSliceEntry,
} from "./dicomSliceHeaderParser";
import { generateProgressiveLodVolume } from "./dicomProgressiveLod";
import * as jpegPkg from "jpeg-lossless-decoder-js";
const JpegDecoder: any = (jpegPkg as any).Decoder || (jpegPkg as any).default?.Decoder || (jpegPkg as any).default;

/**
 * Decodes encapsulated Process 14 / First-Order Prediction JPEG Lossless (1.2.840.10008.1.2.4.70)
 * buffer into native 16-bit voxel array.
 */
export function decodeJpegLosslessSliceBuffer(buffer: ArrayBuffer): Uint16Array | null {
  const u8 = new Uint8Array(buffer);
  let soi = -1;
  let eoi = -1;
  const maxSearch = Math.min(u8.length - 1, 16384);
  for (let i = 0; i < maxSearch; i++) {
    if (u8[i] === 0xff && u8[i + 1] === 0xd8) {
      soi = i;
      break;
    }
  }
  if (soi === -1) return null;
  for (let i = u8.length - 2; i >= Math.max(0, u8.length - 8192); i--) {
    if (u8[i] === 0xff && u8[i + 1] === 0xd9) {
      eoi = i + 2;
      break;
    }
  }
  if (eoi === -1) return null;
  try {
    const dec = new JpegDecoder();
    const subBuf = u8.subarray(soi, eoi);
    const arrBuf = subBuf.buffer.slice(subBuf.byteOffset, subBuf.byteOffset + subBuf.byteLength);
    const decoded = dec.decode(arrBuf, 0, arrBuf.byteLength, 2);
    return decoded instanceof Uint16Array ? decoded : new Uint16Array(decoded.buffer);
  } catch {
    return null;
  }
}

// Transparent re-exports for external consumers
export {
  isMultiFrameDicom,
  buildVolumeFromMultiFrameDicom,
  parseMultiFrameDicomHeader,
  decodeDicomString,
  type MultiFrameDicomHeader,
  parseDicomSliceHeader,
  computeSliceNormalDistance,
  extractCalibratedVoxelHU,
  decodeSliceVoxels,
  isLocalizerOrScoutSlice,
  DICOM_TRANSFER_SYNTAX,
  isValidTransferSyntax,
  isEncapsulatedTransferSyntax,
  type ParsedDicomSliceHeader,
  type DicomSliceEntry,
  generateProgressiveLodVolume,
};

declare module "./cbctMprMath" {
  interface CbctVoxelVolume {
    readonly imageOrientationPatient?: readonly [number, number, number, number, number, number] | undefined;
    readonly isFlippedX?: boolean | undefined;
    readonly isFlippedY?: boolean | undefined;
    readonly isFlippedZ?: boolean | undefined;
    readonly isProgressivePreview?: boolean | undefined;
    readonly lodLevel?: number | undefined;
  }
}

export interface DicomStreamingUploadTarget {
  gl: WebGL2RenderingContext;
  texture: WebGLTexture;
  /** If true, texImage3D is pre-allocated with null initial storage before streaming */
  allocateStorage?: boolean;
}

export interface DicomVolumeIngestionOptions {
  onProgress?: ((percent: number, message: string) => void) | undefined;
  onSliceDecoded?: ((sliceIndex: number, totalSlices: number, sliceData: Int16Array) => void) | undefined;
  onProgressiveVolumeReady?: ((previewVolume: CbctVoxelVolume) => void) | undefined;
  gpuUploadTarget?: DicomStreamingUploadTarget | null | undefined;
  concurrency?: number | undefined;
  workerBridge?: CbctWorkerBridge | null | undefined;
  enableProgressiveLOD?: boolean | undefined;
}

/**
 * Yields execution back to the browser / Node event loop to prevent UI thread starvation.
 */
export async function yieldToEventLoop(): Promise<void> {
  await new Promise<void>((resolve) => setTimeout(resolve, 0));
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

export async function buildVolumeFromDicomBuffers(
  items: Array<{ buffer: ArrayBuffer; fileName?: string | undefined }>,
  options?: ((percent: number, message: string) => void) | DicomVolumeIngestionOptions,
): Promise<CbctVoxelVolume> {
  if (!items || items.length === 0) {
    throw new Error("Не передано ни одного буфера DICOM для загрузки");
  }

  const onProgress = typeof options === "function" ? options : options?.onProgress;
  const onSliceDecoded = typeof options === "object" ? options?.onSliceDecoded : undefined;
  const onProgressiveVolumeReady = typeof options === "object" ? options?.onProgressiveVolumeReady : undefined;
  const gpuTarget = typeof options === "object" ? options?.gpuUploadTarget : undefined;
  const workerBridge = typeof options === "object" ? options?.workerBridge : undefined;

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

    if (i % 10 === 0 || i === totalFiles - 1) {
      const pct = 5 + Math.round((i / totalFiles) * 35);
      onProgress?.(pct, "Прочитано " + (i + 1) + " из " + totalFiles + " срезов...");
      await yieldToEventLoop();
    }
  }

  // 1. DICOM Guardrail: Reject 2D scout / localizer / surview images
  if (sliceEntries.length > 1) {
    const tomographicSlices = sliceEntries.filter((e) => !isLocalizerOrScoutSlice(e.header));
    if (tomographicSlices.length > 0 && tomographicSlices.length !== sliceEntries.length) {
      sliceEntries.length = 0;
      sliceEntries.push(...tomographicSlices);
    }
  }

  // 2. DICOM Guardrail: Exclude auxiliary slices whose matrix dimensions do not match the dominant CT volume
  if (sliceEntries.length > 1) {
    const dimCounts = new Map<string, number>();
    for (const e of sliceEntries) {
      const key = `${e.header.rows}x${e.header.cols}`;
      dimCounts.set(key, (dimCounts.get(key) ?? 0) + 1);
    }
    let dominantDim = "";
    let maxCount = 0;
    dimCounts.forEach((count, k) => {
      if (count > maxCount) {
        maxCount = count;
        dominantDim = k;
      }
    });
    const [domRows, domCols] = dominantDim.split("x").map(Number);
    const filtered = sliceEntries.filter((e) => e.header.rows === domRows && e.header.cols === domCols);
    if (filtered.length > 0 && filtered.length !== sliceEntries.length) {
      sliceEntries.length = 0;
      sliceEntries.push(...filtered);
    }
  }

  // 3. DICOM Guardrail: Sort slices in ascending order of physical Z / normal distance (Caudal -> Cranial)
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

  // 4. DICOM Guardrail: Deduplicate slices acquired at identical physical Z coordinate (< 0.01 mm)
  if (sliceEntries.length > 1) {
    const distances = sliceEntries.map((e) =>
      computeSliceNormalDistance(
        e.header.imagePositionPatient,
        e.header.imageOrientationPatient,
        e.header.sliceLocationZ,
      ),
    );
    let minZ = Infinity;
    let maxZ = -Infinity;
    for (let i = 0; i < distances.length; i++) {
      const d = distances[i]!;
      if (d < minZ) minZ = d;
      if (d > maxZ) maxZ = d;
    }
    const hasZVariation = (maxZ - minZ) >= 0.01;

    if (hasZVariation) {
      const uniqueSlices: DicomSliceEntry[] = [];
      for (let idx = 0; idx < sliceEntries.length; idx++) {
        const entry = sliceEntries[idx]!;
        if (uniqueSlices.length === 0) {
          uniqueSlices.push(entry);
        } else {
          const prev = uniqueSlices[uniqueSlices.length - 1]!;
          const distPrev = computeSliceNormalDistance(
            prev.header.imagePositionPatient,
            prev.header.imageOrientationPatient,
            prev.header.sliceLocationZ,
          );
          const distCur = distances[idx]!;
          if (Math.abs(distCur - distPrev) >= 0.01) {
            uniqueSlices.push(entry);
          }
        }
      }
      if (uniqueSlices.length > 0 && uniqueSlices.length !== sliceEntries.length) {
        sliceEntries.length = 0;
        sliceEntries.push(...uniqueSlices);
      }
    }
  }

  const refHeader = sliceEntries[0]!.header;
  const width = refHeader.cols;
  const height = refHeader.rows;
  const depth = sliceEntries.length;

  // 5. DICOM Guardrail: Compute robust median slice spacing instead of naive division of extreme points
  let computedSpacingZ = refHeader.sliceThickness;
  if (depth > 1) {
    const distances = sliceEntries.map((e) =>
      computeSliceNormalDistance(
        e.header.imagePositionPatient,
        e.header.imageOrientationPatient,
        e.header.sliceLocationZ,
      ),
    );
    const stepDeltas: number[] = [];
    for (let i = 1; i < distances.length; i++) {
      const delta = Math.abs(distances[i]! - distances[i - 1]!);
      if (delta > 0.001 && delta < 20.0) {
        stepDeltas.push(delta);
      }
    }
    if (stepDeltas.length > 0) {
      stepDeltas.sort((a, b) => a - b);
      const medianDeltaZ = stepDeltas[Math.floor(stepDeltas.length / 2)]!;
      if (medianDeltaZ > 0.001 && medianDeltaZ < 10.0) {
        computedSpacingZ = medianDeltaZ;
      }
    }
  }

  const refOrient = refHeader.imageOrientationPatient ?? [1, 0, 0, 0, 1, 0];
  const [Xx, , , , Yy] = refOrient;
  // If Xx < -0.5, row axis points towards patient Right (-X) instead of standard Left (+X).
  const flipX = Xx < -0.5;
  // If Yy < -0.5, col axis points towards patient Anterior (-Y) instead of standard Posterior (+Y).
  const flipY = (Yy ?? 1) < -0.5;

  // Progressive LOD preview: if requested and series has >= 2 slices, emit 2x downsampled volume immediately (< 50ms)
  if (onProgressiveVolumeReady && depth >= 2) {
    try {
      const previewVol = generateProgressiveLodVolume(
        sliceEntries,
        refHeader,
        computedSpacingZ,
        flipX,
        flipY,
      );
      onProgressiveVolumeReady(previewVol);
    } catch (err) {
      console.warn("[realDicomVolumeLoader] Failed to generate progressive LOD preview:", err);
    }
  }

  onProgress?.(45, "Сборка 3D массива вокселей в непрерывную память...");

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
        null,
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

  // INSTANT FIRST SLICE (Z = Math.floor(depth / 2)):
  // Immediately decode central axial slice and emit progressive volume for instant 1-2s viewport paint
  if (onProgressiveVolumeReady && depth >= 1) {
    const midZ = Math.floor(depth / 2);
    const midEntry = sliceEntries[midZ];
    if (midEntry && midEntry.buffer) {
      try {
        const midOffset = midEntry.header.pixelDataByteOffset;
        let rawMidSlice: Int16Array | Uint16Array;
        if (midOffset % 2 === 0 && midEntry.buffer.byteLength >= midOffset + sliceVoxelCount * 2) {
          rawMidSlice = isSigned
            ? new Int16Array(midEntry.buffer, midOffset, sliceVoxelCount)
            : new Uint16Array(midEntry.buffer, midOffset, sliceVoxelCount);
        } else {
          const sliceArrayBuf = midEntry.buffer.slice(midOffset, midOffset + sliceVoxelCount * 2);
          const validEvenLength = sliceArrayBuf.byteLength - (sliceArrayBuf.byteLength % 2);
          const safeBuf = validEvenLength === sliceArrayBuf.byteLength ? sliceArrayBuf : sliceArrayBuf.slice(0, validEvenLength);
          rawMidSlice = isSigned ? new Int16Array(safeBuf) : new Uint16Array(safeBuf);
        }
        const midBaseIdx = midZ * sliceVoxelCount;
        decodeSliceVoxels({
          rawSlice: rawMidSlice,
          voxelData,
          baseIdx: midBaseIdx,
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
        });

        const physicalWidthMm = width * refHeader.pixelSpacing.x;
        const physicalHeightMm = height * refHeader.pixelSpacing.y;
        const physicalDepthMm = depth * computedSpacingZ;

        const initialSliceVol: CbctVoxelVolume = {
          id: `dicom-preview-initial-${Date.now()}`,
          dimensions: { width, height, depth },
          spacingMm: { x: refHeader.pixelSpacing.x, y: refHeader.pixelSpacing.y, z: computedSpacingZ },
          originMm: { x: -physicalWidthMm * 0.5, y: -physicalHeightMm * 0.5, z: -physicalDepthMm * 0.5 },
          physicalSizeMm: { x: physicalWidthMm, y: physicalHeightMm, z: physicalDepthMm },
          data: voxelData,
          minHU: -1000,
          maxHU: 3000,
          rescaleSlope: refHeader.rescaleSlope,
          rescaleIntercept: refHeader.rescaleIntercept,
          defaultWindowWidth: refHeader.windowWidth > 0 ? refHeader.windowWidth : 4400,
          defaultWindowLevel: refHeader.windowCenter !== 0 ? refHeader.windowCenter : 1300,
          imageOrientationPatient: refHeader.imageOrientationPatient,
          isFlippedX: flipX,
          isFlippedY: flipY,
          isProgressivePreview: true,
          patientName: refHeader.patientName,
          isDisposed: false,
        };

        onProgressiveVolumeReady(initialSliceVol);
        await yieldToEventLoop();
      } catch (err) {
        console.warn("[realDicomVolumeLoader] Failed to emit instant first slice preview:", err);
      }
    }
  }

  if (workerBridge) {
    // Multi-threaded background worker slice decoding in batches of 10 with Transferable buffers
    const batchSize = 10;
    for (let z = 0; z < depth; z += batchSize) {
      const endZ = Math.min(depth, z + batchSize);
      const tasks: DecodeDicomSliceTask[] = [];
      for (let k = z; k < endZ; k++) {
        const entry = sliceEntries[k]!;
        if (!entry.buffer) continue;
        tasks.push({
          sliceIndex: k,
          buffer: entry.buffer,
          pixelDataByteOffset: entry.header.pixelDataByteOffset,
          width,
          height,
          bitsStored,
          isSigned,
          rescaleSlope: slope,
          rescaleIntercept: intercept,
          flipX,
          flipY,
        });
      }

      const decodedBatch = await workerBridge.decodeDicomSlices(tasks, true);
      for (const res of decodedBatch) {
        const k = res.sliceIndex;
        const baseIdx = k * sliceVoxelCount;
        voxelData.set(res.data, baseIdx);
        if (res.minHU < minVoxelHU) minVoxelHU = res.minHU;
        if (res.maxHU > maxVoxelHU) maxVoxelHU = res.maxHU;

        if (gpuTarget?.gl && gpuTarget.texture) {
          uploadSliceTo3dTexture(
            gpuTarget.gl,
            k,
            width,
            height,
            voxelData.subarray(baseIdx, baseIdx + sliceVoxelCount),
          );
        }

        onSliceDecoded?.(k, depth, voxelData.subarray(baseIdx, baseIdx + sliceVoxelCount));
        sliceEntries[k]!.buffer = null; // GC prompt
      }

      await yieldToEventLoop();

      const pct = 45 + Math.round((endZ / depth) * 50);
      onProgress?.(pct, `Декодирование срезов ${endZ}/${depth}...`);
    }
  } else {
    // Main-thread decoding with cooperative event loop yielding every 16 slices
    for (let z = 0; z < depth; z++) {
      const entry = sliceEntries[z]!;
      if (!entry.buffer) continue;
      const offset = entry.header.pixelDataByteOffset;
      const baseIdx = z * sliceVoxelCount;

      let rawSlice: Int16Array | Uint16Array;
      const isEncapsulated =
        (entry.header.transferSyntaxUid && isEncapsulatedTransferSyntax(entry.header.transferSyntaxUid)) ||
        entry.buffer.byteLength < offset + sliceVoxelCount * 2;

      if (isEncapsulated) {
        const decoded = decodeJpegLosslessSliceBuffer(entry.buffer);
        if (decoded && decoded.length === sliceVoxelCount) {
          rawSlice = decoded;
        } else {
          rawSlice = new Uint16Array(sliceVoxelCount);
        }
      } else if (offset % 2 === 0 && entry.buffer.byteLength >= offset + sliceVoxelCount * 2) {
        rawSlice = isSigned
          ? new Int16Array(entry.buffer, offset, sliceVoxelCount)
          : new Uint16Array(entry.buffer, offset, sliceVoxelCount);
      } else {
        const sliceArrayBuf = entry.buffer.slice(offset, offset + sliceVoxelCount * 2);
        const validEvenLength = sliceArrayBuf.byteLength - (sliceArrayBuf.byteLength % 2);
        const safeBuf = validEvenLength === sliceArrayBuf.byteLength ? sliceArrayBuf : sliceArrayBuf.slice(0, validEvenLength);
        rawSlice = isSigned ? new Int16Array(safeBuf) : new Uint16Array(safeBuf);
      }

      const { minHU: localMin, maxHU: localMax } = decodeSliceVoxels({
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
      });

      if (localMin < minVoxelHU) minVoxelHU = localMin;
      if (localMax > maxVoxelHU) maxVoxelHU = localMax;

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
      entry.buffer = null; // GC prompt

      if (z % 10 === 0 || z === depth - 1) {
        const pct = 45 + Math.round((z / depth) * 50);
        onProgress?.(pct, "Копирование слоя " + (z + 1) + "/" + depth + " в VRAM...");
        await yieldToEventLoop();
      }
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
    patientName: refHeader.patientName,
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
    : 10;

  const total = files.length;
  const items: Array<{ buffer: ArrayBuffer; fileName: string }> = new Array(total);

  // Parallel chunked reading via Promise.all in batches of 10
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
    await yieldToEventLoop();
  }

  return buildVolumeFromDicomBuffers(items, options);
}

export async function buildVolumeFromDicomZip(
  zipBuffer: ArrayBuffer,
  options?: ((percent: number, message: string) => void) | DicomVolumeIngestionOptions,
): Promise<CbctVoxelVolume> {
  const onProgress = typeof options === "function" ? options : options?.onProgress;
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
  return buildVolumeFromDicomBuffers(items, options);
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
    onProgressiveVolumeReady?: (previewVolume: CbctVoxelVolume) => void;
    workerBridge?: CbctWorkerBridge | null;
    enableProgressiveLOD?: boolean;
    gpuUploadTarget?: DicomStreamingUploadTarget | null;
    concurrency?: number;
  },
): Promise<CbctVoxelVolume> {
  const onProgress = options?.onProgress;
  onProgress?.(5, "Запрос метаданных серии из PACS WADO-RS...");

  const apiBase = (options?.baseUrl ?? getViteApiUrl()).replace(/\/+$/, "");

  // Проброс авторизации (Authorization: Bearer + x-dente-staff-token + x-dente-clinic-token)
  const defaultAuth = getDenteAuthHeaders();
  const headers: Record<string, string> = { ...defaultAuth, ...(options?.headers ?? {}) };

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

  const validEntries: Array<{ sopUid: string; index: number }> = [];
  for (let i = 0; i < metaJson.length; i++) {
    const item = metaJson[i];
    const sopUid = item?.["00080018"]?.Value?.[0] as string | undefined;
    if (sopUid) {
      validEntries.push({ sopUid, index: i });
    }
  }

  if (validEntries.length === 0) {
    throw new Error("В запрошенной серии PACS не найдено снимков DICOM");
  }

  const total = validEntries.length;
  const concurrency = (options?.concurrency && options.concurrency > 0) ? options.concurrency : 8;
  const items: Array<{ buffer: ArrayBuffer; fileName: string }> = new Array(total);
  let downloadedCount = 0;
  let currentIndex = 0;

  // Батчевая параллельная загрузка срезов (Concurrency: 6-8 параллельных потоков)
  const workerCount = Math.min(concurrency, total);
  const workers = Array.from({ length: workerCount }, async () => {
    while (currentIndex < total) {
      const taskIndex = currentIndex++;
      const entry = validEntries[taskIndex]!;
      const frameUrl = `${apiBase}/api/dicomweb/studies/${encodeURIComponent(studyUid)}/series/${encodeURIComponent(seriesUid)}/instances/${encodeURIComponent(entry.sopUid)}`;
      const frameRes = await fetch(frameUrl, {
        headers: { Accept: "application/dicom", ...headers },
      });
      if (!frameRes.ok) {
        throw new Error(`PACS WADO-RS instance download failed (${entry.sopUid}): HTTP ${frameRes.status}`);
      }
      const buf = await frameRes.arrayBuffer();
      items[taskIndex] = { buffer: buf, fileName: `${entry.sopUid}.dcm` };
      downloadedCount++;

      if (downloadedCount % 5 === 0 || downloadedCount === total) {
        const pct = 10 + Math.round((downloadedCount / total) * 35);
        onProgress?.(pct, `Параллельная загрузка DICOM кадров (${downloadedCount}/${total})...`);
      }
    }
  });

  await Promise.all(workers);

  const ingestionOptions: DicomVolumeIngestionOptions = {
    onProgress,
    onProgressiveVolumeReady: options?.onProgressiveVolumeReady,
    workerBridge: options?.workerBridge,
    enableProgressiveLOD: options?.enableProgressiveLOD,
    gpuUploadTarget: options?.gpuUploadTarget,
  };

  return buildVolumeFromDicomBuffers(items, ingestionOptions);
}