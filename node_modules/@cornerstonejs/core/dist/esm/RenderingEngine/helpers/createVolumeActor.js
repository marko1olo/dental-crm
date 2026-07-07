import vtkVolume from '@kitware/vtk.js/Rendering/Core/Volume';
import { loadVolume } from '../../loaders/volumeLoader';
import createVolumeMapper from './createVolumeMapper';
import triggerEvent from '../../utilities/triggerEvent';
import { Events } from '../../enums';
import setDefaultVolumeVOI from './setDefaultVolumeVOI';
import { getConfiguration } from '../../init';
async function createVolumeActor(props, element, viewportId, suppressEvents = false) {
    const { volumeId, callback, blendMode } = props;
    const imageVolume = await loadVolume(volumeId);
    if (!imageVolume) {
        throw new Error(`imageVolume with id: ${imageVolume.volumeId} does not exist`);
    }
    const { imageData, vtkOpenGLTexture } = imageVolume;
    const volumeMapper = createVolumeMapper(imageData, vtkOpenGLTexture);
    if (blendMode) {
        volumeMapper.setBlendMode(blendMode);
    }
    const volumeActor = vtkVolume.newInstance();
    volumeActor.setMapper(volumeMapper);
    const { numberOfComponents } = imageData.get('numberOfComponents');
    const volumeProperty = volumeActor.getProperty();
    volumeProperty.set({ viewportId: viewportId }, true);
    if (getConfiguration().rendering.preferSizeOverAccuracy) {
        volumeProperty.setPreferSizeOverAccuracy(true);
    }
    if (numberOfComponents === 3) {
        volumeActor.getProperty().setIndependentComponents(false);
    }
    await setDefaultVolumeVOI(volumeActor, imageVolume);
    if (callback) {
        callback({ volumeActor, volumeId });
    }
    if (!suppressEvents) {
        triggerVOIModified(element, viewportId, volumeActor, volumeId);
    }
    return volumeActor;
}
function triggerVOIModified(element, viewportId, volumeActor, volumeId) {
    const voiRange = volumeActor
        .getProperty()
        .getRGBTransferFunction(0)
        .getRange();
    const voiModifiedEventDetail = {
        viewportId,
        range: {
            lower: voiRange[0],
            upper: voiRange[1],
        },
        volumeId,
    };
    triggerEvent(element, Events.VOI_MODIFIED, voiModifiedEventDetail);
}
export default createVolumeActor;
