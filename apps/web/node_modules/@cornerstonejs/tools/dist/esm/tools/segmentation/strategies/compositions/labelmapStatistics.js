import StrategyCallbacks from '../../../../enums/StrategyCallbacks';
import getStatistics from '../../../../utilities/segmentation/getStatistics';
export default {
    [StrategyCallbacks.GetStatistics]: function (enabledElement, operationData, options) {
        const { indices } = options;
        const { segmentationId, viewport } = operationData;
        getStatistics({
            segmentationId,
            segmentIndices: indices,
        });
    },
};
