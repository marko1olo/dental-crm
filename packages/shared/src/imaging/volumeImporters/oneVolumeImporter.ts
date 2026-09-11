/**
 * packages/shared/src/imaging/volumeImporters/oneVolumeImporter.ts
 * Native Morita OneVolume CBCT Container (CT_0.vol) Importer.
 * Reverse-engineered from DenCT (Dental-CBCT-Viewer).
 * Handles JmVolumeVersion=1 marker, little-endian XML header,
 * CArray3D bounds block, -32768 sentinel mapping to -1000 HU,
 * and linear int16 HU calibration.
 */

import { extractBaseName } from "./gzipHelper.js";
import {
  NamedBuffer,
  OneVolumeHeaderMetadataSchema,
  RawVolume,
  VOLUME_IMPORT_LIMITS,
} from "./types.js";

const CT_VOL_PATTERN = /(^|\/)CT_0\.vol$/i;
const VERSION_MARKER = "JmVolumeVersion=1";

/**
 * Checks if any of the provided files is a Morita OneVolume CT_0.vol file.
 */
export function matchOneVolume(files: { name: string }[]): boolean {
  return files.some((f) => CT_VOL_PATTERN.test(extractBaseName(f.name)));
}

/**
 * Parses XML text from the Morita OneVolume header.
 */
export function parseOneVolumeHeader(xml: string) {
  const warnings: string[] = [];

  const extractNumber = (re: RegExp, defaultValue: number, label: string): number => {
    const match = xml.match(re);
    const m1 = match?.[1];
    const val = m1 !== undefined ? parseFloat(m1) : NaN;
    if (!Number.isFinite(val)) {
      warnings.push(`${label} missing from OneVolume header — assuming ${defaultValue}`);
      return defaultValue;
    }
    return val;
  };

  const cols = Math.round(
    extractNumber(/(?:sizex|columns|width|dimx|nx)\D{0,4}(\d+)/i, 0, "columns")
  );
  const rows = Math.round(
    extractNumber(/(?:sizey|rows|height|dimy|ny)\D{0,4}(\d+)/i, 0, "rows")
  );
  const depth = Math.round(
    extractNumber(/(?:sizez|slices|depth|dimz|nz)\D{0,4}(\d+)/i, 0, "depth")
  );
  const rawSpacing = extractNumber(
    /(?:voxelsize|spacing|gridspacing|resolution|pixelsize)\D{0,6}([0-9]*\.?[0-9]+)/i,
    0.125,
    "grid spacing"
  );
  const slope = extractNumber(
    /(?:slope|rescaleslope)[^0-9\-+]{0,6}([0-9]*\.?[0-9]+)/i,
    1,
    "rescale slope"
  );
  const intercept = extractNumber(
    /(?:intercept|rescaleintercept)[^0-9\-+]{0,6}(-?[0-9]*\.?[0-9]+)/i,
    0,
    "rescale intercept"
  );

  const spacing = rawSpacing > 0 && rawSpacing < 5 ? rawSpacing : 0.125;
  if (spacing !== rawSpacing) {
    warnings.push(`implausible voxel spacing ${rawSpacing} — assuming 0.125 mm`);
  }

  // Patient metadata if present
  const patientNameMatch = xml.match(/<(?:patient_?name|patient)[^>]*>\s*([^<]+?)\s*</i);
  const patientIdMatch = xml.match(/<(?:patient_?id|id)[^>]*>\s*([^<]+?)\s*</i);

  const parsed = {
    cols,
    rows,
    depth,
    spacing,
    slope,
    intercept,
    windowCenter: 300,
    windowWidth: 2500,
    patientName: patientNameMatch?.[1]?.trim(),
    patientId: patientIdMatch?.[1]?.trim(),
    warnings,
  };

  return OneVolumeHeaderMetadataSchema.parse(parsed);
}

/**
 * Parses and builds a contiguous RawVolume from Morita CT_0.vol binary buffer.
 */
