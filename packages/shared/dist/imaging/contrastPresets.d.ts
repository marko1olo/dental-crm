/**
 * ═══════════════════════════════════════════════════════════════════════════
 * RADIOGRAPHY CONTRAST & WINDOW WIDTH / WINDOW LEVEL (WW/WL) PRESETS
 * Bone, Soft Tissue, Enamel/Dentine & Nerve/Sinus HU Presets
 * ═══════════════════════════════════════════════════════════════════════════
 */
export type DicomContrastPresetKey = "bone" | "soft_tissue" | "enamel" | "nerve_sinus" | "wide_range";
export interface DicomContrastPreset {
    readonly id: DicomContrastPresetKey;
    readonly labelRu: string;
    readonly windowWidth: number;
    readonly windowCenter: number;
    readonly descriptionRu: string;
    readonly optimalFor: string;
}
export declare const DICOM_CONTRAST_PRESETS: Record<DicomContrastPresetKey, DicomContrastPreset>;
export declare const DICOM_CONTRAST_PRESET_LIST: readonly DicomContrastPreset[];
/**
 * Converts a Hounsfield Unit (HU) value to an 8-bit grayscale intensity (0..255).
 */
export declare function huToGrayscale8Bit(hu: number, windowWidth: number, windowCenter: number, invert?: boolean): number;
/**
 * Builds a 256-element Look-Up Table (LUT) for rapid shader/canvas contrast mapping.
 */
export declare function buildContrastLUT(options: {
    readonly windowWidth: number;
    readonly windowCenter: number;
    readonly invert?: boolean;
    readonly gamma?: number;
}): Uint8Array;
