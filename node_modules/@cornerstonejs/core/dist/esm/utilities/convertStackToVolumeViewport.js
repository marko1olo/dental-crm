import { setVolumesForViewports } from '../RenderingEngine/helpers';
import { createAndCacheVolume, getUnknownVolumeLoaderSchema, } from '../loaders/volumeLoader';
import { Events, ViewportType } from '../enums';
import uuidv4 from './uuidv4';
async function convertStackToVolumeViewport({ viewport, options = {}, }) {
    const renderingEngine = viewport.getRenderingEngine();
    let volumeId = options.volumeId || `${uuidv4()}`;
    if (volumeId.split(':').length === 0) {
        const schema = getUnknownVolumeLoaderSchema();
        volumeId = `${schema}:${volumeId}`;
    }
    const { id, element } = viewport;
    const viewportId = options.viewportId || id;
    const imageIds = viewport.getImageIds();
    const prevViewPresentation = viewport.getViewPresentation();
    const prevViewReference = viewport.getViewReference();
    renderingEngine.enableElement({
        viewportId,
        type: ViewportType.ORTHOGRAPHIC,
        element,
        defaultOptions: {
            background: options.background,
            orientation: options.orientation,
        },
    });
    const volume = (await createAndCacheVolume(volumeId, {
        imageIds,
    }));
    volume.load();
    const volumeViewport = renderingEngine.getViewport(viewportId);
    await setVolumesForViewports(renderingEngine, [
        {
            volumeId,
        },
    ], [viewportId]);
    const volumeViewportNewVolumeHandler = () => {
        volumeViewport.render();
        element.removeEventListener(Events.VOLUME_VIEWPORT_NEW_VOLUME, volumeViewportNewVolumeHandler);
    };
    const addVolumeViewportNewVolumeListener = () => {
        element.addEventListener(Events.VOLUME_VIEWPORT_NEW_VOLUME, volumeViewportNewVolumeHandler);
    };
    addVolumeViewportNewVolumeListener();
    volumeViewport.setViewPresentation(prevViewPresentation);
    volumeViewport.setViewReference(prevViewReference);
    volumeViewport.render();
    return volumeViewport;
}
export { convertStackToVolumeViewport };
