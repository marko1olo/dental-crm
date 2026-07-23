import * as mathLine from '../line';
const DEFAULT_EPSILON = 0.1;
export default function decimate(polyline, epsilon = DEFAULT_EPSILON) {
    const numPoints = polyline.length;
    if (numPoints < 3) {
        return polyline;
    }
    const epsilonSquared = epsilon * epsilon;
    const partitionQueue = [[0, numPoints - 1]];
    const polylinePointFlags = new Array(numPoints).fill(false);
    let numDecimatedPoints = 2;
    polylinePointFlags[0] = true;
    polylinePointFlags[numPoints - 1] = true;
    while (partitionQueue.length) {
        const [startIndex, endIndex] = partitionQueue.pop();
        if (endIndex - startIndex === 1) {
            continue;
        }
        const startPoint = polyline[startIndex];
        const endPoint = polyline[endIndex];
        let maxDistSquared = -Infinity;
        let maxDistIndex = -1;
        for (let i = startIndex + 1; i < endIndex; i++) {
            const currentPoint = polyline[i];
            const distSquared = mathLine.distanceToPointSquared(startPoint, endPoint, currentPoint);
            if (distSquared > maxDistSquared) {
                maxDistSquared = distSquared;
                maxDistIndex = i;
            }
        }
        if (maxDistSquared < epsilonSquared) {
            continue;
        }
        polylinePointFlags[maxDistIndex] = true;
        numDecimatedPoints++;
        partitionQueue.push([maxDistIndex, endIndex]);
        partitionQueue.push([startIndex, maxDistIndex]);
    }
    const decimatedPolyline = new Array(numDecimatedPoints);
    for (let srcIndex = 0, dstIndex = 0; srcIndex < numPoints; srcIndex++) {
        if (polylinePointFlags[srcIndex]) {
            decimatedPolyline[dstIndex++] = polyline[srcIndex];
        }
    }
    return decimatedPolyline;
}
