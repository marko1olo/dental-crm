import type { Types } from '@cornerstonejs/core';
export default function voiSyncCallback(synchronizerInstance: any, sourceViewport: Types.IViewportId, targetViewport: Types.IViewportId, modifiedEvent: Types.EventTypes.VoiModifiedEvent, options?: {
    syncInvertState?: boolean;
    syncColormap?: boolean;
}): void;
