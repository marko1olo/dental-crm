import StrategyCallbacks from '../../../../enums/StrategyCallbacks';
export default {
    [StrategyCallbacks.Fill]: (operationData) => {
        const { segmentsLocked, segmentationImageData, segmentationVoxelManager, brushStrategy, centerIJK, } = operationData;
        const isWithinThreshold = brushStrategy.createIsInThreshold?.(operationData);
        const { setValue } = brushStrategy;
        const callback = isWithinThreshold
            ? (data) => {
                const { value, index } = data;
                if (segmentsLocked.includes(value) || !isWithinThreshold(index)) {
                    return;
                }
                setValue(operationData, data);
            }
            : (data) => setValue(operationData, data);
        segmentationVoxelManager.forEach(callback, {
            imageData: segmentationImageData,
            isInObject: operationData.isInObject,
            boundsIJK: operationData.isInObjectBoundsIJK,
        });
        segmentationVoxelManager.addPoint(centerIJK);
    },
};
