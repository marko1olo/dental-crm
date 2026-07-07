import type InterpolationType from '../enums/InterpolationType';
import type { ViewportProperties } from './ViewportProperties';
type StackViewportProperties = ViewportProperties & {
    interpolationType?: InterpolationType;
    suppressEvents?: boolean;
    isComputedVOI?: boolean;
};
export type { StackViewportProperties as default };
