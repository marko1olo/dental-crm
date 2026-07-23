import { getEnabledElement, utilities as csUtils } from '@cornerstonejs/core';
import { ContourWindingDirection } from '../../types/ContourAnnotation';
import * as math from '../math';
import updateContourPolyline from '../contours/updateContourPolyline';
import { addAnnotation, removeAnnotation, getChildAnnotations, addChildAnnotation, clearParentAnnotation, } from '../../stateManagement/annotation/annotationState';
import { addContourSegmentationAnnotation } from './addContourSegmentationAnnotation';
import { removeContourSegmentationAnnotation } from './removeContourSegmentationAnnotation';
import { triggerAnnotationModified } from '../../stateManagement/annotation/helpers/state';
import triggerAnnotationRenderForViewportIds from '../triggerAnnotationRenderForViewportIds';
import { getViewportIdsWithToolToRender } from '../viewportFilters';
import { hasToolByName } from '../../store/addTool';
const TOLERANCE = 1e-10;
const DEFAULT_CONTOUR_SEG_TOOL_NAME = 'PlanarFreehandContourSegmentationTool';
export function convertContourPolylineToCanvasSpace(polyline, viewport) {
    const numPoints = polyline.length;
    const projectedPolyline = new Array(numPoints);
    for (let i = 0; i < numPoints; i++) {
        projectedPolyline[i] = viewport.worldToCanvas(polyline[i]);
    }
    return projectedPolyline;
}
export function convertContourPolylineToWorld(polyline, viewport) {
    const numPoints = polyline.length;
    const projectedPolyline = new Array(numPoints);
    for (let i = 0; i < numPoints; i++) {
        projectedPolyline[i] = viewport.canvasToWorld(polyline[i]);
    }
    return projectedPolyline;
}
export function checkIntersection(sourcePolyline, targetPolyline) {
    const sourceAABB = math.polyline.getAABB(sourcePolyline);
    const targetAABB = math.polyline.getAABB(targetPolyline);
    const aabbIntersect = math.aabb.intersectAABB(sourceAABB, targetAABB);
    if (!aabbIntersect) {
        return { hasIntersection: false, isContourHole: false };
    }
    const lineSegmentsIntersect = math.polyline.intersectPolyline(sourcePolyline, targetPolyline);
    const isContourHole = !lineSegmentsIntersect &&
        math.polyline.containsPoints(targetPolyline, sourcePolyline);
    const hasIntersection = lineSegmentsIntersect || isContourHole;
    return { hasIntersection, isContourHole };
}
export function getContourHolesData(viewport, annotation) {
    return getChildAnnotations(annotation).map((holeAnnotation) => {
        const contourHoleAnnotation = holeAnnotation;
        const polyline = convertContourPolylineToCanvasSpace(contourHoleAnnotation.data.contour.polyline, viewport);
        return { annotation: contourHoleAnnotation, polyline };
    });
}
export function createPolylineHole(viewport, targetAnnotation, holeAnnotation) {
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
    const { element } = viewport;
    updateViewportsForAnnotations(viewport, [targetAnnotation, holeAnnotation]);
}
export function combinePolylines(viewport, targetAnnotation, targetPolyline, sourceAnnotation, sourcePolyline) {
    if (!hasToolByName(DEFAULT_CONTOUR_SEG_TOOL_NAME)) {
        console.warn(`${DEFAULT_CONTOUR_SEG_TOOL_NAME} is not registered in cornerstone. Cannot combine polylines.`);
        return;
    }
    const sourceStartPoint = sourcePolyline[0];
    const mergePolylines = math.polyline.containsPoint(targetPolyline, sourceStartPoint);
    const contourHolesData = getContourHolesData(viewport, targetAnnotation);
    const unassignedContourHolesSet = new Set(contourHolesData);
    const reassignedContourHolesMap = new Map();
    const assignHoleToPolyline = (parentPolyline, holeData) => {
        let holes = reassignedContourHolesMap.get(parentPolyline);
        if (!holes) {
            holes = [];
            reassignedContourHolesMap.set(parentPolyline, holes);
        }
        holes.push(holeData);
        unassignedContourHolesSet.delete(holeData);
    };
    const newPolylines = [];
    if (mergePolylines) {
        const mergedPolyline = math.polyline.mergePolylines(targetPolyline, sourcePolyline);
        newPolylines.push(mergedPolyline);
        Array.from(unassignedContourHolesSet.keys()).forEach((holeData) => assignHoleToPolyline(mergedPolyline, holeData));
    }
    else {
        const subtractedPolylines = math.polyline.subtractPolylines(targetPolyline, sourcePolyline);
        subtractedPolylines.forEach((newPolyline) => {
            newPolylines.push(newPolyline);
            Array.from(unassignedContourHolesSet.keys()).forEach((holeData) => {
                const containsHole = math.polyline.containsPoints(newPolyline, holeData.polyline);
                if (containsHole) {
                    assignHoleToPolyline(newPolyline, holeData);
                }
            });
        });
    }
    Array.from(reassignedContourHolesMap.values()).forEach((contourHolesDataArray) => contourHolesDataArray.forEach((contourHoleData) => clearParentAnnotation(contourHoleData.annotation)));
    const { element } = viewport;
    const { metadata, data } = targetAnnotation;
    const { handles, segmentation } = data;
    const { textBox } = handles;
    removeAnnotation(sourceAnnotation.annotationUID);
    removeAnnotation(targetAnnotation.annotationUID);
    removeContourSegmentationAnnotation(sourceAnnotation);
    removeContourSegmentationAnnotation(targetAnnotation);
    const newAnnotations = [];
    for (let i = 0; i < newPolylines.length; i++) {
        const polyline = newPolylines[i];
        if (!polyline || polyline.length < 3) {
            console.warn('Skipping creation of new annotation due to invalid polyline:', polyline);
            continue;
        }
        const newAnnotation = createNewAnnotationFromPolyline(viewport, targetAnnotation, polyline);
        addAnnotation(newAnnotation, element);
        addContourSegmentationAnnotation(newAnnotation);
        triggerAnnotationModified(newAnnotation, viewport.element);
        newAnnotations.push(newAnnotation);
        reassignedContourHolesMap
            .get(polyline)
            ?.forEach((holeData) => addChildAnnotation(newAnnotation, holeData.annotation));
    }
    updateViewportsForAnnotations(viewport, [targetAnnotation, sourceAnnotation]);
}
export function createNewAnnotationFromPolyline(viewport, templateAnnotation, polyline) {
    const startPointWorld = viewport.canvasToWorld(polyline[0]);
    const endPointWorld = viewport.canvasToWorld(polyline[polyline.length - 1]);
    const newAnnotation = {
        metadata: {
            ...templateAnnotation.metadata,
            toolName: DEFAULT_CONTOUR_SEG_TOOL_NAME,
            originalToolName: templateAnnotation.metadata.originalToolName ||
                templateAnnotation.metadata.toolName,
        },
        data: {
            cachedStats: {},
            handles: {
                points: [startPointWorld, endPointWorld],
                textBox: templateAnnotation.data.handles.textBox
                    ? { ...templateAnnotation.data.handles.textBox }
                    : undefined,
            },
            contour: {
                polyline: [],
                closed: true,
            },
            spline: templateAnnotation.data.spline,
            segmentation: {
                ...templateAnnotation.data.segmentation,
            },
        },
        annotationUID: csUtils.uuidv4(),
        highlighted: true,
        invalidated: true,
        isLocked: false,
        isVisible: undefined,
        interpolationUID: templateAnnotation.interpolationUID,
        interpolationCompleted: templateAnnotation.interpolationCompleted,
    };
    updateContourPolyline(newAnnotation, {
        points: polyline,
        closed: true,
        targetWindingDirection: ContourWindingDirection.Clockwise,
    }, viewport);
    return newAnnotation;
}
export function updateViewportsForAnnotations(viewport, annotations) {
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
export function removeDuplicatePoints(polyline) {
    if (!polyline || polyline.length < 2) {
        return polyline;
    }
    const cleaned = [polyline[0]];
    for (let i = 1; i < polyline.length; i++) {
        const currentPoint = polyline[i];
        const lastPoint = cleaned[cleaned.length - 1];
        const dx = Math.abs(currentPoint[0] - lastPoint[0]);
        const dy = Math.abs(currentPoint[1] - lastPoint[1]);
        if (dx > TOLERANCE || dy > TOLERANCE) {
            cleaned.push(currentPoint);
        }
    }
    return cleaned;
}
export function cleanupPolylines(polylines) {
    const validPolylines = [];
    const seenPolylines = new Set();
    for (let polyline of polylines) {
        if (!polyline || polyline.length < 3) {
            continue;
        }
        polyline = removeDuplicatePoints(polyline);
        if (polyline.length < 3) {
            continue;
        }
        const sortedPoints = [...polyline].sort((a, b) => {
            if (a[0] !== b[0]) {
                return a[0] - b[0];
            }
            return a[1] - b[1];
        });
        const polylineKey = sortedPoints
            .map((p) => `${p[0].toFixed(6)},${p[1].toFixed(6)}`)
            .join('|');
        if (!seenPolylines.has(polylineKey)) {
            seenPolylines.add(polylineKey);
            validPolylines.push(polyline);
        }
    }
    return validPolylines;
}
