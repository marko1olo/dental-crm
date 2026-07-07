import { SegmentationRepresentations } from '../../enums';
import { internalAddSegmentationRepresentation } from './internalAddSegmentationRepresentation';
export function addSegmentationRepresentations(viewportId, segmentationInputArray) {
    segmentationInputArray.map((segmentationInput) => {
        return internalAddSegmentationRepresentation(viewportId, segmentationInput);
    });
}
function addContourRepresentationToViewport(viewportId, contourInputArray) {
    return addSegmentationRepresentations(viewportId, contourInputArray.map((input) => ({
        ...input,
        type: SegmentationRepresentations.Contour,
    })));
}
function addContourRepresentationToViewportMap(viewportInputMap) {
    const results = {};
    for (const [viewportId, inputArray] of Object.entries(viewportInputMap)) {
        results[viewportId] = addContourRepresentationToViewport(viewportId, inputArray);
    }
    return results;
}
function addLabelmapRepresentationToViewport(viewportId, labelmapInputArray) {
    return addSegmentationRepresentations(viewportId, labelmapInputArray.map((input) => ({
        ...input,
        type: SegmentationRepresentations.Labelmap,
    })));
}
function addLabelmapRepresentationToViewportMap(viewportInputMap) {
    const results = {};
    for (const [viewportId, inputArray] of Object.entries(viewportInputMap)) {
        results[viewportId] = addLabelmapRepresentationToViewport(viewportId, inputArray.map((input) => ({
            ...input,
            type: SegmentationRepresentations.Labelmap,
        })));
    }
}
function addSurfaceRepresentationToViewport(viewportId, surfaceInputArray) {
    return addSegmentationRepresentations(viewportId, surfaceInputArray.map((input) => ({
        ...input,
        type: SegmentationRepresentations.Surface,
    })));
}
function addSurfaceRepresentationToViewportMap(viewportInputMap) {
    const results = {};
    for (const [viewportId, inputArray] of Object.entries(viewportInputMap)) {
        results[viewportId] = addSurfaceRepresentationToViewport(viewportId, inputArray);
    }
    return results;
}
export { addContourRepresentationToViewport, addLabelmapRepresentationToViewport, addSurfaceRepresentationToViewport, addContourRepresentationToViewportMap, addLabelmapRepresentationToViewportMap, addSurfaceRepresentationToViewportMap, };