export async function parseOneVolume(
  input: NamedBuffer | NamedBuffer[],
  onProgress?: (pct: number) => void
): Promise<RawVolume> {
  const file = Array.isArray(input)
    ? input.find((f) => CT_VOL_PATTERN.test(extractBaseName(f.name)))
    : input;

  if (!file) {
    throw new Error("OneVolume: CT_0.vol not found");
  }

  const rawBytes = file.buffer;
  const byteLength = rawBytes.byteLength;
  const dv = new DataView(rawBytes.buffer, rawBytes.byteOffset, byteLength);

  // Search for the JmVolumeVersion=1 marker in the first 512 bytes
  const headerPreview = new TextDecoder("latin1").decode(
    rawBytes.subarray(0, Math.min(512, byteLength))
  );
  const versionIndex = headerPreview.indexOf(VERSION_MARKER);
  if (versionIndex < 0) {
    throw new Error("OneVolume: version marker 'JmVolumeVersion=1' not found");
  }

  let offset = versionIndex + VERSION_MARKER.length;
  if (offset < byteLength && dv.getUint8(offset) === 0) {
    offset += 1; // skip optional null terminator
  }

  if (offset + 4 > byteLength) {
    throw new Error("OneVolume: unexpected end of buffer before XML length");
  }

  const xmlLen = dv.getUint32(offset, true);
  offset += 4;

  if (xmlLen <= 0 || offset + xmlLen > byteLength) {
    throw new Error(`OneVolume: invalid XML payload length (${xmlLen} bytes)`);
  }

  const xmlBytes = rawBytes.subarray(offset, offset + xmlLen);
  const xml = new TextDecoder("utf-8").decode(xmlBytes);
  offset += xmlLen;

  // 36-byte CArray3D bounds block
  const CARRAY3D_BOUNDS_SIZE = 36;
  if (offset + CARRAY3D_BOUNDS_SIZE > byteLength) {
    throw new Error("OneVolume: buffer truncated before CArray3D bounds block");
  }
  offset += CARRAY3D_BOUNDS_SIZE;

  const meta = parseOneVolumeHeader(xml);
  const { cols, rows, spacing, slope, intercept, windowCenter, windowWidth, patientName, patientId, warnings } = meta;
  let depth = meta.depth;

  if (!cols || !rows) {
    throw new Error("OneVolume: could not read dimensions from header");
  }
  if (
    cols > VOLUME_IMPORT_LIMITS.MAX_AXIS ||
    rows > VOLUME_IMPORT_LIMITS.MAX_AXIS
  ) {
    throw new Error(
      `OneVolume: implausible dimensions ${cols}x${rows} (per-axis limit ${VOLUME_IMPORT_LIMITS.MAX_AXIS})`
    );
  }

  const remainingBytes = byteLength - offset;
  const availSamples = remainingBytes >> 1; // 2 bytes per int16 sample

  if (!depth || depth === 0) {
    depth = Math.floor(availSamples / (cols * rows));
  }

  if (depth < 1) {
    throw new Error("OneVolume: no slice data found in payload");
  }
  if (depth > VOLUME_IMPORT_LIMITS.MAX_DEPTH) {
    throw new Error(
      `OneVolume: implausible depth ${depth} (limit ${VOLUME_IMPORT_LIMITS.MAX_DEPTH})`
    );
  }

  const totalVoxels = cols * rows * depth;
  if (totalVoxels > VOLUME_IMPORT_LIMITS.MAX_VOXELS) {
    throw new Error(
      `OneVolume: volume ${cols}x${rows}x${depth} exceeds the ${VOLUME_IMPORT_LIMITS.MAX_VOXELS} voxel limit`
    );
  }
  if (availSamples < totalVoxels) {
    throw new Error(
      `OneVolume: payload too short — header declares ${cols}x${rows}x${depth} ` +
        `(${totalVoxels} voxels) but only ${availSamples} samples remain`
    );
  }

  // Safe little-endian int16 decoding handling potential odd byte alignment
  const volumeData = new Int16Array(totalVoxels);
  let minFound = 32767;
  let maxFound = -32768;

  // Read samples with DataView to guarantee correct byte-order and alignment
  const payloadDataView = new DataView(rawBytes.buffer, rawBytes.byteOffset + offset, totalVoxels * 2);

  const reportInterval = Math.max(1, Math.floor(totalVoxels / 20));

  for (let i = 0; i < totalVoxels; i++) {
    const rawVal = payloadDataView.getInt16(i * 2, true);

    let calibratedVal: number;
    if (rawVal === VOLUME_IMPORT_LIMITS.ONEVOLUME_SENTINEL_RAW) {
      calibratedVal = VOLUME_IMPORT_LIMITS.BACKGROUND_SENTINEL_HU;
    } else {
      calibratedVal = Math.round(rawVal * slope + intercept);
      if (calibratedVal < -32768) calibratedVal = -32768;
      else if (calibratedVal > 32767) calibratedVal = 32767;
    }

    volumeData[i] = calibratedVal;

    if (rawVal !== VOLUME_IMPORT_LIMITS.ONEVOLUME_SENTINEL_RAW) {
      if (calibratedVal < minFound) minFound = calibratedVal;
      if (calibratedVal > maxFound) maxFound = calibratedVal;
    }

    if (i % reportInterval === 0 && onProgress) {
      onProgress(Math.round((i / totalVoxels) * 85));
    }
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
    windowCenter,
    windowWidth,
    modality: "CT",
    minValue: minFound === 32767 ? -1000 : minFound,
    maxValue: maxFound === -32768 ? 2000 : maxFound,
    patientName,
    patientId,
    seriesDescription: "OneVolume CT",
    warnings: warnings.length > 0 ? warnings : undefined,
    format: "onevolume",
  };
}
