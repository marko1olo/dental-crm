import { defaultSegmentationStateManager } from './SegmentationStateManager';
export function removeColorLUT(colorLUTIndex) {
    const segmentationStateManager = defaultSegmentationStateManager;
    segmentationStateManager.removeColorLUT(colorLUTIndex);
}
