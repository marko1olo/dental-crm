import type { ViewportProperties } from './ViewportProperties';
import type { OrientationAxis } from '../enums';
type VolumeViewportProperties = ViewportProperties & {
    preset?: string;
    slabThickness?: number;
    orientation?: OrientationAxis;
};
export type { VolumeViewportProperties as default };
