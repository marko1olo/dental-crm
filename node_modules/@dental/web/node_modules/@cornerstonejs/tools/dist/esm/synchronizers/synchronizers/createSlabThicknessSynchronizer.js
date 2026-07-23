import { Enums } from '@cornerstonejs/core';
import { createSynchronizer } from '../../store/SynchronizerManager';
import slabThicknessSyncCallback from '../callbacks/slabThicknessSyncCallback';
const { CAMERA_MODIFIED } = Enums.Events;
export default function createPresentationViewSynchronizer(synchronizerName) {
    const presentationView = createSynchronizer(synchronizerName, CAMERA_MODIFIED, slabThicknessSyncCallback);
    return presentationView;
}
