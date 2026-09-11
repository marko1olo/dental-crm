/**
 * packages/shared/src/imaging/volumeImporters/index.ts
 * Unified exports for Native Non-DICOM Volume Importers (Sirona Galileos & Morita OneVolume).
 */

import { matchGalileos, parseGalileos } from "./galileosImporter.js";
import { matchOneVolume, parseOneVolume } from "./oneVolumeImporter.js";
import { NamedBuffer, NonDicomFormat, RawVolume } from "./types.js";

export * from "./types.js";
export * from "./gzipHelper.js";
export * from "./galileosImporter.js";
export * from "./oneVolumeImporter.js";

/**
 * Detects whether the input file list matches any supported non-DICOM volume format.
 */
export function detectVolumeFormat(files: { name: string }[]): NonDicomFormat | null {
  if (matchGalileos(files)) return "galileos";
  if (matchOneVolume(files)) return "onevolume";
  return null;
}

/**
 * Automatically detects and parses a supported non-DICOM volume folder/file set.
 * Throws if the format is unrecognized or invalid.
 */
export async function parseNonDicomVolume(
  files: NamedBuffer[],
  onProgress?: (pct: number) => void
): Promise<RawVolume> {
  const format = detectVolumeFormat(files);
  if (!format) {
    throw new Error(
      "Unrecognized volume format. Expected Sirona Galileos (*_vol_0) or Morita OneVolume (CT_0.vol)"
    );
  }

  if (format === "galileos") {
    return parseGalileos(files, onProgress);
  }

  return parseOneVolume(files, onProgress);
}
