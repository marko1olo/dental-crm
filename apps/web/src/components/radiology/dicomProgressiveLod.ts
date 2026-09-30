/**
 * dicomProgressiveLod.ts — Rapid Progressive LOD Generator for CBCT Ingestion
 *
 * Rapidly constructs an initial 2x downsampled LOD 1 volume in < 50ms
 * directly from raw slice buffers so 3D MPR planes are rendered immediately
 * while full-resolution streaming ingestion proceeds in background.
 */

import type { CbctVoxelVolume } from "./cbctMprMath";
import type { DicomSliceEntry, ParsedDicomSliceHeader } from "./dicomSliceHeaderParser";

export function generateProgressiveLodVolume(
  sliceEntries: readonly DicomSliceEntry[],
  refHeader: ParsedDicomSliceHeader,
  computedSpacingZ: number,
  flipX: boolean,
  flipY: boolean,
): CbctVoxelVolume {
  const width = refHeader.cols;
  const height = refHeader.rows;
  const depth = sliceEntries.length;

  const lodWidth = Math.max(1, Math.floor(width / 2));
  const lodHeight = Math.max(1, Math.floor(height / 2));
  const stepZ = depth >= 4 ? 2 : 1;
  const sampledIndices: number[] = [];
  for (let z = 0; z < depth; z += stepZ) {
    sampledIndices.push(z);
  }
  const lodDepth = sampledIndices.length;

  const physicalWidthMm = width * refHeader.pixelSpacing.x;
  const physicalHeightMm = height * refHeader.pixelSpacing.y;
  const physicalDepthMm = depth * computedSpacingZ;

  const lodSpacingX = refHeader.pixelSpacing.x * 2;
  const lodSpacingY = refHeader.pixelSpacing.y * 2;
  const lodSpacingZ = lodDepth > 1 ? physicalDepthMm / lodDepth : computedSpacingZ;

  const totalLodVoxels = lodWidth * lodHeight * lodDepth;
  const lodData = new Int16Array(totalLodVoxels);

  const isSigned = refHeader.pixelRepresentation === 1;
  const bitsStored = refHeader.bitsStored > 0 && refHeader.bitsStored <= 16 ? refHeader.bitsStored : 16;
  const slope = Number.isFinite(refHeader.rescaleSlope) && refHeader.rescaleSlope > 0 ? refHeader.rescaleSlope : 1.0;
  const intercept = Number.isFinite(refHeader.rescaleIntercept) ? refHeader.rescaleIntercept : 0.0;
  const isLinearInteger = slope === 1.0 && Math.floor(intercept) === intercept;
  const intIntercept = intercept | 0;
  const mask = bitsStored < 16 ? (1 << bitsStored) - 1 : 0xffff;
  const signBit = bitsStored < 16 ? 1 << (bitsStored - 1) : 0x8000;
  const signExt = bitsStored < 16 ? 1 << bitsStored : 0x10000;

  let minHU = 32767;
  let maxHU = -32768;

  const srcSliceVoxelCount = width * height;

  for (let lz = 0; lz < lodDepth; lz++) {
    const origZ = sampledIndices[lz]!;
    const entry = sliceEntries[origZ];
    if (!entry || !entry.buffer) continue;

    const offset = entry.header.pixelDataByteOffset;
    let rawSlice: Int16Array | Uint16Array;
    if (offset % 2 === 0 && entry.buffer.byteLength >= offset + srcSliceVoxelCount * 2) {
      rawSlice = isSigned
        ? new Int16Array(entry.buffer, offset, srcSliceVoxelCount)
        : new Uint16Array(entry.buffer, offset, srcSliceVoxelCount);
    } else {
      const sliceBuf = entry.buffer.slice(offset, offset + srcSliceVoxelCount * 2);
      const validEven = sliceBuf.byteLength - (sliceBuf.byteLength % 2);
      const safeBuf = validEven === sliceBuf.byteLength ? sliceBuf : sliceBuf.slice(0, validEven);
      rawSlice = isSigned ? new Int16Array(safeBuf) : new Uint16Array(safeBuf);
    }

    const dstSliceOffset = lz * (lodWidth * lodHeight);

    for (let ly = 0; ly < lodHeight; ly++) {
      const sy = ly * 2;
      const srcY = flipY ? height - 1 - sy : sy;
      const srcRow = srcY * width;
      const dstRow = dstSliceOffset + ly * lodWidth;

      for (let lx = 0; lx < lodWidth; lx++) {
        const sx = lx * 2;
        const srcX = flipX ? width - 1 - sx : sx;
        const raw = rawSlice[srcRow + srcX]!;
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
    id: `progressive-lod-${Date.now()}`,
    dimensions: { width: lodWidth, height: lodHeight, depth: lodDepth },
    spacingMm: { x: lodSpacingX, y: lodSpacingY, z: lodSpacingZ },
    originMm: { x: -physicalWidthMm * 0.5, y: -physicalHeightMm * 0.5, z: -physicalDepthMm * 0.5 },
    physicalSizeMm: { x: physicalWidthMm, y: physicalHeightMm, z: physicalDepthMm },
    data: lodData,
    minHU: minHU === 32767 ? 0 : minHU,
    maxHU: maxHU === -32768 ? 0 : maxHU,
    rescaleSlope: refHeader.rescaleSlope,
    rescaleIntercept: refHeader.rescaleIntercept,
    defaultWindowWidth: refHeader.windowWidth > 0 ? refHeader.windowWidth : 4400,
    defaultWindowLevel: refHeader.windowCenter !== 0 ? refHeader.windowCenter : 1300,
    imageOrientationPatient: refHeader.imageOrientationPatient,
    isFlippedX: flipX,
    isFlippedY: flipY,
    isProgressivePreview: true,
    lodLevel: 1,
    isDisposed: false,
  };
}
