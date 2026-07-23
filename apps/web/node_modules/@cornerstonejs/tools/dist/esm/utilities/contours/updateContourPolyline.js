import { utilities as csUtils } from '@cornerstonejs/core';
import * as math from '../math';
import { getParentAnnotation, invalidateAnnotation, } from '../../stateManagement/annotation/annotationState';
export default function updateContourPolyline(annotation, polylineData, transforms, options) {
    const { canvasToWorld, worldToCanvas } = transforms;
    const { data } = annotation;
    const { targetWindingDirection } = polylineData;
    let { points: polyline } = polylineData;
    let windingDirection = math.polyline.getWindingDirection(polyline);
    if (options?.decimate?.enabled) {
        polyline = math.polyline.decimate(polylineData.points, options?.decimate?.epsilon);
    }
    let { closed } = polylineData;
    const numPoints = polyline.length;
    const polylineWorldPoints = new Array(numPoints);
    const currentPolylineWindingDirection = math.polyline.getWindingDirection(polyline);
    const parentAnnotation = getParentAnnotation(annotation);
    if (closed === undefined) {
        let currentClosedState = false;
        if (polyline.length > 3) {
            const lastToFirstDist = math.point.distanceToPointSquared(polyline[0], polyline[numPoints - 1]);
            currentClosedState = csUtils.isEqual(0, lastToFirstDist);
        }
        closed = currentClosedState;
    }
    if (options?.updateWindingDirection !== false) {
        let updatedWindingDirection = parentAnnotation
            ? parentAnnotation.data.contour.windingDirection * -1
            : targetWindingDirection;
        if (updatedWindingDirection === undefined) {
            updatedWindingDirection = windingDirection;
        }
        if (updatedWindingDirection !== windingDirection) {
            polyline.reverse();
        }
        const handlePoints = (data.handles?.points ?? []).map(worldToCanvas);
        if (handlePoints.length > 2) {
            const currentHandlesWindingDirection = math.polyline.getWindingDirection(handlePoints);
            if (currentHandlesWindingDirection !== updatedWindingDirection) {
                data.handles.points.reverse();
            }
        }
        windingDirection = updatedWindingDirection;
    }
    for (let i = 0; i < numPoints; i++) {
        polylineWorldPoints[i] = canvasToWorld(polyline[i]);
    }
    data.contour.polyline = polylineWorldPoints;
    data.contour.closed = closed;
    data.contour.windingDirection = windingDirection;
    invalidateAnnotation(annotation);
}
