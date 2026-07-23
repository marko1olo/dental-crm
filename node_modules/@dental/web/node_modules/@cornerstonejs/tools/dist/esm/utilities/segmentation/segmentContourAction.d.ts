import { type Types } from '@cornerstonejs/core';
export type Segment = {
    segmentationId: string;
    segmentIndex: number;
    label: string;
    style?: Record<string, unknown>;
    containedSegmentIndices?: (number: any) => boolean;
};
export type SegmentContourActionConfiguration = {
    getSegment?: (enabledElement: Types.IEnabledElement, configuration: SegmentContourActionConfiguration) => Segment;
    segmentationId?: string;
    segmentIndex?: number;
    segmentData?: Map<number, Segment>;
    toolGroupId?: string;
};
export default function segmentContourAction(element: HTMLDivElement, configuration: any): Promise<any>;
export declare function defaultGetSegment(enabledElement: Types.IEnabledElement, configuration: SegmentContourActionConfiguration): Segment;
