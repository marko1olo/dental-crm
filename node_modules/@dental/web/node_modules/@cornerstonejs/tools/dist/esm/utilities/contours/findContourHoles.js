import getSignedArea from '../math/polyline/getSignedArea';
import containsPoints from '../math/polyline/containsPoints';
import isClosed from '../math/polyline/isClosed';
function isPolygonInsidePolygon(inner, outer) {
    return containsPoints(outer, inner);
}
export default function findContourHoles(polylines) {
    const results = [];
    const closedPolylines = [];
    polylines.forEach((polyline, index) => {
        if (isClosed(polyline)) {
            closedPolylines.push({ polyline, originalIndex: index });
        }
    });
    for (let i = 0; i < closedPolylines.length; i++) {
        const outerContour = closedPolylines[i];
        const outerArea = Math.abs(getSignedArea(outerContour.polyline));
        const holeIndexes = [];
        for (let j = 0; j < closedPolylines.length; j++) {
            if (i === j) {
                continue;
            }
            const potentialHole = closedPolylines[j];
            const holeArea = Math.abs(getSignedArea(potentialHole.polyline));
            if (holeArea < outerArea &&
                isPolygonInsidePolygon(potentialHole.polyline, outerContour.polyline)) {
                holeIndexes.push(potentialHole.originalIndex);
            }
        }
        if (holeIndexes.length > 0) {
            results.push({
                contourIndex: outerContour.originalIndex,
                holeIndexes: holeIndexes.sort((a, b) => a - b),
            });
        }
    }
    return results.sort((a, b) => a.contourIndex - b.contourIndex);
}
export { findContourHoles };
