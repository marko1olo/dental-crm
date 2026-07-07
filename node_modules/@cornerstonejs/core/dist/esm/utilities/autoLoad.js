import { getRenderingEngines } from '../RenderingEngine/getRenderingEngine';
import getViewportsWithVolumeId from './getViewportsWithVolumeId';
const autoLoad = (volumeId) => {
    const renderingEngineAndViewportIds = getRenderingEngineAndViewportsContainingVolume(volumeId);
    if (!renderingEngineAndViewportIds?.length) {
        return;
    }
    renderingEngineAndViewportIds.forEach(({ renderingEngine, viewportIds }) => {
        if (!renderingEngine.hasBeenDestroyed) {
            renderingEngine.renderViewports(viewportIds);
        }
    });
};
function getRenderingEngineAndViewportsContainingVolume(volumeId) {
    const renderingEnginesArray = getRenderingEngines();
    const renderingEngineAndViewportIds = [];
    renderingEnginesArray.forEach((renderingEngine) => {
        const viewports = getViewportsWithVolumeId(volumeId);
        if (viewports.length) {
            renderingEngineAndViewportIds.push({
                renderingEngine,
                viewportIds: viewports.map((viewport) => viewport.id),
            });
        }
    });
    return renderingEngineAndViewportIds;
}
export default autoLoad;
