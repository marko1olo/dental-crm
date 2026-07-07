import { defaultSegmentationStateManager } from './SegmentationStateManager';
export function getNextColorLUTIndex() {
    const segmentationStateManager = defaultSegmentationStateManager;
    return segmentationStateManager.getNextColorLUTIndex();
}
