import { vec3 } from 'gl-matrix';
import { utilities } from '@cornerstonejs/core';
const { PointsManager } = utilities;
export default function selectHandles(polyline, options = {}) {
    const { handleCount = 12, isOpenUShapeContour } = options;
    const handles = PointsManager.create3(handleCount);
    handles.sources = [];
    const { sources: destPoints } = handles;
    const { length, sources: sourcePoints = [] } = polyline;
    const distance = 5;
    if (isOpenUShapeContour) {
        const handles = polyline.subselect(handleCount);
        handles.push(polyline.getPoint(polyline.length - 1));
        return handles;
    }
    if (length < distance * 3) {
        return polyline.subselect(handleCount);
    }
    const interval = Math.floor(Math.max((2 * length) / handleCount, distance * 2));
    sourcePoints.forEach(() => destPoints.push(PointsManager.create3(handleCount)));
    const dotValues = createDotValues(polyline, distance);
    const minimumRegions = findMinimumRegions(dotValues, handleCount);
    const indices = [];
    if (minimumRegions?.length > 2) {
        let lastHandle = -1;
        const thirdInterval = interval / 3;
        minimumRegions.forEach((region) => {
            const [start, , end] = region;
            const midIndex = Math.ceil((start + end) / 2);
            if (end - lastHandle < thirdInterval) {
                return;
            }
            if (midIndex - start > 2 * thirdInterval) {
                addInterval(indices, lastHandle, start, interval, length);
                lastHandle = addInterval(indices, start, midIndex, interval, length);
            }
            else {
                lastHandle = addInterval(indices, lastHandle, midIndex, interval, length);
            }
            if (end - lastHandle > thirdInterval) {
                lastHandle = addInterval(indices, lastHandle, end, interval, length);
            }
        });
        const firstHandle = indices[0];
        const lastDistance = indexValue(firstHandle + length - lastHandle, length);
        if (lastDistance > 2 * thirdInterval) {
            addInterval(indices, lastHandle, firstHandle - thirdInterval, interval, length);
        }
    }
    else {
        const interval = Math.floor(length / handleCount);
        addInterval(indices, -1, length - interval, interval, length);
    }
    indices.forEach((index) => {
        const point = polyline.getPointArray(index);
        handles.push(point);
        sourcePoints.forEach((source, destSourceIndex) => destPoints[destSourceIndex].push(source.getPoint(index)));
    });
    return handles;
}
export function createDotValues(polyline, distance = 6) {
    const { length } = polyline;
    const prevVec3 = vec3.create();
    const nextVec3 = vec3.create();
    const dotValues = new Float32Array(length);
    for (let i = 0; i < length; i++) {
        const point = polyline.getPoint(i);
        const prevPoint = polyline.getPoint(i - distance);
        const nextPoint = polyline.getPoint((i + distance) % length);
        vec3.sub(prevVec3, point, prevPoint);
        vec3.sub(nextVec3, nextPoint, point);
        const dot = vec3.dot(prevVec3, nextVec3) / (vec3.len(prevVec3) * vec3.len(nextVec3));
        dotValues[i] = dot;
    }
    return dotValues;
}
function findMinimumRegions(dotValues, handleCount) {
    const { max, deviation } = getStats(dotValues);
    const { length } = dotValues;
    if (deviation < 0.01 || length < handleCount * 3) {
        return [];
    }
    const inflection = [];
    let pair = null;
    let minValue;
    let minIndex = 0;
    for (let i = 0; i < length; i++) {
        const dot = dotValues[i];
        if (dot < max - deviation) {
            if (pair) {
                pair[2] = i;
                if (dot < minValue) {
                    minValue = dot;
                    minIndex = i;
                }
                pair[1] = minIndex;
            }
            else {
                minValue = dot;
                minIndex = i;
                pair = [i, i, i];
            }
        }
        else {
            if (pair) {
                inflection.push(pair);
                pair = null;
            }
        }
    }
    if (pair) {
        if (inflection[0][0] === 0) {
            inflection[0][0] = pair[0];
        }
        else {
            pair[1] = minIndex;
            pair[2] = length - 1;
            inflection.push(pair);
        }
    }
    return inflection;
}
export function addInterval(indices, start, finish, interval, length) {
    if (finish < start) {
        finish += length;
    }
    const distance = finish - start;
    const count = Math.ceil(distance / interval);
    if (count <= 0) {
        if (indices[indices.length - 1] !== finish) {
            indices.push(indexValue(finish, length));
        }
        return finish;
    }
    for (let i = 1; i <= count; i++) {
        const index = indexValue(start + (i * distance) / count, length);
        indices.push(index);
    }
    return indices[indices.length - 1];
}
function indexValue(v, length) {
    return (Math.round(v) + length) % length;
}
function getStats(dotValues) {
    const { length } = dotValues;
    let sum = 0;
    let min = Infinity;
    let max = -Infinity;
    let sumSq = 0;
    for (let i = 0; i < length; i++) {
        const dot = dotValues[i];
        sum += dot;
        min = Math.min(min, dot);
        max = Math.max(max, dot);
    }
    const mean = sum / length;
    for (let i = 0; i < length; i++) {
        const valueDiff = dotValues[i] - mean;
        sumSq += valueDiff * valueDiff;
    }
    return {
        mean,
        max,
        min,
        sumSq,
        deviation: Math.sqrt(sumSq / length),
    };
}
