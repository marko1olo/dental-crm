import { createSynchronizer } from '../../store/SynchronizerManager';
import { Enums } from '@cornerstonejs/core';
import voiSyncCallback from '../callbacks/voiSyncCallback';
export default function createVOISynchronizer(synchronizerName, options) {
    options = Object.assign({ syncInvertState: true, syncColormap: true }, options);
    const VOISynchronizer = createSynchronizer(synchronizerName, Enums.Events.VOI_MODIFIED, voiSyncCallback, {
        auxiliaryEvents: [
            {
                name: Enums.Events.COLORMAP_MODIFIED,
            },
        ],
        ...options,
    });
    return VOISynchronizer;
}
