import { vec2 } from 'gl-matrix';
import containsPoint from './containsPoint';
import getSignedArea from './getSignedArea';
import { EPSILON, IntersectionDirection, pointsAreEqual, PolylineNodeType, robustSegmentIntersection, } from './robustSegmentIntersection';
export default function intersectPolylines(mainPolyCoords, clipPolyCoordsInput) {
    if (mainPolyCoords.length < 3 || clipPolyCoordsInput.length < 3) {
        return [];
    }
    let clipPolyCoords = clipPolyCoordsInput.slice();
    const mainArea = getSignedArea(mainPolyCoords);
    const clipArea = getSignedArea(clipPolyCoords);
    if (Math.abs(mainArea) < EPSILON || Math.abs(clipArea) < EPSILON) {
        return [];
    }
    if (mainArea < 0) {
        mainPolyCoords = mainPolyCoords.slice().reverse();
    }
    if (clipArea < 0) {
        clipPolyCoords = clipPolyCoords.slice().reverse();
    }
    const currentClipPolyForPIP = clipPolyCoords;
    const intersections = [];
    for (let i = 0; i < mainPolyCoords.length; i++) {
        const p1 = mainPolyCoords[i];
        const p2 = mainPolyCoords[(i + 1) % mainPolyCoords.length];
        for (let j = 0; j < clipPolyCoords.length; j++) {
            const q1 = clipPolyCoords[j];
            const q2 = clipPolyCoords[(j + 1) % clipPolyCoords.length];
            const intersectPt = robustSegmentIntersection(p1, p2, q1, q2);
            if (intersectPt) {
                const lenP = Math.sqrt(vec2.squaredDistance(p1, p2));
                const lenQ = Math.sqrt(vec2.squaredDistance(q1, q2));
                intersections.push({
                    coord: [...intersectPt],
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
    if (intersections.length === 0) {
        if (containsPoint(currentClipPolyForPIP, mainPolyCoords[0]) &&
            mainPolyCoords.every((pt) => containsPoint(currentClipPolyForPIP, pt))) {
            return [[...mainPolyCoords.map((p) => [...p])]];
        }
        if (containsPoint(mainPolyCoords, clipPolyCoords[0]) &&
            clipPolyCoords.every((pt) => containsPoint(mainPolyCoords, pt))) {
            return [[...clipPolyCoords.map((p) => [...p])]];
        }
        return [];
    }
    const buildAugmentedList = (polyCoords, polyIndex, allIntersections) => {
        const augmentedList = [];
        let nodeIdCounter = 0;
        for (let i = 0; i < polyCoords.length; i++) {
            const p1 = polyCoords[i];
            augmentedList.push({
                id: `${polyIndex}_v${nodeIdCounter++}`,
                coordinates: [...p1],
                type: PolylineNodeType.Vertex,
                originalPolyIndex: polyIndex,
                originalVertexIndex: i,
                next: null,
                prev: null,
                isIntersection: false,
                visited: false,
                processedInPath: false,
                intersectionDir: IntersectionDirection.Unknown,
            });
            const segmentIntersections = allIntersections
                .filter((isect) => (polyIndex === 0 ? isect.seg1Idx : isect.seg2Idx) === i)
                .sort((a, b) => (polyIndex === 0 ? a.alpha1 : a.alpha2) -
                (polyIndex === 0 ? b.alpha1 : b.alpha2));
            for (const isect of segmentIntersections) {
                if (augmentedList.length > 0 &&
                    pointsAreEqual(augmentedList[augmentedList.length - 1].coordinates, isect.coord)) {
                    const lastNode = augmentedList[augmentedList.length - 1];
                    if (!lastNode.isIntersection) {
                        lastNode.isIntersection = true;
                        lastNode.intersectionInfo = isect;
                        lastNode.alpha = polyIndex === 0 ? isect.alpha1 : isect.alpha2;
                        lastNode.type = PolylineNodeType.Intersection;
                    }
                    continue;
                }
                augmentedList.push({
                    id: `${polyIndex}_i${nodeIdCounter++}`,
                    coordinates: [...isect.coord],
                    type: PolylineNodeType.Intersection,
                    originalPolyIndex: polyIndex,
                    next: null,
                    prev: null,
                    isIntersection: true,
                    visited: false,
                    processedInPath: false,
                    alpha: polyIndex === 0 ? isect.alpha1 : isect.alpha2,
                    intersectionInfo: isect,
                    intersectionDir: IntersectionDirection.Unknown,
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
                    const lastNodeInFinal = finalList[finalList.length - 1];
                    if (augmentedList[i].isIntersection &&
                        augmentedList[i].intersectionInfo) {
                        lastNodeInFinal.isIntersection = true;
                        lastNodeInFinal.intersectionInfo =
                            augmentedList[i].intersectionInfo;
                        lastNodeInFinal.alpha = augmentedList[i].alpha;
                        lastNodeInFinal.type = PolylineNodeType.Intersection;
                    }
                }
            }
        }
        if (finalList.length > 1 &&
            pointsAreEqual(finalList[0].coordinates, finalList[finalList.length - 1].coordinates)) {
            const firstNode = finalList[0];
            const lastNodePopped = finalList.pop();
            if (lastNodePopped.isIntersection &&
                !firstNode.isIntersection &&
                lastNodePopped.intersectionInfo) {
                firstNode.isIntersection = true;
                firstNode.intersectionInfo = lastNodePopped.intersectionInfo;
                firstNode.alpha = lastNodePopped.alpha;
                firstNode.type = PolylineNodeType.Intersection;
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
    const mainAugmented = buildAugmentedList(mainPolyCoords, 0, intersections);
    const clipAugmented = buildAugmentedList(clipPolyCoords, 1, intersections);
    if (mainAugmented.length === 0 || clipAugmented.length === 0) {
        return [];
    }
    mainAugmented.forEach((mainNode) => {
        if (mainNode.isIntersection && mainNode.intersectionInfo) {
            const mainIntersectData = mainNode.intersectionInfo;
            const partnerNode = clipAugmented.find((clipNode) => clipNode.isIntersection &&
                clipNode.intersectionInfo &&
                pointsAreEqual(clipNode.coordinates, mainNode.coordinates) &&
                clipNode.intersectionInfo.seg1Idx === mainIntersectData.seg1Idx &&
                clipNode.intersectionInfo.seg2Idx === mainIntersectData.seg2Idx);
            if (partnerNode) {
                mainNode.partnerNode = partnerNode;
                partnerNode.partnerNode = mainNode;
                const v_arrival_main = vec2.subtract(vec2.create(), mainNode.coordinates, mainNode.prev.coordinates);
                const v_departure_clip = vec2.subtract(vec2.create(), partnerNode.next.coordinates, partnerNode.coordinates);
                const crossZ = v_arrival_main[0] * v_departure_clip[1] -
                    v_arrival_main[1] * v_departure_clip[0];
                if (crossZ > EPSILON) {
                    mainNode.intersectionDir = IntersectionDirection.Entering;
                    partnerNode.intersectionDir = IntersectionDirection.Exiting;
                }
                else if (crossZ < -EPSILON) {
                    mainNode.intersectionDir = IntersectionDirection.Exiting;
                    partnerNode.intersectionDir = IntersectionDirection.Entering;
                }
                else {
                    const midPrevMainSeg = [
                        (mainNode.prev.coordinates[0] + mainNode.coordinates[0]) / 2,
                        (mainNode.prev.coordinates[1] + mainNode.coordinates[1]) / 2,
                    ];
                    if (containsPoint(currentClipPolyForPIP, midPrevMainSeg)) {
                        mainNode.intersectionDir = IntersectionDirection.Exiting;
                        partnerNode.intersectionDir = IntersectionDirection.Entering;
                    }
                    else {
                        mainNode.intersectionDir = IntersectionDirection.Entering;
                        partnerNode.intersectionDir = IntersectionDirection.Exiting;
                    }
                }
            }
            else {
                mainNode.isIntersection = false;
                mainNode.intersectionInfo = undefined;
            }
        }
    });
    const resultPolygons = [];
    for (const startCand of mainAugmented) {
        if (!startCand.isIntersection ||
            startCand.visited ||
            startCand.intersectionDir !== IntersectionDirection.Entering) {
            continue;
        }
        let currentPathCoords = [];
        let currentNode = startCand;
        let onMainList = true;
        const pathStartNode = startCand;
        let safetyBreak = 0;
        const maxIter = (mainAugmented.length + clipAugmented.length) * 2;
        mainAugmented.forEach((n) => (n.processedInPath = false));
        clipAugmented.forEach((n) => (n.processedInPath = false));
        do {
            if (safetyBreak++ > maxIter) {
                console.warn('Intersection: Max iterations in path tracing.', pathStartNode.id, currentNode.id);
                currentPathCoords = [];
                break;
            }
            if (currentNode.processedInPath && currentNode !== pathStartNode) {
                console.warn('Intersection: Path processing loop detected, discarding path segment.', pathStartNode.id, currentNode.id);
                currentPathCoords = [];
                break;
            }
            currentNode.processedInPath = true;
            currentNode.visited = true;
            if (currentPathCoords.length === 0 ||
                !pointsAreEqual(currentPathCoords[currentPathCoords.length - 1], currentNode.coordinates)) {
                currentPathCoords.push([...currentNode.coordinates]);
            }
            let switchedList = false;
            if (currentNode.isIntersection && currentNode.partnerNode) {
                if (onMainList) {
                    currentNode = currentNode.partnerNode;
                    onMainList = false;
                    switchedList = true;
                }
                else {
                    currentNode = currentNode.partnerNode;
                    onMainList = true;
                    switchedList = true;
                }
            }
            if (!switchedList) {
                currentNode = currentNode.next;
            }
            else {
                currentNode = currentNode.next;
            }
        } while (currentNode !== pathStartNode ||
            (onMainList && currentNode.originalPolyIndex !== 0) ||
            (!onMainList && currentNode.originalPolyIndex !== 1));
        if (safetyBreak > maxIter || currentPathCoords.length === 0) {
        }
        else if (currentPathCoords.length > 0 &&
            pointsAreEqual(currentPathCoords[0], currentPathCoords[currentPathCoords.length - 1])) {
            currentPathCoords.pop();
        }
        if (currentPathCoords.length >= 3) {
            const resultArea = getSignedArea(currentPathCoords);
            if (mainArea > 0 && resultArea < 0) {
                currentPathCoords.reverse();
            }
            else if (mainArea < 0 && resultArea > 0) {
                currentPathCoords.reverse();
            }
            resultPolygons.push(currentPathCoords.map((p) => [...p]));
        }
    }
    return resultPolygons;
}
