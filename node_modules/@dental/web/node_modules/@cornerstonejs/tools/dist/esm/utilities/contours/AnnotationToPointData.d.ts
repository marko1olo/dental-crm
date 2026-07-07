import type { Types } from '@cornerstonejs/core';
type ContourSequence = {
    NumberOfContourPoints: number;
    ContourImageSequence: Types.NormalModule[];
    ContourGeometricType: string;
    ContourData: string[];
};
type ContourSequenceProvider = {
    getContourSequence: (annotation: any, metadataProvider: any) => ContourSequence | ContourSequence[];
};
declare class AnnotationToPointData {
    static TOOL_NAMES: Record<string, ContourSequenceProvider>;
    constructor();
    static convert(annotation: any, segment: any, metadataProvider: any): {
        ReferencedROINumber: any;
        ROIDisplayColor: any;
        ContourSequence: ContourSequence[];
    };
    static register(toolClass: any): void;
}
export default AnnotationToPointData;
