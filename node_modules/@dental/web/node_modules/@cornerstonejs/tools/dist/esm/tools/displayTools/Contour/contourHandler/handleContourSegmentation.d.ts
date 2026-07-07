import type { Types, StackViewport } from '@cornerstonejs/core';
import type { ContourRepresentation } from '../../../../types/SegmentationStateTypes';
declare function handleContourSegmentation(viewport: StackViewport | Types.IVolumeViewport, geometryIds: string[], annotationUIDsMap: Map<number, Set<string>>, contourRepresentation: ContourRepresentation): void;
declare function addContourSetsToElement(viewport: StackViewport | Types.IVolumeViewport, geometryIds: string[], contourRepresentation: ContourRepresentation): void;
export { handleContourSegmentation, addContourSetsToElement };
