import getFirstLineSegmentIntersectionIndexes from './getFirstLineSegmentIntersectionIndexes';
export default function intersectPolyline(sourcePolyline, targetPolyline) {
    for (let i = 0, sourceLen = sourcePolyline.length; i < sourceLen; i++) {
        const sourceP1 = sourcePolyline[i];
        const sourceP2Index = i === sourceLen - 1 ? 0 : i + 1;
        const sourceP2 = sourcePolyline[sourceP2Index];
        const intersectionPointIndexes = getFirstLineSegmentIntersectionIndexes(targetPolyline, sourceP1, sourceP2);
        if (intersectionPointIndexes?.length === 2) {
            return true;
        }
    }
    return false;
}
