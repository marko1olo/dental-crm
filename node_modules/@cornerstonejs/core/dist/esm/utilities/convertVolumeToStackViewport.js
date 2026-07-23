import cache from '../cache/cache';
import { ImageVolume } from '../cache/classes/ImageVolume';
import { ViewportType } from '../enums';
async function convertVolumeToStackViewport({ viewport, options, }) {
    const volumeViewport = viewport;
    const { id, element } = volumeViewport;
    const renderingEngine = viewport.getRenderingEngine();
    const { background } = options;
    const viewportId = options.viewportId || id;
    const volume = cache.getVolume(volumeViewport.getVolumeId());
    if (!(volume instanceof ImageVolume)) {
        throw new Error('Currently, you cannot decache a volume that is not an ImageVolume. So, unfortunately, volumes such as nifti  (which are basic Volume, without imageIds) cannot be decached.');
    }
    const viewportInput = {
        viewportId,
        type: ViewportType.STACK,
        element,
        defaultOptions: {
            background,
        },
    };
    const prevView = volumeViewport.getViewReference();
    renderingEngine.enableElement(viewportInput);
    const stackViewport = renderingEngine.getViewport(viewportId);
    await stackViewport.setStack(volume.imageIds);
    stackViewport.setViewReference(prevView);
    stackViewport.render();
    return stackViewport;
}
export { convertVolumeToStackViewport };
