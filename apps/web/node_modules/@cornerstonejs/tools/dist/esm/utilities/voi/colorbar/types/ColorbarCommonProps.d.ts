import type { ColorbarRangeTextPosition } from '../enums/ColorbarRangeTextPosition';
import type { ColorbarImageRange, ColorbarTicksStyle, ColorbarVOIRange } from '.';
export type ColorbarCommonProps = {
    imageRange?: ColorbarImageRange;
    voiRange?: ColorbarVOIRange;
    ticks?: {
        position?: ColorbarRangeTextPosition;
        style?: ColorbarTicksStyle;
    };
    showFullPixelValueRange?: boolean;
};
