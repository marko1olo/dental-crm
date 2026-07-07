import { utilities as csUtils, getEnabledElement } from '@cornerstonejs/core';
import { ContourWindingDirection } from '../../types/ContourAnnotation';
import * as math from '../math';
import updateContourPolyline from '../contours/updateContourPolyline';
import { addAnnotation, removeAnnotation, getChildAnnotations, addChildAnnotation, clearParentAnnotation, } from '../../stateManagement/annotation/annotationState';
import { addContourSegmentationAnnotation } from './addContourSegmentationAnnotation';
import { removeContourSegmentationAnnotation } from './removeContourSegmentationAnnotation';
import { triggerAnnotationModified } from '../../stateManagement/annotation/helpers/state';
import triggerAnnotationRenderForViewportIds from '../triggerAnnotationRenderForViewportIds';
import { getViewportIdsWithToolToRender } from '../viewportFilters';
import { hasToolByName, hasTool } from '../../store/addTool';
const DEFAULT_CONTOUR_SEG_TOOL_NAME = 'PlanarFreehandContourSegmentationTool';
function processMultipleIntersections(viewport, sourceAnnotation, sourcePolyline, intersectingContours) {
    const holeOperations = intersectingContours.filter((item) => item.isContourHole);
    const mergeOperations = intersectingContours.filter((item) => !item.isContourHole);
    if (holeOperations.length > 0) {
        const primaryHoleTarget = holeOperations[0];
        createPolylineHole(viewport, primaryHoleTarget.targetAnnotation, sourceAnnotation);
        updateViewportsForAnnotations(viewport, [
            sourceAnnotation,
            primaryHoleTarget.targetAnnotation,
        ]);
        return;
    }
    if (mergeOperations.length === 0) {
        return;
    }
    if (!hasToolByName(DEFAULT_CONTOUR_SEG_TOOL_NAME)) {
        console.warn(`${DEFAULT_CONTOUR_SEG_TOOL_NAME} is not registered in cornerstone. Cannot process multiple intersections.`);
        return;
    }
    processSequentialIntersections(viewport, sourceAnnotation, sourcePolyline, mergeOperations);
}
function processSequentialIntersections(viewport, sourceAnnotation, sourcePolyline, mergeOperations) {
    const { element } = viewport;
    const allAnnotationsToRemove = [sourceAnnotation];
    const allResultPolylines = [];
    const allHoles = [];
    mergeOperations.forEach(({ targetAnnotation }) => {
        const holes = getContourHolesData(viewport, targetAnnotation);
        allHoles.push(...holes);
        allAnnotationsToRemove.push(targetAnnotation);
    });
    const sourceStartPoint = sourcePolyline[0];
    const shouldMerge = mergeOperations.some(({ targetPolyline }) => math.polyline.containsPoint(targetPolyline, sourceStartPoint));
    if (shouldMerge) {
        let resultPolyline = sourcePolyline;
        mergeOperations.forEach(({ targetPolyline }) => {
            resultPolyline = math.polyline.mergePolylines(resultPolyline, targetPolyline);
        });
        allResultPolylines.push(resultPolyline);
    }
    else {
        mergeOperations.forEach(({ targetPolyline }) => {
            const subtractedPolylines = math.polyline.subtractPolylines(targetPolyline, sourcePolyline);
            allResultPolylines.push(...subtractedPolylines);
        });
    }
    allAnnotationsToRemove.forEach((annotation) => {
        removeAnnotation(annotation.annotationUID);
        removeContourSegmentationAnnotation(annotation);
    });
    allHoles.forEach((holeData) => clearParentAnnotation(holeData.annotation));
    const baseAnnotation = mergeOperations[0].targetAnnotation;
    const newAnnotations = [];
    allResultPolylines.forEach((polyline) => {
        if (!polyline || polyline.length < 3) {
            console.warn('Skipping creation of new annotation due to invalid polyline:', polyline);
            return;
        }
        const newAnnotation = createNewAnnotationFromPolyline(viewport, baseAnnotation, polyline);
        addAnnotation(newAnnotation, element);
        addContourSegmentationAnnotation(newAnnotation);
        triggerAnnotationModified(newAnnotation, viewport.element);
        newAnnotations.push(newAnnotation);
    });
    reassignHolesToNewAnnotations(viewport, allHoles, newAnnotations);
    updateViewportsForAnnotations(viewport, allAnnotationsToRemove);
}
function createNewAnnotationFromPolyline(viewport, baseAnnotation, polyline) {
    const startPointWorld = viewport.canvasToWorld(polyline[0]);
    const endPointWorld = viewport.canvasToWorld(polyline[polyline.length - 1]);
    const newAnnotation = {
        metadata: {
            ...baseAnnotation.metadata,
            toolName: DEFAULT_CONTOUR_SEG_TOOL_NAME,
            originalToolName: baseAnnotation.metadata.originalToolName ||
                baseAnnotation.metadata.toolName,
        },
        data: {
            cachedStats: {},
            handles: {
                points: [startPointWorld, endPointWorld],
                textBox: baseAnnotation.data.handles.textBox
                    ? { ...baseAnnotation.data.handles.textBox }
                    : undefined,
            },
            contour: {
                polyline: [],
                closed: true,
            },
            spline: baseAnnotation.data.spline,
            segmentation: {
                ...baseAnnotation.data.segmentation,
            },
        },
        annotationUID: csUtils.uuidv4(),
        highlighted: true,
        invalidated: true,
        isLocked: false,
        isVisible: undefined,
        interpolationUID: baseAnnotation.interpolationUID,
        interpolationCompleted: baseAnnotation.interpolationCompleted,
    };
    updateContourPolyline(newAnnotation, {
        points: polyline,
        closed: true,
        targetWindingDirection: ContourWindingDirection.Clockwise,
    }, viewport);
    return newAnnotation;
}
function reassignHolesToNewAnnotations(viewport, holes, newAnnotations) {
    holes.forEach((holeData) => {
        const parentAnnotation = newAnnotations.find((annotation) => {
            const parentPolyline = convertContourPolylineToCanvasSpace(annotation.data.contour.polyline, viewport);
            return math.polyline.containsPoints(parentPolyline, holeData.polyline);
        });
        if (parentAnnotation) {
            addChildAnnotation(parentAnnotation, holeData.annotation);
        }
    });
}
function getContourHolesData(viewport, annotation) {
    return getChildAnnotations(annotation).map((holeAnnotation) => {
        const contourHoleAnnotation = holeAnnotation;
        const polyline = convertContourPolylineToCanvasSpace(contourHoleAnnotation.data.contour.polyline, viewport);
        return { annotation: contourHoleAnnotation, polyline };
    });
}
function createPolylineHole(viewport, targetAnnotation, holeAnnotation) {
    addChildAnnotation(targetAnnotation, holeAnnotation);
    removeContourSegmentationAnnotation(holeAnnotation);
    const { contour: holeContour } = holeAnnotation.data;
    const holePolylineCanvas = convertContourPolylineToCanvasSpace(holeContour.polyline, viewport);
    updateContourPolyline(holeAnnotation, {
        points: holePolylineCanvas,
        closed: holeContour.closed,
        targetWindingDirection: targetAnnotation.data.contour.windingDirection ===
            ContourWindingDirection.Clockwise
            ? ContourWindingDirection.CounterClockwise
            : ContourWindingDirection.Clockwise,
    }, viewport);
}
function convertContourPolylineToCanvasSpace(polyline, viewport) {
    const numPoints = polyline.length;
    const projectedPolyline = new Array(numPoints);
    for (let i = 0; i < numPoints; i++) {
        projectedPolyline[i] = viewport.worldToCanvas(polyline[i]);
    }
    return projectedPolyline;
}
function updateViewportsForAnnotations(viewport, annotations) {
    const { element } = viewport;
    const updatedToolNames = new Set([DEFAULT_CONTOUR_SEG_TOOL_NAME]);
    annotations.forEach((annotation) => {
        updatedToolNames.add(annotation.metadata.toolName);
    });
    for (const toolName of updatedToolNames.values()) {
        if (hasToolByName(toolName)) {
            const viewportIdsToRender = getViewportIdsWithToolToRender(element, toolName);
            triggerAnnotationRenderForViewportIds(viewportIdsToRender);
        }
    }
}
export { processMultipleIntersections };
