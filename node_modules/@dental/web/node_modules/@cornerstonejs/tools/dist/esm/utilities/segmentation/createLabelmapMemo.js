import { utilities } from '@cornerstonejs/core';
import { triggerSegmentationDataModified } from '../../stateManagement/segmentation/triggerSegmentationEvents';
const { VoxelManager, RLEVoxelMap } = utilities;
export function createLabelmapMemo(segmentationId, segmentationVoxelManager) {
    return createRleMemo(segmentationId, segmentationVoxelManager);
}
export function restoreMemo(isUndo) {
    const { segmentationVoxelManager, undoVoxelManager, redoVoxelManager } = this;
    const useVoxelManager = isUndo === false ? redoVoxelManager : undoVoxelManager;
    useVoxelManager.forEach(({ value, pointIJK }) => {
        segmentationVoxelManager.setAtIJKPoint(pointIJK, value);
    });
    const slices = useVoxelManager.getArrayOfModifiedSlices();
    triggerSegmentationDataModified(this.segmentationId, slices);
}
export function createRleMemo(segmentationId, segmentationVoxelManager) {
    const voxelManager = VoxelManager.createRLEHistoryVoxelManager(segmentationVoxelManager);
    const state = {
        segmentationId,
        restoreMemo,
        commitMemo,
        segmentationVoxelManager,
        voxelManager,
        id: utilities.uuidv4(),
        operationType: 'labelmap',
    };
    return state;
}
function commitMemo() {
    if (this.redoVoxelManager) {
        return true;
    }
    if (!this.voxelManager.modifiedSlices.size) {
        return false;
    }
    const { segmentationVoxelManager } = this;
    const undoVoxelManager = VoxelManager.createRLEHistoryVoxelManager(segmentationVoxelManager);
    RLEVoxelMap.copyMap(undoVoxelManager.map, this.voxelManager.map);
    for (const key of this.voxelManager.modifiedSlices.keys()) {
        undoVoxelManager.modifiedSlices.add(key);
    }
    this.undoVoxelManager = undoVoxelManager;
    const redoVoxelManager = VoxelManager.createRLEVolumeVoxelManager({
        dimensions: this.segmentationVoxelManager.dimensions,
    });
    this.redoVoxelManager = redoVoxelManager;
    undoVoxelManager.forEach(({ index, pointIJK, value }) => {
        const currentValue = segmentationVoxelManager.getAtIJKPoint(pointIJK);
        if (currentValue === value) {
            return;
        }
        redoVoxelManager.setAtIndex(index, currentValue);
    });
    return true;
}
