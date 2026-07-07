import type { RepresentationPublicInput } from '../../types/SegmentationStateTypes';
export declare function addSegmentationRepresentations(viewportId: string, segmentationInputArray: RepresentationPublicInput[]): void;
declare function addContourRepresentationToViewport(viewportId: string, contourInputArray: RepresentationPublicInput[]): void;
declare function addContourRepresentationToViewportMap(viewportInputMap: {
    [viewportId: string]: RepresentationPublicInput[];
}): {};
declare function addLabelmapRepresentationToViewport(viewportId: string, labelmapInputArray: RepresentationPublicInput[]): void;
declare function addLabelmapRepresentationToViewportMap(viewportInputMap: {
    [viewportId: string]: RepresentationPublicInput[];
}): void;
declare function addSurfaceRepresentationToViewport(viewportId: string, surfaceInputArray: RepresentationPublicInput[]): void;
declare function addSurfaceRepresentationToViewportMap(viewportInputMap: {
    [viewportId: string]: RepresentationPublicInput[];
}): {};
export { addContourRepresentationToViewport, addLabelmapRepresentationToViewport, addSurfaceRepresentationToViewport, addContourRepresentationToViewportMap, addLabelmapRepresentationToViewportMap, addSurfaceRepresentationToViewportMap, };
