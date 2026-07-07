import { getSegmentationRepresentation, getSegmentationRepresentations, } from '../getSegmentationRepresentation';
import { setSegmentationRepresentationVisibility as _setSegmentationRepresentationVisibility } from '../setSegmentationRepresentationVisibility';
import { getSegmentationRepresentationVisibility as _getSegmentationRepresentationVisibility } from '../getSegmentationRepresentationVisibility';
import { triggerSegmentationRenderBySegmentationId } from '../SegmentationRenderingEngine';
import { triggerSegmentationRepresentationModified } from '../triggerSegmentationEvents';
function setSegmentationRepresentationVisibility(viewportId, specifier, visibility) {
    const representations = getSegmentationRepresentations(viewportId, specifier);
    if (!representations) {
        return;
    }
    representations.forEach((representation) => {
        _setSegmentationRepresentationVisibility(viewportId, {
            segmentationId: representation.segmentationId,
            type: representation.type,
        }, visibility);
    });
}
function getSegmentationRepresentationVisibility(viewportId, specifier) {
    return _getSegmentationRepresentationVisibility(viewportId, specifier);
}
function setSegmentIndexVisibility(viewportId, specifier, segmentIndex, visibility) {
    const representations = getSegmentationRepresentations(viewportId, specifier);
    if (!representations) {
        return;
    }
    representations.forEach((representation) => {
        if (!representation.segments || !representation.segments[segmentIndex]) {
            return;
        }
        representation.visible ||= visibility;
        representation.segments[segmentIndex].visible = visibility;
    });
    triggerSegmentationRenderBySegmentationId(specifier.segmentationId);
    triggerSegmentationRepresentationModified(viewportId, specifier.segmentationId);
}
function getSegmentIndexVisibility(viewportId, specifier, segmentIndex) {
    const hiddenSegments = getHiddenSegmentIndices(viewportId, specifier);
    return !hiddenSegments.has(segmentIndex);
}
function getHiddenSegmentIndices(viewportId, specifier) {
    const representation = getSegmentationRepresentation(viewportId, specifier);
    if (!representation) {
        return new Set();
    }
    const segmentsHidden = Object.entries(representation.segments).reduce((acc, [segmentIndex, segment]) => {
        if (!segment.visible) {
            acc.add(Number(segmentIndex));
        }
        return acc;
    }, new Set());
    return segmentsHidden;
}
export { setSegmentationRepresentationVisibility, getSegmentationRepresentationVisibility, setSegmentIndexVisibility, getSegmentIndexVisibility, getHiddenSegmentIndices, };
