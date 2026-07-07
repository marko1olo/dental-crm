import getImageSliceDataForVolumeViewport from '../../utilities/getImageSliceDataForVolumeViewport';
import triggerEvent from '../../utilities/triggerEvent';
import { Events } from '../../enums';
import { getRenderingEngine } from '../getRenderingEngine';
const state = {};
export function resetVolumeNewImageState(viewportId) {
    if (state[viewportId] !== undefined) {
        delete state[viewportId];
    }
}
function volumeNewImageEventDispatcher(cameraEvent) {
    const { renderingEngineId, viewportId } = cameraEvent.detail;
    const renderingEngine = getRenderingEngine(renderingEngineId);
    const viewport = renderingEngine.getViewport(viewportId);
    if (!('setVolumes' in viewport)) {
        throw new Error(`volumeNewImageEventDispatcher: viewport does not have setVolumes method`);
    }
    if (state[viewport.id] === undefined) {
        state[viewport.id] = 0;
    }
    const sliceData = getImageSliceDataForVolumeViewport(viewport);
    if (!sliceData) {
        console.warn(`volumeNewImageEventDispatcher: sliceData is undefined for viewport ${viewport.id}`);
        return;
    }
    const { numberOfSlices, imageIndex } = sliceData;
    if (state[viewport.id] === imageIndex) {
        return;
    }
    state[viewport.id] = imageIndex;
    const eventDetail = {
        imageIndex,
        viewportId,
        renderingEngineId,
        numberOfSlices,
    };
    triggerEvent(viewport.element, Events.VOLUME_NEW_IMAGE, eventDetail);
}
export default volumeNewImageEventDispatcher;
