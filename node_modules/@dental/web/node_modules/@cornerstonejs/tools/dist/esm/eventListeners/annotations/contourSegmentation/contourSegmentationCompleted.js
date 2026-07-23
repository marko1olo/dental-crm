import { eventTarget, triggerEvent } from '@cornerstonejs/core';
import getViewportsForAnnotation from '../../../utilities/getViewportsForAnnotation';
import { getAllAnnotations } from '../../../stateManagement/annotation/annotationState';
import { areSameSegment, isContourSegmentationAnnotation, } from '../../../utilities/contourSegmentation';
import { getToolGroupForViewport } from '../../../store/ToolGroupManager';
import { findAllIntersectingContours } from '../../../utilities/contourSegmentation/getIntersectingAnnotations';
import { processMultipleIntersections } from '../../../utilities/contourSegmentation/mergeMultipleAnnotations';
import { convertContourPolylineToCanvasSpace, createPolylineHole, combinePolylines, } from '../../../utilities/contourSegmentation/sharedOperations';
import { Events } from '../../../enums';
const DEFAULT_CONTOUR_SEG_TOOL_NAME = 'PlanarFreehandContourSegmentationTool';
export default async function contourSegmentationCompletedListener(evt) {
    const sourceAnnotation = evt.detail
        .annotation;
    if (!isContourSegmentationAnnotation(sourceAnnotation)) {
        return;
    }
    const viewport = getViewport(sourceAnnotation);
    const contourSegmentationAnnotations = getValidContourSegmentationAnnotations(viewport, sourceAnnotation);
    if (!contourSegmentationAnnotations.length) {
        triggerEvent(eventTarget, Events.ANNOTATION_CUT_MERGE_PROCESS_COMPLETED, {
            element: viewport.element,
            sourceAnnotation,
        });
        return;
    }
    const sourcePolyline = convertContourPolylineToCanvasSpace(sourceAnnotation.data.contour.polyline, viewport);
    const intersectingContours = findAllIntersectingContours(viewport, sourcePolyline, contourSegmentationAnnotations);
    if (!intersectingContours.length) {
        triggerEvent(eventTarget, Events.ANNOTATION_CUT_MERGE_PROCESS_COMPLETED, {
            element: viewport.element,
            sourceAnnotation,
        });
        return;
    }
    if (intersectingContours.length > 1) {
        processMultipleIntersections(viewport, sourceAnnotation, sourcePolyline, intersectingContours);
        return;
    }
    const { targetAnnotation, targetPolyline, isContourHole } = intersectingContours[0];
    if (isContourHole) {
        const { contourHoleProcessingEnabled = false } = evt.detail;
        if (!contourHoleProcessingEnabled) {
            return;
        }
        createPolylineHole(viewport, targetAnnotation, sourceAnnotation);
    }
    else {
        combinePolylines(viewport, targetAnnotation, targetPolyline, sourceAnnotation, sourcePolyline);
    }
}
function isFreehandContourSegToolRegisteredForViewport(viewport, silent = false) {
    const toolName = 'PlanarFreehandContourSegmentationTool';
    const toolGroup = getToolGroupForViewport(viewport.id, viewport.renderingEngineId);
    let errorMessage;
    if (!toolGroup) {
        errorMessage = `ToolGroup not found for viewport ${viewport.id}`;
    }
    else if (!toolGroup.hasTool(toolName)) {
        errorMessage = `Tool ${toolName} not added to ${toolGroup.id} toolGroup`;
    }
    else if (!toolGroup.getToolOptions(toolName)) {
        errorMessage = `Tool ${toolName} must be in active/passive state in ${toolGroup.id} toolGroup`;
    }
    if (errorMessage && !silent) {
        console.warn(errorMessage);
    }
    return !errorMessage;
}
function getViewport(annotation) {
    const viewports = getViewportsForAnnotation(annotation);
    const viewportWithToolRegistered = viewports.find((viewport) => isFreehandContourSegToolRegisteredForViewport(viewport, true));
    return viewportWithToolRegistered ?? viewports[0];
}
function getValidContourSegmentationAnnotations(viewport, sourceAnnotation) {
    const { annotationUID: sourceAnnotationUID } = sourceAnnotation;
    const allAnnotations = getAllAnnotations();
    return allAnnotations.filter((targetAnnotation) => targetAnnotation.annotationUID &&
        targetAnnotation.annotationUID !== sourceAnnotationUID &&
        isContourSegmentationAnnotation(targetAnnotation) &&
        areSameSegment(targetAnnotation, sourceAnnotation) &&
        viewport.isReferenceViewable(targetAnnotation.metadata));
}
