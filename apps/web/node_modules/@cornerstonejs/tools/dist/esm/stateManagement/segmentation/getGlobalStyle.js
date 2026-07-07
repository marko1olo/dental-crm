import { segmentationStyle } from './SegmentationStyle';
export function getGlobalStyle(type) {
    return segmentationStyle.getStyle({ type });
}
