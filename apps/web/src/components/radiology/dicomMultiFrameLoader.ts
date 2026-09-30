/**
 * dicomMultiFrameLoader.ts — Multi-Frame Enhanced CT DICOM Ingestion Engine
 *
 * Designed for single-file multi-slice acquisitions produced by dental CBCT
 * systems (Planmeca ProMax 3D / Romexis, KaVo 3D eXam / OP 3D, Dentsply Sirona
 * Orthophos SL / Galileos, Carestream CS 8100/9600).
 *
 * Conforms to DICOM Part 3 / PS 3.3 Multi-Frame Module & Enhanced CT Storage.
 * Governed by Mandate 8b (file length <= 800 lines, target <= 600 lines) and Mandate 8e.
 */

import type { CbctVoxelVolume } from "./cbctMprMath";
import {
  parseMultiFrameDicomHeader,
  isMultiFrameDicom,
  decodeDicomString,
  calibrateMultiFrameVoxel,
  type MultiFrameDicomHeader,
} from "./dicomMultiFrameParser";

// Transparent re-exports
export {
  parseMultiFrameDicomHeader,
  isMultiFrameDicom,
  decodeDicomString,
  calibrateMultiFrameVoxel,
  type MultiFrameDicomHeader,
};

export interface ExtractedDicomFrame {
  readonly frameIndex: number;
  readonly width: number;
  readonly height: number;
  readonly data: Int16Array;
  readonly minHU: number;
  readonly maxHU: number;
  readonly rescaleSlope: number;
  readonly rescaleIntercept: number;
  readonly windowCenter: number;
  readonly windowWidth: number;
  readonly pixelSpacing: { readonly x: number; readonly y: number };
  readonly sliceThickness: number;
}

/**
 * Extracts an individual frame from a Multi-Frame DICOM ArrayBuffer
 * without allocating the full 3D volume, preventing memory exhaustion and leaks.
 */
