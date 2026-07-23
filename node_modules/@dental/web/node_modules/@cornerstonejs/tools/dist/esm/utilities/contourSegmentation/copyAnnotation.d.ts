import type { ContourSegmentationAnnotation } from '../../types';
export declare function copyAnnotation(annotation: ContourSegmentationAnnotation, segmentationId: string, segmentIndex: number): ContourSegmentationAnnotation;
export declare function copyContourSegment(segmentationId: string, segmentIndex: number, targetSegmentationId: string, targetSegmentIndex: number): void;
