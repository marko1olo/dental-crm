import { utilities as csUtils } from '@cornerstonejs/core';
const { PointsManager } = csUtils;
function cloneContourValue(_key, value) {
    if (value == null || typeof value !== 'object' || !('polyline' in value)) {
        return value;
    }
    const contour = value;
    return {
        ...contour,
        polyline: null,
        pointsManager: PointsManager.create3(contour.polyline.length, contour.polyline),
    };
}
const OMIT_KEYS = new Map([
    ['pointsInVolume', null],
    ['projectionPoints', null],
    ['contour', cloneContourValue],
    ['spline', null],
]);
function omitUncloneableKeys(obj) {
    const result = {};
    for (const [key, value] of Object.entries(obj)) {
        if (OMIT_KEYS.has(key)) {
            const handler = OMIT_KEYS.get(key);
            if (handler) {
                result[key] = handler(key, value);
            }
            continue;
        }
        if (value === null || value === undefined || typeof value !== 'object') {
            result[key] = value;
        }
        else if (Array.isArray(value)) {
            result[key] = value.map((value) => safeStructuredClone(value));
        }
        else {
            result[key] = omitUncloneableKeys(value);
        }
    }
    return result;
}
export function safeStructuredClone(value) {
    if (value === null || value === undefined) {
        return value;
    }
    if (typeof value !== 'object') {
        return value;
    }
    if (Array.isArray(value)) {
        return value.map((item) => safeStructuredClone(item));
    }
    return omitUncloneableKeys(value);
}