export function extractDicomFrame(
  buffer: ArrayBuffer,
  frameIndex: number,
  precomputedHeader?: MultiFrameDicomHeader,
): ExtractedDicomFrame {
  if (!buffer || buffer.byteLength < 132) {
    throw new Error("Некорректный или слишком короткий буфер DICOM");
  }

  const header = precomputedHeader ?? parseMultiFrameDicomHeader(buffer);

  if (header.isEncapsulated) {
    throw new Error(
      "Сжатый Multi-Frame DICOM (JPEG/RLE) не поддерживается для прямого извлечения кадров. Экспортируйте КТ в несжатом формате (Explicit VR Little Endian).",
    );
  }

  const totalFrames = Math.max(1, header.numberOfFrames);
  if (frameIndex < 0 || frameIndex >= totalFrames) {
    throw new RangeError(
      `Индекс кадра ${frameIndex} выходит за пределы [0, ${totalFrames - 1}]`,
    );
  }

  const width = header.cols;
  const height = header.rows;
  if (width <= 0 || height <= 0) {
    throw new Error(`Некорректные размеры матрицы кадра DICOM: ${width}x${height}`);
  }

  const sliceVoxelCount = width * height;
  const bytesPerPixel = header.bitsAllocated === 8 ? 1 : 2;
  const frameByteLength = sliceVoxelCount * bytesPerPixel;
  const expectedTotalBytes = frameByteLength * totalFrames;

  let pixelDataOffset = header.pixelDataByteOffset;
  if (pixelDataOffset < 0 || pixelDataOffset + expectedTotalBytes > buffer.byteLength) {
    if (buffer.byteLength >= expectedTotalBytes) {
      pixelDataOffset = buffer.byteLength - expectedTotalBytes;
    } else {
      throw new Error(
        `Размер буфера DICOM (${buffer.byteLength} байт) недостаточен для ${totalFrames} кадров ${width}x${height}x${bytesPerPixel}B (требуется ${expectedTotalBytes} байт)`,
      );
    }
  }

  const frameOffset = pixelDataOffset + frameIndex * frameByteLength;
  if (frameOffset + frameByteLength > buffer.byteLength) {
    throw new Error(
      `Смещение кадра ${frameIndex} (${frameOffset} + ${frameByteLength}B) выходит за размер буфера (${buffer.byteLength}B)`,
    );
  }

  const frameData = new Int16Array(sliceVoxelCount);
  const slope = header.rescaleSlope;
  const intercept = header.rescaleIntercept;
  const isSigned = header.pixelRepresentation === 1;
  const bits = header.bitsAllocated;
  const bitsStored = header.bitsStored;

  let minHU = 32767;
  let maxHU = -32768;

  if (bits === 16) {
    let rawSlice: Int16Array | Uint16Array;
    if (frameOffset % 2 === 0) {
      rawSlice = isSigned
        ? new Int16Array(buffer, frameOffset, sliceVoxelCount)
        : new Uint16Array(buffer, frameOffset, sliceVoxelCount);
    } else {
      const sliceBuf = buffer.slice(frameOffset, frameOffset + frameByteLength);
      const validEvenLength = sliceBuf.byteLength - (sliceBuf.byteLength % 2);
      const safeBuf = validEvenLength === sliceBuf.byteLength ? sliceBuf : sliceBuf.slice(0, validEvenLength);
      rawSlice = isSigned ? new Int16Array(safeBuf) : new Uint16Array(safeBuf);
    }

    for (let i = 0; i < sliceVoxelCount; i++) {
      const raw = rawSlice[i] ?? 0;
      const hu = calibrateMultiFrameVoxel(raw, bitsStored, isSigned, slope, intercept);
      frameData[i] = hu;
      if (hu < minHU) minHU = hu;
      if (hu > maxHU) maxHU = hu;
    }
  } else {
    const rawSlice = isSigned
      ? new Int8Array(buffer, frameOffset, sliceVoxelCount)
      : new Uint8Array(buffer, frameOffset, sliceVoxelCount);

    for (let i = 0; i < sliceVoxelCount; i++) {
      const raw = rawSlice[i] ?? 0;
      const hu = calibrateMultiFrameVoxel(raw, bitsStored, isSigned, slope, intercept);
      frameData[i] = hu;
      if (hu < minHU) minHU = hu;
      if (hu > maxHU) maxHU = hu;
    }
  }

  return {
    frameIndex,
    width,
    height,
    data: frameData,
    minHU: minHU === 32767 ? 0 : minHU,
    maxHU: maxHU === -32768 ? 0 : maxHU,
    rescaleSlope: slope,
    rescaleIntercept: intercept,
    windowCenter: header.windowCenter !== 0 ? header.windowCenter : 1300,
    windowWidth: header.windowWidth > 0 ? header.windowWidth : 4400,
    pixelSpacing: { x: header.pixelSpacing.x, y: header.pixelSpacing.y },
    sliceThickness: header.sliceThickness > 0 ? header.sliceThickness : header.zSpacing,
  };
}

export interface MultiFrameGpuUploadTarget {
  gl: WebGL2RenderingContext;
  texture: WebGLTexture;
  allocateStorage?: boolean;
}

export interface MultiFrameVolumeIngestionOptions {
  onProgress?: ((percent: number, message: string) => void) | undefined;
  onSliceDecoded?: ((sliceIndex: number, totalSlices: number, sliceData: Int16Array) => void) | undefined;
  onProgressiveVolumeReady?: ((previewVolume: CbctVoxelVolume) => void) | undefined;
  gpuUploadTarget?: MultiFrameGpuUploadTarget | null | undefined;
  enableProgressiveLOD?: boolean | undefined;
}

/**
 * Yields execution back to the browser / Node event loop to prevent UI thread starvation.
 */
export async function yieldToEventLoop(): Promise<void> {
  const g = globalThis as unknown as { scheduler?: { yield?: () => Promise<void> } };
  if (g.scheduler && typeof g.scheduler.yield === "function") {
    await g.scheduler.yield();
  } else {
    await new Promise<void>((resolve) => setTimeout(resolve, 0));
  }
}

