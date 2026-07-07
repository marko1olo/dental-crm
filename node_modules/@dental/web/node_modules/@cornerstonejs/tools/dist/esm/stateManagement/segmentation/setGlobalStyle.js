import { triggerSegmentationRender } from './SegmentationRenderingEngine';
import { segmentationStyle } from './SegmentationStyle';
export function setGlobalStyle(type, styles, suppressEvents) {
    segmentationStyle.setStyle({ type }, styles);
    if (!suppressEvents) {
        triggerSegmentationRender();
    }
}
