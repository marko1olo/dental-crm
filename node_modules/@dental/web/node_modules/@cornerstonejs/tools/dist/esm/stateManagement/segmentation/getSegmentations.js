import { defaultSegmentationStateManager } from './SegmentationStateManager';
export function getSegmentations() {
    const segmentationStateManager = defaultSegmentationStateManager;
    const state = segmentationStateManager.getState();
    return state.segmentations;
}