/**
 * Rapidly constructs an initial 2x downsampled LOD 1 volume in < 50ms
 * directly from raw Multi-Frame DICOM buffers so 3D MPR planes are rendered immediately
 * while full-resolution streaming ingestion proceeds in background.
 */
export function generateMultiFrameProgressiveLodVolume(
  buffer: ArrayBuffer,
  header: MultiFrameDicomHeader,
): CbctVoxelVolume {
  const width = header.cols;
  const height = header.rows;
  const depth = header.numberOfFrames;

  const lodWidth = Math.max(1, Math.floor(width / 2));
  const lodHeight = Math.max(1, Math.floor(height / 2));
  const stepZ = depth >= 4 ? 2 : 1;
  const sampledIndices: number[] = [];
  for (let z = 0; z < depth; z += stepZ) {
    sampledIndices.push(z);
  }
  const lodDepth = sampledIndices.length;

  const physicalWidthMm = width * header.pixelSpacing.x;
  const physicalHeightMm = height * header.pixelSpacing.y;
  const physicalDepthMm = depth * header.zSpacing;

  const lodSpacingX = header.pixelSpacing.x * 2;
  const lodSpacingY = header.pixelSpacing.y * 2;
  const lodSpacingZ = lodDepth > 1 ? physicalDepthMm / lodDepth : header.zSpacing;

  const totalLodVoxels = lodWidth * lodHeight * lodDepth;
  const lodData = new Int16Array(totalLodVoxels);

  const slope = header.rescaleSlope;
  const intercept = header.rescaleIntercept;
  const isSigned = header.pixelRepresentation === 1;
  const bits = header.bitsAllocated;
  const bitsStored = header.bitsStored;

  const isLinearInteger = slope === 1.0 && Math.floor(intercept) === intercept;
  const intIntercept = intercept | 0;
  const mask = bitsStored < 16 ? (1 << bitsStored) - 1 : 0xffff;
  const signBit = bitsStored < 16 ? 1 << (bitsStored - 1) : 0x8000;
  const signExt = bitsStored < 16 ? 1 << bitsStored : 0x10000;

  const sliceVoxelCount = width * height;
  const bytesPerPixel = bits === 8 ? 1 : 2;
  const frameByteLength = sliceVoxelCount * bytesPerPixel;
  const pixelDataOffset = header.pixelDataByteOffset;

  let minHU = 32767;
  let maxHU = -32768;

  for (let lz = 0; lz < lodDepth; lz++) {
    const origZ = sampledIndices[lz]!;
    const frameOffset = pixelDataOffset + origZ * frameByteLength;
    if (frameOffset + frameByteLength > buffer.byteLength) continue;

    let rawSlice: Int16Array | Uint16Array;
    if (frameOffset % 2 === 0) {
      rawSlice = isSigned
        ? new Int16Array(buffer, frameOffset, sliceVoxelCount)
        : new Uint16Array(buffer, frameOffset, sliceVoxelCount);
    } else {
      const sliceBuf = buffer.slice(frameOffset, frameOffset + frameByteLength);
      const validEven = sliceBuf.byteLength - (sliceBuf.byteLength % 2);
      const safeBuf = validEven === sliceBuf.byteLength ? sliceBuf : sliceBuf.slice(0, validEven);
      rawSlice = isSigned ? new Int16Array(safeBuf) : new Uint16Array(safeBuf);
    }

    // Align orientation to Inferior -> Superior (Z increasing upwards)
    const targetZ = header.isZDescending ? lodDepth - 1 - lz : lz;
    const dstSliceOffset = targetZ * (lodWidth * lodHeight);

    for (let ly = 0; ly < lodHeight; ly++) {
      const sy = ly * 2;
      const srcRow = sy * width;
      const dstRow = dstSliceOffset + ly * lodWidth;

      for (let lx = 0; lx < lodWidth; lx++) {
        const sx = lx * 2;
        const raw = rawSlice[srcRow + sx]!;
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
        lodData[dstRow + lx] = clamped;
        if (clamped < minHU) minHU = clamped;
        if (clamped > maxHU) maxHU = clamped;
      }
    }
  }

  return {
    id: `progressive-multiframe-lod-${Date.now()}`,
    dimensions: { width: lodWidth, height: lodHeight, depth: lodDepth },
    spacingMm: { x: lodSpacingX, y: lodSpacingY, z: lodSpacingZ },
    originMm: { x: -physicalWidthMm * 0.5, y: -physicalHeightMm * 0.5, z: -physicalDepthMm * 0.5 },
    physicalSizeMm: { x: physicalWidthMm, y: physicalHeightMm, z: physicalDepthMm },
    data: lodData,
    minHU: minHU === 32767 ? 0 : minHU,
    maxHU: maxHU === -32768 ? 0 : maxHU,
    rescaleSlope: header.rescaleSlope,
    rescaleIntercept: header.rescaleIntercept,
    defaultWindowWidth: header.windowWidth > 0 ? header.windowWidth : 4400,
    defaultWindowLevel: header.windowCenter !== 0 ? header.windowCenter : 1300,
    isProgressivePreview: true,
    lodLevel: 1,
    isDisposed: false,
  };
}

