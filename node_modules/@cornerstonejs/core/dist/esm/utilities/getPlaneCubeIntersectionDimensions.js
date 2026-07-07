import { rotateToViewCoordinates } from './rotateToViewCoordinates';
function findMinCornerIndex(viewCorners, dimension) {
    let minIndex = 0;
    let minValue = viewCorners[0][dimension];
    for (let i = 1; i < viewCorners.length; i++) {
        if (viewCorners[i][dimension] < minValue) {
            minValue = viewCorners[i][dimension];
            minIndex = i;
        }
    }
    return minIndex;
}
function calculateSize(viewCorners, dimension) {
    const minIndex = findMinCornerIndex(viewCorners, dimension);
    const maxIndex = minIndex ^ 7;
    return viewCorners[maxIndex][dimension] - viewCorners[minIndex][dimension];
}
export function getCubeSizeInView(imageData, viewPlaneNormal, viewUp) {
    const viewCorners = rotateToViewCoordinates(imageData, viewPlaneNormal, viewUp);
    const maxWidth = calculateSize(viewCorners, 0);
    const maxHeight = calculateSize(viewCorners, 1);
    const maxDepth = calculateSize(viewCorners, 2);
    return {
        widthWorld: maxWidth,
        heightWorld: maxHeight,
        depthWorld: maxDepth,
    };
}
