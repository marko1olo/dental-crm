import { vec2 } from 'gl-matrix';
import getSignedArea from './getSignedArea';
import { EPSILON, IntersectionDirection, pointsAreEqual, PolylineNodeType, robustSegmentIntersection, } from './robustSegmentIntersection';
import containsPoint from './containsPoint';
import arePolylinesIdentical from './arePolylinesIdentical';
export default function subtractPolylines(targetPolylineCoords, sourcePolylineCoordsInput) {
    if (targetPolylineCoords.length < 3) {
        return [];
    }
    if (sourcePolylineCoordsInput.length < 3) {
        return [targetPolylineCoords.slice()];
    }
    const sourcePolylineCoords = sourcePolylineCoordsInput.slice();
    if (arePolylinesIdentical(targetPolylineCoords, sourcePolylineCoordsInput)) {
        return [];
    }
    const targetArea = getSignedArea(targetPolylineCoords);
    const sourceArea = getSignedArea(sourcePolylineCoords);
    if (Math.sign(targetArea) === Math.sign(sourceArea) &&
        Math.abs(sourceArea) > EPSILON) {
        sourcePolylineCoords.reverse();
    }
    const intersections = [];
    for (let i = 0; i < targetPolylineCoords.length; i++) {
        const p1 = targetPolylineCoords[i];
        const p2 = targetPolylineCoords[(i + 1) % targetPolylineCoords.length];
        for (let j = 0; j < sourcePolylineCoords.length; j++) {
            const q1 = sourcePolylineCoords[j];
            const q2 = sourcePolylineCoords[(j + 1) % sourcePolylineCoords.length];
            const intersectPt = robustSegmentIntersection(p1, p2, q1, q2);
            if (intersectPt) {
                const lenP = Math.sqrt(vec2.squaredDistance(p1, p2));
                const lenQ = Math.sqrt(vec2.squaredDistance(q1, q2));
                intersections.push({
                    coord: intersectPt,
                    seg1Idx: i,
                    seg2Idx: j,
                    alpha1: lenP < EPSILON
                        ? 0
                        : Math.sqrt(vec2.squaredDistance(p1, intersectPt)) / lenP,
                    alpha2: lenQ < EPSILON
                        ? 0
                        : Math.sqrt(vec2.squaredDistance(q1, intersectPt)) / lenQ,
                });
            }
        }
    }
    const buildAugmentedList = (polyCoords, polyIndex, allIntersections) => {
        const augmentedList = [];
        let nodeIdCounter = 0;
        for (let i = 0; i < polyCoords.length; i++) {
            const p1 = polyCoords[i];
            augmentedList.push({
                id: `${polyIndex}_v${nodeIdCounter++}`,
                coordinates: p1,
                type: PolylineNodeType.Vertex,
                originalPolyIndex: polyIndex,
                originalVertexIndex: i,
                next: null,
                prev: null,
                isIntersection: false,
                visited: false,
            });
            const segmentIntersections = allIntersections
                .filter((isect) => (polyIndex === 0 ? isect.seg1Idx : isect.seg2Idx) === i)
                .sort((a, b) => (polyIndex === 0 ? a.alpha1 : a.alpha2) -
                (polyIndex === 0 ? b.alpha1 : b.alpha2));
            for (const isect of segmentIntersections) {
                if (augmentedList.length > 0 &&
                    pointsAreEqual(augmentedList[augmentedList.length - 1].coordinates, isect.coord)) {
                    if (!augmentedList[augmentedList.length - 1].isIntersection) {
                        augmentedList[augmentedList.length - 1].isIntersection = true;
                        augmentedList[augmentedList.length - 1].intersectionInfo = isect;
                        augmentedList[augmentedList.length - 1].alpha =
                            polyIndex === 0 ? isect.alpha1 : isect.alpha2;
                    }
                    continue;
                }
                augmentedList.push({
                    id: `${polyIndex}_i${nodeIdCounter++}`,
                    coordinates: isect.coord,
                    type: PolylineNodeType.Intersection,
                    originalPolyIndex: polyIndex,
                    next: null,
                    prev: null,
                    isIntersection: true,
                    visited: false,
                    alpha: polyIndex === 0 ? isect.alpha1 : isect.alpha2,
                    intersectionInfo: isect,
                });
            }
        }
        const finalList = [];
        if (augmentedList.length > 0) {
            finalList.push(augmentedList[0]);
            for (let i = 1; i < augmentedList.length; i++) {
                if (!pointsAreEqual(augmentedList[i].coordinates, finalList[finalList.length - 1].coordinates)) {
                    finalList.push(augmentedList[i]);
                }
                else {
                    if (augmentedList[i].isIntersection) {
                        finalList[finalList.length - 1].isIntersection = true;
                        finalList[finalList.length - 1].intersectionInfo =
                            augmentedList[i].intersectionInfo;
                        finalList[finalList.length - 1].alpha = augmentedList[i].alpha;
                    }
                }
            }
        }
        if (finalList.length > 0) {
            for (let i = 0; i < finalList.length; i++) {
                finalList[i].next = finalList[(i + 1) % finalList.length];
                finalList[i].prev =
                    finalList[(i - 1 + finalList.length) % finalList.length];
            }
        }
        return finalList;
    };
    const targetAugmented = buildAugmentedList(targetPolylineCoords, 0, intersections);
    const sourceAugmented = buildAugmentedList(sourcePolylineCoords, 1, intersections);
    targetAugmented.forEach((tnode) => {
        if (tnode.isIntersection) {
            const tData = tnode.intersectionInfo;
            const partner = sourceAugmented.find((snode) => snode.isIntersection &&
                pointsAreEqual(snode.coordinates, tnode.coordinates) &&
                snode.intersectionInfo.seg1Idx ===
                    tData.seg1Idx &&
                snode.intersectionInfo.seg2Idx === tData.seg2Idx);
            if (partner) {
                tnode.partnerNode = partner;
                partner.partnerNode = tnode;
                const p_prev = tnode.prev.coordinates;
                const p_curr = tnode.coordinates;
                const p_next_source = partner.next.coordinates;
                const v_target_arrival = vec2.subtract(vec2.create(), p_curr, p_prev);
                const v_source_departure = vec2.subtract(vec2.create(), p_next_source, p_curr);
                const midPrevTargetSeg = [
                    (tnode.prev.coordinates[0] + tnode.coordinates[0]) / 2,
                    (tnode.prev.coordinates[1] + tnode.coordinates[1]) / 2,
                ];
                const prevSegMidpointInsideSource = containsPoint(sourcePolylineCoordsInput, midPrevTargetSeg);
                if (prevSegMidpointInsideSource) {
                    tnode.intersectionDir = IntersectionDirection.Exiting;
                }
                else {
                    tnode.intersectionDir = IntersectionDirection.Entering;
                }
            }
            else {
                tnode.isIntersection = false;
            }
        }
    });
    targetAugmented.forEach((n) => delete n.intersectionInfo);
    sourceAugmented.forEach((n) => delete n.intersectionInfo);
    const resultPolylines = [];
    for (let i = 0; i < targetAugmented.length; i++) {
        const startNode = targetAugmented[i];
        if (startNode.visited || startNode.isIntersection) {
            continue;
        }
        if (containsPoint(sourcePolylineCoordsInput, startNode.coordinates)) {
            continue;
        }
        const currentPathCoords = [];
        let currentNode = startNode;
        let onTargetList = true;
        let safetyBreak = 0;
        const maxIter = (targetAugmented.length + sourceAugmented.length) * 2;
        do {
            if (safetyBreak++ > maxIter) {
                console.warn('Subtraction: Max iterations reached, possible infinite loop.');
                break;
            }
            currentNode.visited = true;
            if (currentPathCoords.length === 0 ||
                !pointsAreEqual(currentPathCoords[currentPathCoords.length - 1], currentNode.coordinates)) {
                currentPathCoords.push(currentNode.coordinates);
            }
            if (currentNode.isIntersection) {
                if (onTargetList) {
                    if (currentNode.intersectionDir === IntersectionDirection.Entering &&
                        currentNode.partnerNode) {
                        currentNode = currentNode.partnerNode;
                        onTargetList = false;
                    }
                }
                else {
                    if (currentNode.partnerNode) {
                        currentNode = currentNode.partnerNode;
                        onTargetList = true;
                    }
                    else {
                        console.warn('Subtraction: Intersection on source without partner.');
                    }
                }
            }
            currentNode = currentNode.next;
        } while (currentNode !== startNode || !onTargetList);
        if (currentPathCoords.length >= 3) {
            if (pointsAreEqual(currentPathCoords[0], currentPathCoords[currentPathCoords.length - 1])) {
                currentPathCoords.pop();
            }
            if (currentPathCoords.length >= 3) {
                resultPolylines.push(currentPathCoords);
            }
        }
    }
    return resultPolylines;
}
