export default function transformWorldToIndex(imageData, worldPos) {
    const continuousIndex = imageData.worldToIndex(worldPos);
    const index = continuousIndex.map(Math.round);
    return index;
}
export function transformWorldToIndexContinuous(imageData, worldPos) {
    return imageData.worldToIndex(worldPos);
}