/**
 * Ingests a Multi-Frame Enhanced CT DICOM ArrayBuffer and produces a contiguous
 * CbctVoxelVolume in typed memory ready for 3D MPR reslicing.
 *
 * Supports zero-copy direct streaming into WebGL 3D textures (gl.texSubImage3D)
 * layer by layer without maintaining double intermediate buffers.
 */
export async function buildVolumeFromMultiFrameDicom(
  buffer: ArrayBuffer,
  options?: ((percent: number, message: string) => void) | MultiFrameVolumeIngestionOptions,
): Promise<CbctVoxelVolume> {
  const onProgress = typeof options === "function" ? options : options?.onProgress;
  const onSliceDecoded = typeof options === "object" ? options?.onSliceDecoded : undefined;
  const onProgressiveVolumeReady = typeof options === "object" ? options?.onProgressiveVolumeReady : undefined;
  const gpuTarget = typeof options === "object" ? options?.gpuUploadTarget : undefined;

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

  // Progressive LOD preview: if requested and series has >= 2 frames, emit 2x downsampled volume immediately (< 50ms)
  if (onProgressiveVolumeReady && depth >= 2) {
    try {
      const previewVol = generateMultiFrameProgressiveLodVolume(buffer, header);
      onProgressiveVolumeReady(previewVol);
    } catch (err) {
      console.warn("[dicomMultiFrameLoader] Failed to generate progressive LOD preview:", err);
    }
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

  // Pre-allocate unified typed Int16 buffer strictly once
  const voxelData = new Int16Array(totalVoxels);
  const slope = header.rescaleSlope;
  const intercept = header.rescaleIntercept;
  const isSigned = header.pixelRepresentation === 1;
  const bits = header.bitsAllocated;
  const bitsStored = header.bitsStored;

  // Zero-copy direct 3D Texture allocation if GPU target is provided
  let canDirectStreamGpu = false;
  if (gpuTarget?.gl && gpuTarget.texture) {
    const gl = gpuTarget.gl;
    if (typeof gl.isContextLost !== "function" || !gl.isContextLost()) {
      const max3dSize =
        (typeof gl.getParameter === "function" && gl.MAX_3D_TEXTURE_SIZE !== undefined
          ? (gl.getParameter(gl.MAX_3D_TEXTURE_SIZE) as number)
          : 2048) || 2048;

      if (width <= max3dSize && height <= max3dSize && depth <= max3dSize) {
        canDirectStreamGpu = true;
        gl.bindTexture(gl.TEXTURE_3D, gpuTarget.texture);
        if (typeof gl.pixelStorei === "function") {
          gl.pixelStorei(gl.UNPACK_ALIGNMENT, 2);
        }
        if (typeof gl.texParameteri === "function") {
          gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
          gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
          gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_WRAP_R, gl.CLAMP_TO_EDGE);
          gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
          gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
        }

        if (gpuTarget.allocateStorage !== false) {
          try {
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
          } catch (err) {
            console.warn("[dicomMultiFrameLoader] Direct GPU texture allocation failed:", err);
            canDirectStreamGpu = false;
          }
        }
      } else {
        console.warn(
          `[dicomMultiFrameLoader] Volume dimensions (${width}x${height}x${depth}) exceed GPU MAX_3D_TEXTURE_SIZE (${max3dSize}). Direct streaming skipped, deferred to downstream downsampling.`,
        );
      }
    }
  }

  let minVoxelHU = 32767;
  let maxVoxelHU = -32768;

  // Hoisted calibration invariants across all frames
  const isLinearInteger = slope === 1.0 && Math.floor(intercept) === intercept;
  const intIntercept = intercept | 0;
  const mask = bitsStored < 16 ? (1 << bitsStored) - 1 : 0xffff;
  const signBit = bitsStored < 16 ? 1 << (bitsStored - 1) : 0x8000;
  const signExt = bitsStored < 16 ? 1 << bitsStored : 0x10000;

  for (let z = 0; z < depth; z++) {
    const frameOffset = pixelDataOffset + z * frameByteLength;
    // Align orientation to Inferior -> Superior (Z increasing upwards)
    const targetZ = header.isZDescending ? depth - 1 - z : z;
    const baseIdx = targetZ * sliceVoxelCount;

    let localMin = minVoxelHU;
    let localMax = maxVoxelHU;

    if (bits === 16) {
      let rawSlice: Int16Array | Uint16Array;
      if (frameOffset % 2 === 0) {
        rawSlice = isSigned
          ? new Int16Array(buffer, frameOffset, sliceVoxelCount)
          : new Uint16Array(buffer, frameOffset, sliceVoxelCount);
      } else {
        const sliceBuf = buffer.slice(frameOffset, frameOffset + frameByteLength);
        const validEvenLength = sliceBuf.byteLength - (sliceBuf.byteLength % 2);
        const safeBuf = validEvenLength === sliceBuf.byteLength ? sliceBuf : sliceBuf.slice(0, validEvenLength);
        rawSlice = isSigned ? new Int16Array(safeBuf) : new Uint16Array(safeBuf);
      }

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
        // 12-bit / 14-bit masked detector path
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
      // 8-bit fallback
      const rawSlice = isSigned
        ? new Int8Array(buffer, frameOffset, sliceVoxelCount)
        : new Uint8Array(buffer, frameOffset, sliceVoxelCount);

      for (let i = 0; i < sliceVoxelCount; i++) {
        const raw = rawSlice[i] ?? 0;
        const hu = calibrateMultiFrameVoxel(raw, bitsStored, isSigned, slope, intercept);
        voxelData[baseIdx + i] = hu;
        if (hu < localMin) localMin = hu;
        if (hu > localMax) localMax = hu;
      }
    }

    minVoxelHU = localMin;
    maxVoxelHU = localMax;

    // Zero-copy direct streaming into WebGL 3D texture as frame arrives
    if (canDirectStreamGpu && gpuTarget?.gl && gpuTarget.texture) {
      const gl = gpuTarget.gl;
      if (typeof gl.isContextLost !== "function" || !gl.isContextLost()) {
        try {
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
            voxelData.subarray(baseIdx, baseIdx + sliceVoxelCount),
          );
        } catch {
          canDirectStreamGpu = false;
        }
      }
    }

    onSliceDecoded?.(targetZ, depth, voxelData.subarray(baseIdx, baseIdx + sliceVoxelCount));

    if (z % 16 === 0 || z === depth - 1) {
      const pct = 15 + Math.round(((z + 1) / depth) * 80);
      onProgress?.(pct, `Обработка кадра ${z + 1}/${depth} Multi-Frame CT...`);
      await yieldToEventLoop();
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
