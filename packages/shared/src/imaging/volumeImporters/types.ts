/**
 * packages/shared/src/imaging/volumeImporters/types.ts
 * Type definitions and Zod schemas for Native Non-DICOM CBCT Volume Importers
 * (Sirona Galileos and Morita OneVolume).
 * Reverse-engineered from DenCT / Dental-CBCT-Viewer.
 */

import { z } from "zod";

/** Dimensions: [cols, rows, depth] */
export const RawVolumeDimensionsSchema = z.tuple([
  z.number().int().positive(),
  z.number().int().positive(),
  z.number().int().positive(),
]);
export type RawVolumeDimensions = z.infer<typeof RawVolumeDimensionsSchema>;

/** Voxel spacing in mm: [sx, sy, sz] */
export const RawVolumeSpacingSchema = z.tuple([
  z.number().positive(),
  z.number().positive(),
  z.number().positive(),
]);
export type RawVolumeSpacing = z.infer<typeof RawVolumeSpacingSchema>;

/** Origin in mm: [ox, oy, oz] */
export const RawVolumeOriginSchema = z.tuple([
  z.number(),
  z.number(),
  z.number(),
]);
export type RawVolumeOrigin = z.infer<typeof RawVolumeOriginSchema>;

/** Supported non-DICOM import formats */
export const NonDicomFormatSchema = z.enum(["galileos", "onevolume"]);
export type NonDicomFormat = z.infer<typeof NonDicomFormatSchema>;

/** Parsed metadata for Sirona Galileos header */
export const GalileosHeaderMetadataSchema = z.object({
  cols: z.number().int().positive(),
  rows: z.number().int().positive(),
  depth: z.number().int().positive(),
  spacing: z.number().positive(),
  maxValue: z.number().int().nonnegative(),
  patientName: z.string().optional(),
  patientId: z.string().optional(),
  warnings: z.array(z.string()),
});
export type GalileosHeaderMetadata = z.infer<typeof GalileosHeaderMetadataSchema>;

/** Parsed metadata for Morita OneVolume header */
export const OneVolumeHeaderMetadataSchema = z.object({
  cols: z.number().int().positive(),
  rows: z.number().int().positive(),
  depth: z.number().int().nonnegative(),
  spacing: z.number().positive(),
  slope: z.number(),
  intercept: z.number(),
  windowCenter: z.number(),
  windowWidth: z.number(),
  patientName: z.string().optional(),
  patientId: z.string().optional(),
  warnings: z.array(z.string()),
});
export type OneVolumeHeaderMetadata = z.infer<typeof OneVolumeHeaderMetadataSchema>;

/** Decoded raw volume payload for rendering and slice projection */
export interface RawVolume {
  /** int16 scalar values, slice-major: slice k occupies [k*cols*rows .. (k+1)*cols*rows) */
  data: Int16Array;
  /** [cols, rows, depth] */
  dimensions: RawVolumeDimensions;
  /** [sx, sy, sz] mm */
  spacing: RawVolumeSpacing;
  /** [ox, oy, oz] mm coordinates */
  origin?: RawVolumeOrigin | undefined;
  windowCenter: number;
  windowWidth: number;
  modality: "CT";
  minValue: number;
  maxValue: number;
  patientName?: string | undefined;
  patientId?: string | undefined;
  seriesDescription?: string | undefined;
  warnings?: string[] | undefined;
  format: NonDicomFormat;
}

/** Named buffer input representation for platform-agnostic file loading */
export interface NamedBuffer {
  name: string;
  buffer: Uint8Array;
}

/** Geometry validation limits (DenCT standards) */
export const VOLUME_IMPORT_LIMITS = {
  MAX_AXIS: 2048,
  MAX_DEPTH: 2000,
  MAX_VOXELS: 2 ** 30,
  HEADER_BUDGET: 1024 * 1024, // 1 MB
  BACKGROUND_SENTINEL_HU: -1000,
  ONEVOLUME_SENTINEL_RAW: -32768,
} as const;
