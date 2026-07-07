declare function isSegmentIndexLocked(segmentationId: string, segmentIndex: number): boolean;
declare function setSegmentIndexLocked(segmentationId: string, segmentIndex: number, locked?: boolean): void;
declare function getLockedSegmentIndices(segmentationId: string): number[] | [];
export { isSegmentIndexLocked, setSegmentIndexLocked, getLockedSegmentIndices };
