import { getAnnotation, removeAnnotation } from '../../stateManagement';
import { convertContourPolylineToCanvasSpace, convertContourPolylineToWorld, } from './sharedOperations';
import addPolylinesToSegmentation from './addPolylinesToSegmentation';
import { getSegmentation } from '../../stateManagement/segmentation/getSegmentation';
import { copyContourSegment } from './copyAnnotation';
import { removeContourSegmentationAnnotation } from './removeContourSegmentationAnnotation';
import { getViewportAssociatedToSegmentation } from '../../stateManagement/segmentation/utilities/getViewportAssociatedToSegmentation';
import { unifyPolylineSets } from './polylineUnify';
import { subtractPolylineSets } from './polylineSubtract';
import { intersectPolylinesSets } from './polylineIntersect';
import { xorPolylinesSets } from './polylineXor';
import { getViewReferenceFromAnnotation } from './getViewReferenceFromAnnotation';
export var LogicalOperation;
(function (LogicalOperation) {
    LogicalOperation[LogicalOperation["Union"] = 0] = "Union";
    LogicalOperation[LogicalOperation["Subtract"] = 1] = "Subtract";
    LogicalOperation[LogicalOperation["Intersect"] = 2] = "Intersect";
    LogicalOperation[LogicalOperation["XOR"] = 3] = "XOR";
    LogicalOperation[LogicalOperation["Copy"] = 4] = "Copy";
    LogicalOperation[LogicalOperation["Delete"] = 5] = "Delete";
})(LogicalOperation || (LogicalOperation = {}));
function getPolylinesInfoWorld(contourRepresentationData, segmentIndex) {
    const polylinesInfo = [];
    const { annotationUIDsMap } = contourRepresentationData || {};
    if (!annotationUIDsMap?.has(segmentIndex)) {
        return;
    }
    const annotationUIDs = annotationUIDsMap.get(segmentIndex);
    for (const annotationUID of annotationUIDs) {
        const annotation = getAnnotation(annotationUID);
        const { polyline } = annotation.data.contour;
        polylinesInfo.push({
            polyline,
            viewReference: getViewReferenceFromAnnotation(annotation),
        });
    }
    return polylinesInfo;
}
function extractPolylinesInCanvasSpace(viewport, segment1, segment2) {
    const segmentation1 = getSegmentation(segment1.segmentationId);
    const segmentation2 = getSegmentation(segment2.segmentationId);
    if (!segmentation1 || !segmentation2) {
        return;
    }
    if (!segmentation1.representationData.Contour ||
        !segmentation2.representationData.Contour) {
        return;
    }
    const polyLinesInfoWorld1 = getPolylinesInfoWorld(segmentation1.representationData.Contour, segment1.segmentIndex);
    const polyLinesInfoWorld2 = getPolylinesInfoWorld(segmentation2.representationData.Contour, segment2.segmentIndex);
    if (!polyLinesInfoWorld1 || !polyLinesInfoWorld2) {
        return;
    }
    const polyLinesInfoCanvas1 = polyLinesInfoWorld1.map(({ polyline, viewReference }) => {
        return {
            polyline: convertContourPolylineToCanvasSpace(polyline, viewport),
            viewReference,
        };
    });
    const polyLinesInfoCanvas2 = polyLinesInfoWorld2.map(({ polyline, viewReference }) => {
        return {
            polyline: convertContourPolylineToCanvasSpace(polyline, viewport),
            viewReference,
        };
    });
    return { polyLinesInfoCanvas1, polyLinesInfoCanvas2 };
}
function addSegmentInSegmentation(segmentation, { segmentIndex, label, color }) {
    if (!segmentation?.segments) {
        return;
    }
    const segmentData = segmentation.segments[segmentIndex] ?? {
        active: false,
        locked: false,
        segmentIndex,
        cachedStats: {},
        label,
        color,
    };
    if (label !== undefined) {
        segmentData.label = label;
    }
    if (color !== undefined) {
        segmentData.color = color;
    }
    segmentation.segments[segmentIndex] = segmentData;
}
function removeAnnotations(annotationUIDList) {
    annotationUIDList.forEach((annotationUID) => {
        const annotation = getAnnotation(annotationUID);
        removeAnnotation(annotationUID);
        removeContourSegmentationAnnotation(annotation);
    });
    annotationUIDList.clear();
}
function applyLogicalOperation(segment1, segment2, options, operation) {
    const viewport = getViewportAssociatedToSegmentation(segment1.segmentationId);
    if (!viewport) {
        return;
    }
    const { polyLinesInfoCanvas1, polyLinesInfoCanvas2 } = extractPolylinesInCanvasSpace(viewport, segment1, segment2) || {};
    if (!polyLinesInfoCanvas1 || !polyLinesInfoCanvas2) {
        return;
    }
    let polylinesMerged;
    switch (operation) {
        case LogicalOperation.Union:
            polylinesMerged = unifyPolylineSets(polyLinesInfoCanvas1, polyLinesInfoCanvas2);
            break;
        case LogicalOperation.Subtract:
            polylinesMerged = subtractPolylineSets(polyLinesInfoCanvas1, polyLinesInfoCanvas2);
            break;
        case LogicalOperation.Intersect:
            polylinesMerged = intersectPolylinesSets(polyLinesInfoCanvas1, polyLinesInfoCanvas2);
            break;
        case LogicalOperation.XOR:
            polylinesMerged = xorPolylinesSets(polyLinesInfoCanvas1, polyLinesInfoCanvas2);
            break;
        default:
            polylinesMerged = unifyPolylineSets(polyLinesInfoCanvas1, polyLinesInfoCanvas2);
            break;
    }
    const polyLinesWorld = polylinesMerged.map(({ polyline, viewReference }) => {
        return {
            polyline: convertContourPolylineToWorld(polyline, viewport),
            viewReference,
        };
    });
    const resultSegment = options;
    const segmentation = getSegmentation(resultSegment.segmentationId);
    const segmentIndex = resultSegment.segmentIndex;
    const color = resultSegment.color;
    const label = resultSegment.label;
    const contourRepresentationData = segmentation.representationData
        .Contour;
    const { annotationUIDsMap } = contourRepresentationData;
    if (!annotationUIDsMap) {
        return;
    }
    if (segment1.segmentationId === resultSegment.segmentationId &&
        segment1.segmentIndex === segmentIndex) {
        const existingAnnotationUIDs = annotationUIDsMap.get(segmentIndex);
        if (existingAnnotationUIDs) {
            removeAnnotations(existingAnnotationUIDs);
        }
    }
    addPolylinesToSegmentation(viewport, annotationUIDsMap, segmentation.segmentationId, polyLinesWorld, segmentIndex);
    addSegmentInSegmentation(segmentation, { segmentIndex, color, label });
}
export function add(segment1, segment2, options) {
    applyLogicalOperation(segment1, segment2, options, LogicalOperation.Union);
}
export function subtract(segment1, segment2, options) {
    applyLogicalOperation(segment1, segment2, options, LogicalOperation.Subtract);
}
export function intersect(segment1, segment2, options) {
    applyLogicalOperation(segment1, segment2, options, LogicalOperation.Intersect);
}
export function xor(segment1, segment2, options) {
    applyLogicalOperation(segment1, segment2, options, LogicalOperation.XOR);
}
export function copy(segment, options) {
    copyContourSegment(segment.segmentationId, segment.segmentIndex, options.segmentationId, options.segmentIndex);
}
export function deleteOperation(segment) {
    const segmentation = getSegmentation(segment.segmentationId);
    if (!segmentation) {
        console.log('No active segmentation detected');
        return;
    }
    if (!segmentation.representationData.Contour) {
        console.log('No contour representation found');
        return;
    }
    const representationData = segmentation.representationData.Contour;
    const { annotationUIDsMap } = representationData;
    if (!annotationUIDsMap) {
        console.log('No annotation map found');
        return;
    }
    if (!annotationUIDsMap.has(segment.segmentIndex)) {
        console.log('Segmentation index has no annotations');
        return;
    }
    const annotationUIDList = annotationUIDsMap.get(segment.segmentIndex);
    removeAnnotations(annotationUIDList);
}
