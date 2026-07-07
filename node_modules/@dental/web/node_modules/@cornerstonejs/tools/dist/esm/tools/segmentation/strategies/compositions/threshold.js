import { vec3 } from 'gl-matrix';
import StrategyCallbacks from '../../../../enums/StrategyCallbacks';
export default {
    [StrategyCallbacks.CreateIsInThreshold]: (operationData) => {
        const { imageVoxelManager, segmentIndex, configuration } = operationData;
        if (!configuration || !segmentIndex) {
            return;
        }
        return (index) => {
            const voxelValue = imageVoxelManager.getAtIndex(index);
            const gray = Array.isArray(voxelValue)
                ? vec3.length(voxelValue)
                : voxelValue;
            const { threshold } = configuration || {};
            if (!threshold?.range?.length) {
                return true;
            }
            return threshold.range[0] <= gray && gray <= threshold.range[1];
        };
    },
};
