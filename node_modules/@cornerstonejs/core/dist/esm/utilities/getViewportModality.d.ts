import type { IViewport } from '../types/IViewport';
declare function _getViewportModality(viewport: IViewport, volumeId?: string, getVolume?: (volumeId: string) => {
    metadata: {
        Modality: string;
    };
} | undefined): string;
export { _getViewportModality };
