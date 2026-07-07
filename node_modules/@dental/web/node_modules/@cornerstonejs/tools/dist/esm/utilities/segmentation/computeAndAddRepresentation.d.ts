import type { SegmentationRepresentations } from '../../enums';
declare function computeAndAddRepresentation<T>(segmentationId: string, type: SegmentationRepresentations, computeFunction: () => Promise<T>, onComputationComplete?: () => void): Promise<T>;
export { computeAndAddRepresentation };
