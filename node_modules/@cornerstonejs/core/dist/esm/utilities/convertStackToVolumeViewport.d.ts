import type { IStackViewport, IVolumeViewport, Point3 } from '../types';
import type { OrientationAxis } from '../enums';
declare function convertStackToVolumeViewport({ viewport, options, }: {
    viewport: IStackViewport;
    options?: {
        volumeId?: string;
        viewportId?: string;
        background?: Point3;
        orientation?: OrientationAxis;
    };
}): Promise<IVolumeViewport>;
export { convertStackToVolumeViewport };
