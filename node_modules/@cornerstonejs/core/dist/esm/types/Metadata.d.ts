import type { VOI } from './voi';
interface Metadata {
    BitsAllocated: number;
    BitsStored: number;
    SamplesPerPixel: number;
    HighBit: number;
    PhotometricInterpretation: string;
    PixelRepresentation: number;
    Modality: string;
    SeriesInstanceUID?: string;
    ImageOrientationPatient: number[];
    PixelSpacing: number[];
    FrameOfReferenceUID: string;
    Columns: number;
    Rows: number;
    voiLut: VOI[];
    VOILUTFunction: string;
}
export type { Metadata as default };
