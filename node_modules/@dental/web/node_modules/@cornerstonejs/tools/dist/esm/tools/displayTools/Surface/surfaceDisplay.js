import { cache, getEnabledElementByViewportId } from '@cornerstonejs/core';
import Representations from '../../../enums/SegmentationRepresentations';
import removeSurfaceFromElement from './removeSurfaceFromElement';
import addOrUpdateSurfaceToElement from './addOrUpdateSurfaceToElement';
import { getSegmentation } from '../../../stateManagement/segmentation/getSegmentation';
import { getColorLUT } from '../../../stateManagement/segmentation/getColorLUT';
import { getPolySeg } from '../../../config';
import { computeAndAddRepresentation } from '../../../utilities/segmentation/computeAndAddRepresentation';
import { internalGetHiddenSegmentIndices } from '../../../stateManagement/segmentation/helpers/internalGetHiddenSegmentIndices';
function removeRepresentation(viewportId, segmentationId, renderImmediate = false) {
    const enabledElement = getEnabledElementByViewportId(viewportId);
    if (!enabledElement) {
        return;
    }
    const { viewport } = enabledElement;
    removeSurfaceFromElement(viewport.element, segmentationId);
    if (!renderImmediate) {
        return;
    }
    viewport.render();
}
async function render(viewport, representation) {
    const { segmentationId, type } = representation;
    const segmentation = getSegmentation(segmentationId);
    if (!segmentation) {
        return;
    }
    let SurfaceData = segmentation.representationData[Representations.Surface];
    if (!SurfaceData &&
        getPolySeg()?.canComputeRequestedRepresentation(segmentationId, Representations.Surface)) {
        const polySeg = getPolySeg();
        SurfaceData = await computeAndAddRepresentation(segmentationId, Representations.Surface, () => polySeg.computeSurfaceData(segmentationId, { viewport }));
        if (!SurfaceData) {
            throw new Error(`No Surface data found for segmentationId ${segmentationId} even we tried to compute it`);
        }
    }
    else if (!SurfaceData && !getPolySeg()) {
        console.debug(`No surface data found for segmentationId ${segmentationId} and PolySeg add-on is not configured. Unable to convert from other representations to surface. Please register PolySeg using cornerstoneTools.init({ addons: { polySeg } }) to enable automatic conversion.`);
    }
    if (!SurfaceData) {
        console.warn(`No Surface data found for segmentationId ${segmentationId}. Skipping render.`);
        return;
    }
    const { geometryIds } = SurfaceData;
    if (!geometryIds?.size) {
        console.warn(`No Surfaces found for segmentationId ${segmentationId}. Skipping render.`);
    }
    const { colorLUTIndex } = representation;
    const colorLUT = getColorLUT(colorLUTIndex);
    const surfaces = [];
    geometryIds.forEach((geometryId) => {
        const geometry = cache.getGeometry(geometryId);
        if (!geometry?.data) {
            console.warn(`No Surfaces found for geometryId ${geometryId}. Skipping render.`);
            return;
        }
        const { segmentIndex } = geometry.data;
        const hiddenSegments = internalGetHiddenSegmentIndices(viewport.id, {
            segmentationId,
            type,
        });
        const isHidden = hiddenSegments.has(segmentIndex);
        const surface = geometry.data;
        const color = colorLUT[segmentIndex];
        surface.color = color.slice(0, 3);
        surface.visible = !isHidden;
        surfaces.push(surface);
        addOrUpdateSurfaceToElement(viewport, surface, segmentationId);
    });
    viewport.render();
}
function getUpdateFunction(viewport) {
    const polySeg = getPolySeg();
    return (segmentationId) => polySeg.updateSurfaceData(segmentationId, { viewport });
}
export default {
    getUpdateFunction,
    render,
    removeRepresentation,
};
export { getUpdateFunction, render, removeRepresentation };
