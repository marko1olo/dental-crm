import { Enums } from '@cornerstonejs/core';
import { createSynchronizer } from '../../store/SynchronizerManager';
import presentationViewSyncCallback from '../callbacks/presentationViewSyncCallback';
const { CAMERA_MODIFIED } = Enums.Events;
export default function createPresentationViewSynchronizer(synchronizerName, options) {
    const presentationView = createSynchronizer(synchronizerName, CAMERA_MODIFIED, presentationViewSyncCallback, { viewPresentation: options });
    return presentationView;
}
