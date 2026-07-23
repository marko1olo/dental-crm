import * as mathPoint from '../point';
import getLineSegmentIntersectionsIndexes from './getLineSegmentIntersectionsIndexes';
import containsPoint from './containsPoint';
import containsPoints from './containsPoints';
import intersectPolyline from './intersectPolyline';
import getNormal2 from './getNormal2';
import { glMatrix, vec3 } from 'gl-matrix';
import getLinesIntersection from './getLinesIntersection';
var PolylinePointType;
(function (PolylinePointType) {
    PolylinePointType[PolylinePointType["Vertex"] = 0] = "Vertex";
    PolylinePointType[PolylinePointType["Intersection"] = 1] = "Intersection";
})(PolylinePointType || (PolylinePointType = {}));
var PolylinePointPosition;
(function (PolylinePointPosition) {
    PolylinePointPosition[PolylinePointPosition["Outside"] = -1] = "Outside";
    PolylinePointPosition[PolylinePointPosition["Edge"] = 0] = "Edge";
    PolylinePointPosition[PolylinePointPosition["Inside"] = 1] = "Inside";
})(PolylinePointPosition || (PolylinePointPosition = {}));
var PolylinePointDirection;
(function (PolylinePointDirection) {
    PolylinePointDirection[PolylinePointDirection["Exiting"] = -1] = "Exiting";
    PolylinePointDirection[PolylinePointDirection["Unknown"] = 0] = "Unknown";
    PolylinePointDirection[PolylinePointDirection["Entering"] = 1] = "Entering";
})(PolylinePointDirection || (PolylinePointDirection = {}));
function ensuresNextPointers(polylinePoints) {
    for (let i = 0, len = polylinePoints.length; i < len; i++) {
        const currentPoint = polylinePoints[i];
        if (!currentPoint.next) {
            currentPoint.next = polylinePoints[i === len - 1 ? 0 : i + 1];
        }
    }
}
function getSourceAndTargetPointsList(targetPolyline, sourcePolyline) {
    const targetPolylinePoints = [];
    const sourcePolylinePoints = [];
    const sourceIntersectionsCache = new Map();
    const isFirstPointInside = containsPoint(sourcePolyline, targetPolyline[0]);
    let intersectionPointDirection = isFirstPointInside
        ? PolylinePointDirection.Exiting
        : PolylinePointDirection.Entering;
    for (let i = 0, len = targetPolyline.length; i < len; i++) {
        const p1 = targetPolyline[i];
        const pointInside = containsPoint(sourcePolyline, p1);
        const vertexPoint = {
            type: PolylinePointType.Vertex,
            coordinates: p1,
            position: pointInside
                ? PolylinePointPosition.Inside
                : PolylinePointPosition.Outside,
            visited: false,
            next: null,
        };
        targetPolylinePoints.push(vertexPoint);
        const q1 = targetPolyline[i === len - 1 ? 0 : i + 1];
        const intersectionsInfo = getLineSegmentIntersectionsIndexes(sourcePolyline, p1, q1).map((intersectedLineSegment) => {
            const sourceLineSegmentId = intersectedLineSegment[0];
            const p2 = sourcePolyline[intersectedLineSegment[0]];
            const q2 = sourcePolyline[intersectedLineSegment[1]];
            const intersectionCoordinate = getLinesIntersection(p1, q1, p2, q2);
            const targetStartPointDistSquared = mathPoint.distanceToPointSquared(p1, intersectionCoordinate);
            return {
                sourceLineSegmentId,
                coordinate: intersectionCoordinate,
                targetStartPointDistSquared,
            };
        });
        intersectionsInfo.sort((left, right) => left.targetStartPointDistSquared - right.targetStartPointDistSquared);
        intersectionsInfo.forEach((intersectionInfo) => {
            const { sourceLineSegmentId, coordinate: intersectionCoordinate } = intersectionInfo;
            const targetEdgePoint = {
                type: PolylinePointType.Intersection,
                coordinates: intersectionCoordinate,
                position: PolylinePointPosition.Edge,
                direction: intersectionPointDirection,
                visited: false,
                next: null,
            };
            const sourceEdgePoint = {
                ...targetEdgePoint,
                direction: PolylinePointDirection.Unknown,
                cloned: true,
            };
            if (intersectionPointDirection === PolylinePointDirection.Entering) {
                targetEdgePoint.next = sourceEdgePoint;
            }
            else {
                sourceEdgePoint.next = targetEdgePoint;
            }
            let sourceIntersectionPoints = sourceIntersectionsCache.get(sourceLineSegmentId);
            if (!sourceIntersectionPoints) {
                sourceIntersectionPoints = [];
                sourceIntersectionsCache.set(sourceLineSegmentId, sourceIntersectionPoints);
            }
            targetPolylinePoints.push(targetEdgePoint);
            sourceIntersectionPoints.push(sourceEdgePoint);
            intersectionPointDirection *= -1;
        });
    }
    for (let i = 0, len = sourcePolyline.length; i < len; i++) {
        const lineSegmentId = i;
        const p1 = sourcePolyline[i];
        const vertexPoint = {
            type: PolylinePointType.Vertex,
            coordinates: p1,
            visited: false,
            next: null,
        };
        sourcePolylinePoints.push(vertexPoint);
        const sourceIntersectionPoints = sourceIntersectionsCache.get(lineSegmentId);
        if (!sourceIntersectionPoints?.length) {
            continue;
        }
        sourceIntersectionPoints
            .map((intersectionPoint) => ({
            intersectionPoint,
            lineSegStartDistSquared: mathPoint.distanceToPointSquared(p1, intersectionPoint.coordinates),
        }))
            .sort((left, right) => left.lineSegStartDistSquared - right.lineSegStartDistSquared)
            .map(({ intersectionPoint }) => intersectionPoint)
            .forEach((intersectionPoint) => sourcePolylinePoints.push(intersectionPoint));
    }
    ensuresNextPointers(targetPolylinePoints);
    ensuresNextPointers(sourcePolylinePoints);
    return { targetPolylinePoints, sourcePolylinePoints };
}
function getUnvisitedOutsidePoint(polylinePoints) {
    for (let i = 0, len = polylinePoints.length; i < len; i++) {
        const point = polylinePoints[i];
        if (!point.visited &&
            point.position === PolylinePointPosition.Outside &&
            point.type === PolylinePointType.Vertex) {
            return point;
        }
    }
    for (let i = 0, len = polylinePoints.length; i < len; i++) {
        const point = polylinePoints[i];
        if (!point.visited && point.position === PolylinePointPosition.Outside) {
            return point;
        }
    }
    return undefined;
}
function mergePolylines(targetPolyline, sourcePolyline) {
    const targetNormal = getNormal2(targetPolyline);
    const sourceNormal = getNormal2(sourcePolyline);
    const dotNormals = vec3.dot(sourceNormal, targetNormal);
    if (!glMatrix.equals(1, dotNormals)) {
        sourcePolyline = sourcePolyline.slice().reverse();
    }
    const lineSegmentsIntersect = intersectPolyline(sourcePolyline, targetPolyline);
    const targetContainedInSource = !lineSegmentsIntersect && containsPoints(sourcePolyline, targetPolyline);
    if (targetContainedInSource) {
        return sourcePolyline.slice();
    }
    const { targetPolylinePoints } = getSourceAndTargetPointsList(targetPolyline, sourcePolyline);
    const startPoint = getUnvisitedOutsidePoint(targetPolylinePoints);
    if (!startPoint) {
        return targetPolyline.slice();
    }
    const mergedPolyline = [startPoint.coordinates];
    let currentPoint = startPoint.next;
    let iterationCount = 0;
    const maxIterations = targetPolyline.length + sourcePolyline.length + 1000;
    while (currentPoint !== startPoint && iterationCount < maxIterations) {
        iterationCount++;
        if (currentPoint.type === PolylinePointType.Intersection &&
            currentPoint.cloned) {
            currentPoint = currentPoint.next;
            continue;
        }
        mergedPolyline.push(currentPoint.coordinates);
        currentPoint = currentPoint.next;
        if (!currentPoint) {
            console.warn('Broken linked list detected in mergePolylines, breaking loop');
            break;
        }
    }
    if (iterationCount >= maxIterations) {
        console.warn('Maximum iterations reached in mergePolylines, possible infinite loop detected');
    }
    return mergedPolyline;
}
export { mergePolylines };
