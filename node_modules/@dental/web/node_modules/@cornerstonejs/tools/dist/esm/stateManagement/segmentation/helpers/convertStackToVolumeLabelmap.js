import { internalConvertStackToVolumeLabelmap } from '../SegmentationStateManager';
import { triggerSegmentationModified } from '../triggerSegmentationEvents';
export async function convertStackToVolumeLabelmap(args) {
    const result = internalConvertStackToVolumeLabelmap(args);
    triggerSegmentationModified(args.segmentationId);
    return result;
}
