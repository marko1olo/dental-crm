/**
 * packages/shared/src/imaging/volumeImporters/galileosImporter.ts
 * Native Sirona Galileos CBCT Volume Importer.
 * Reverse-engineered from DenCT (Dental-CBCT-Viewer).
 * Handles *_vol_0 XML header + *_vol_0_### uint16 slices.
 */

import { extractBaseName, safeGunzip } from "./gzipHelper.js";
import {
  GalileosHeaderMetadataSchema,
  NamedBuffer,
  RawVolume,
  VOLUME_IMPORT_LIMITS,
} from "./types.js";

const VOL0_PATTERN = /_vol_0$/i;
const VOL0_SLICE_PATTERN = /_vol_0_(\d+)$/i;

/**
 * Checks if a collection of filenames represents a Sirona Galileos export.
 * Requires both the *_vol_0 header and at least one *_vol_0_### slice file.
 */
export function matchGalileos(files: { name: string }[]): boolean {
  const hasHeader = files.some((f) => VOL0_PATTERN.test(extractBaseName(f.name)));
  const hasSlice = files.some((f) => VOL0_SLICE_PATTERN.test(extractBaseName(f.name)));
  return hasHeader && hasSlice;
}

/**
 * Parses XML text from the Sirona Galileos header.
 */
export function parseGalileosHeader(xml: string, sliceCount: number) {
  const warnings: string[] = [];

  const extractNumber = (re: RegExp, defaultValue: number, label: string): number => {
    const match = xml.match(re);
    const m1 = match?.[1];
    const val = m1 !== undefined ? parseFloat(m1) : NaN;
    if (!Number.isFinite(val)) {
      warnings.push(`${label} missing from header — assuming ${defaultValue}`);
      return defaultValue;
    }
    return val;
  };

  const cols = Math.round(
    extractNumber(/(?:sizex|columns|width|dimx|nx)\D{0,4}(\d+)/i, 512, "columns")
  );
  const rows = Math.round(
    extractNumber(/(?:sizey|rows|height|dimy|ny)\D{0,4}(\d+)/i, 512, "rows")
  );
  const rawSpacing = extractNumber(
    /(?:voxelsize|spacing|resolution|pixelsize)\D{0,6}([0-9]*\.?[0-9]+)/i,
    0.16,
    "voxel size"
  );
  const maxValue = Math.round(
    extractNumber(/(?:maxvalue|rangemax|max)\D{0,6}(\d+)/i, 4095, "max value")
  );

  const spacing = rawSpacing > 0 && rawSpacing < 5 ? rawSpacing : 0.16;
  if (spacing !== rawSpacing) {
    warnings.push(`implausible voxel size ${rawSpacing} — assuming 0.16 mm`);
  }

  // Extract optional patient identifiers
  const patientNameMatch = xml.match(/<(?:patient_?name|patient)[^>]*>\s*([^<]+?)\s*</i);
  const patientIdMatch = xml.match(/<(?:patient_?id|id)[^>]*>\s*([^<]+?)\s*</i);

  const parsed = {
    cols,
    rows,
    depth: sliceCount,
    spacing,
    maxValue,
    patientName: patientNameMatch?.[1]?.trim(),
    patientId: patientIdMatch?.[1]?.trim(),
    warnings,
  };

  return GalileosHeaderMetadataSchema.parse(parsed);
}

/**
 * Parses and builds a contiguous RawVolume from Sirona Galileos files.
 */
