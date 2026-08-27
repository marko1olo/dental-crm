/**
 * ═══════════════════════════════════════════════════════════════════════════
 * CLINICAL DICOM PARSER & METADATA EXTRACTOR
 * High-performance binary parser for dental radiography & CBCT slices
 * ═══════════════════════════════════════════════════════════════════════════
 */
export interface VoxelSpacing3D {
    readonly x: number;
    readonly y: number;
    readonly z: number;
}
export interface ParsedDicomDataset {
    readonly patientId: string | null;
    readonly patientName: string | null;
    readonly modality: string | null;
    readonly studyInstanceUid: string | null;
    readonly seriesInstanceUid: string | null;
    readonly sopInstanceUid: string | null;
    readonly studyDate: string | null;
    readonly studyDescription: string | null;
    readonly seriesDescription: string | null;
    readonly instanceNumber: number | null;
    readonly rows: number;
    readonly columns: number;
    readonly bitsAllocated: number;
    readonly bitsStored: number;
    readonly highBit: number;
    readonly pixelRepresentation: number;
    readonly samplesPerPixel: number;
    readonly pixelSpacing: readonly [number, number];
    readonly sliceThickness: number;
    readonly sliceLocation: number | null;
    readonly imagePositionPatient: readonly [number, number, number] | null;
    readonly imageOrientationPatient: readonly [number, number, number, number, number, number] | null;
    readonly rescaleIntercept: number;
    readonly rescaleSlope: number;
    readonly windowCenter: number;
    readonly windowWidth: number;
    readonly photometricInterpretation: string;
    readonly voxelSpacing: VoxelSpacing3D;
    readonly hasPreamble: boolean;
    readonly transferSyntaxUid: string | null;
    readonly warnings: readonly string[];
}
export declare const LONG_EXPLICIT_VRS: ReadonlySet<string>;
export declare function cleanDicomString(bytes: Uint8Array): string | null;
export declare function parseDicomNumber(value: string | null): number | null;
export declare function parseMultiNumber(value: string | null, delimiter?: string): number[];
export declare function formatTagHex(group: number, element: number): string;
/**
 * Parses binary DICOM data buffer (Uint8Array or Buffer) and extracts clinical imaging metadata.
 */
export declare function parseDicomDataset(input: Uint8Array | ArrayBuffer): ParsedDicomDataset;
/**
 * Converts raw DICOM pixel value to calibrated Hounsfield Unit (HU).
 */
export declare function rawPixelToHounsfieldUnit(rawPixel: number, rescaleSlope?: number, rescaleIntercept?: number): number;
