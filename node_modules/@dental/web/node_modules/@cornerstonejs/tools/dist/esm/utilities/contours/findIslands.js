import isClosed from '../math/polyline/isClosed';
import { getSignedArea } from '../math/polyline';
export default function findIslands(polylines, threshold) {
    if (!polylines || polylines.length === 0) {
        return [];
    }
    if (threshold <= 0) {
        return [];
    }
    const islandIndexes = [];
    for (let i = 0; i < polylines.length; i++) {
        const polyline = polylines[i];
        if (!polyline || polyline.length < 3) {
            continue;
        }
        const isClosedPolyline = isClosed(polyline);
        if (isClosedPolyline) {
            const area = Math.abs(getSignedArea(polyline)) / 100;
            if (area < threshold) {
                islandIndexes.push(i);
            }
        }
    }
    return islandIndexes;
}
