import { getAnnotation } from '../../stateManagement/annotation/annotationState';
import getViewportsForAnnotation from '../getViewportsForAnnotation';
import { convertContourPolylineToCanvasSpace, checkIntersection, createPolylineHole, combinePolylines, } from './sharedOperations';
export async function contourSegmentationOperation(sourceAnnotationOrUID, targetAnnotationOrUID, viewport, contourHoleProcessingEnabled = true) {
    const sourceAnnotation = typeof sourceAnnotationOrUID === 'string'
        ? getAnnotation(sourceAnnotationOrUID)
        : sourceAnnotationOrUID;
    const targetAnnotation = typeof targetAnnotationOrUID === 'string'
        ? getAnnotation(targetAnnotationOrUID)
        : targetAnnotationOrUID;
    if (!sourceAnnotation || !targetAnnotation) {
        throw new Error('Both source and target annotations must be valid');
    }
    if (!viewport) {
        viewport = getViewportFromAnnotation(sourceAnnotation);
    }
    const sourcePolyline = convertContourPolylineToCanvasSpace(sourceAnnotation.data.contour.polyline, viewport);
    const targetPolyline = convertContourPolylineToCanvasSpace(targetAnnotation.data.contour.polyline, viewport);
    const intersectionInfo = checkIntersection(sourcePolyline, targetPolyline);
    if (!intersectionInfo.hasIntersection) {
        console.warn('No intersection found between the two annotations');
        return;
    }
    if (intersectionInfo.isContourHole) {
        if (!contourHoleProcessingEnabled) {
            console.warn('Hole processing is disabled');
            return;
        }
        createPolylineHole(viewport, targetAnnotation, sourceAnnotation);
    }
    else {
        combinePolylines(viewport, targetAnnotation, targetPolyline, sourceAnnotation, sourcePolyline);
    }
}
function getViewportFromAnnotation(annotation) {
    const viewports = getViewportsForAnnotation(annotation);
    if (!viewports.length) {
        throw new Error('No viewport found for the annotation');
    }
    return viewports[0];
}
