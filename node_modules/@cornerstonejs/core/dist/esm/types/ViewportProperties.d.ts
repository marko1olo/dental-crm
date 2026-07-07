import type { InterpolationType, VOILUTFunctionType } from '../enums';
import type { VOIRange } from './voi';
import type { ColormapPublic } from './Colormap';
export interface ViewportProperties {
    voiRange?: VOIRange;
    VOILUTFunction?: VOILUTFunctionType;
    invert?: boolean;
    colormap?: ColormapPublic;
    interpolationType?: InterpolationType;
    preset?: string;
    sampleDistanceMultiplier?: number;
    sharpening?: number;
    smoothing?: number;
}