export async function parseGalileos(
  files: NamedBuffer[],
  onProgress?: (pct: number) => void
): Promise<RawVolume> {
  const headerFile = files.find((f) => VOL0_PATTERN.test(extractBaseName(f.name)));
  const sliceFiles = files
    .filter((f) => VOL0_SLICE_PATTERN.test(extractBaseName(f.name)))
    .sort((a, b) => {
      const idxA = Number(extractBaseName(a.name).match(VOL0_SLICE_PATTERN)![1]);
      const idxB = Number(extractBaseName(b.name).match(VOL0_SLICE_PATTERN)![1]);
      return idxA - idxB;
    });

  if (!headerFile || sliceFiles.length === 0) {
    throw new Error("GALILEOS: missing *_vol_0 header or slice files");
  }

  const decompressedHeader = await safeGunzip(
    headerFile.buffer,
    VOLUME_IMPORT_LIMITS.HEADER_BUDGET
  );
  const xml = new TextDecoder("utf-8").decode(decompressedHeader);
  const meta = parseGalileosHeader(xml, sliceFiles.length);

  const { cols, rows, depth, spacing, maxValue, patientName, patientId, warnings } = meta;

  // Geometry validation
  if (
    cols < 1 ||
    rows < 1 ||
    cols > VOLUME_IMPORT_LIMITS.MAX_AXIS ||
    rows > VOLUME_IMPORT_LIMITS.MAX_AXIS
  ) {
    throw new Error(
      `GALILEOS: implausible dimensions ${cols}x${rows} (per-axis limit ${VOLUME_IMPORT_LIMITS.MAX_AXIS})`
    );
  }
  if (depth > VOLUME_IMPORT_LIMITS.MAX_DEPTH) {
    throw new Error(
      `GALILEOS: implausible depth ${depth} (limit ${VOLUME_IMPORT_LIMITS.MAX_DEPTH})`
    );
  }
  const totalVoxels = cols * rows * depth;
  if (totalVoxels > VOLUME_IMPORT_LIMITS.MAX_VOXELS) {
    throw new Error(
      `GALILEOS: volume ${cols}x${rows}x${depth} exceeds the ${VOLUME_IMPORT_LIMITS.MAX_VOXELS} voxel limit`
    );
  }

  const sliceLen = cols * rows;
  const sliceBudget = sliceLen * 2 + 4096;
  const volumeData = new Int16Array(totalVoxels);

  let minFound = 32767;
  let maxFound = -32768;

  for (let k = 0; k < sliceFiles.length; k++) {
    const sliceFile = sliceFiles[k];
    if (!sliceFile) continue;
    const sliceBuf = await safeGunzip(sliceFile.buffer, sliceBudget);
    if (sliceBuf.byteLength < sliceLen * 2) {
      throw new Error(
        `GALILEOS: slice ${extractBaseName(sliceFile.name)} too short — header declares ${cols}x${rows} ` +
          `(${sliceLen * 2} bytes) but decompressed payload has ${sliceBuf.byteLength} bytes`
      );
    }

    // uint16 samples (12-bit unsigned 0..4095 fits cleanly into Int16)
    const uint16View = new Uint16Array(
      sliceBuf.buffer,
      sliceBuf.byteOffset,
      sliceLen
    );

    const sliceOffset = k * sliceLen;
    for (let i = 0; i < sliceLen; i++) {
      const val = uint16View[i] ?? 0;
      volumeData[sliceOffset + i] = val;
      if (val < minFound) minFound = val;
      if (val > maxFound) maxFound = val;
    }

    onProgress?.(Math.round(((k + 1) / sliceFiles.length) * 85));
  }

  return {
    data: volumeData,
    dimensions: [cols, rows, depth],
    spacing: [spacing, spacing, spacing],
    origin: [
      -(cols * spacing) / 2,
      -(rows * spacing) / 2,
      -(depth * spacing) / 2,
    ],
    windowCenter: Math.round(maxValue * 0.35),
    windowWidth: maxValue,
    modality: "CT",
    minValue: minFound === 32767 ? 0 : minFound,
    maxValue: maxFound === -32768 ? maxValue : maxFound,
    patientName,
    patientId,
    seriesDescription: "GALILEOS CBCT",
    warnings: warnings.length > 0 ? warnings : undefined,
    format: "galileos",
  };
}
