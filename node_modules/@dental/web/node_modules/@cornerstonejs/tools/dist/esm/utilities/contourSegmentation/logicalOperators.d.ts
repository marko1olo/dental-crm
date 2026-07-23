export type SegmentInfo = {
    segmentationId: string;
    segmentIndex: number;
    label?: string;
    color?: string;
};
export type OperatorOptions = SegmentInfo;
export declare enum LogicalOperation {
    Union = 0,
    Subtract = 1,
    Intersect = 2,
    XOR = 3,
    Copy = 4,
    Delete = 5
}
export declare function add(segment1: SegmentInfo, segment2: SegmentInfo, options: OperatorOptions): void;
export declare function subtract(segment1: SegmentInfo, segment2: SegmentInfo, options: OperatorOptions): void;
export declare function intersect(segment1: SegmentInfo, segment2: SegmentInfo, options: OperatorOptions): void;
export declare function xor(segment1: SegmentInfo, segment2: SegmentInfo, options: OperatorOptions): void;
export declare function copy(segment: SegmentInfo, options: OperatorOptions): void;
export declare function deleteOperation(segment: SegmentInfo): void;
