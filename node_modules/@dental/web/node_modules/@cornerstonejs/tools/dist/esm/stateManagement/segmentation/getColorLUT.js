import { defaultSegmentationStateManager } from './SegmentationStateManager';
export function getColorLUT(index) {
    const segmentationStateManager = defaultSegmentationStateManager;
    return segmentationStateManager.getColorLUT(index);
}
