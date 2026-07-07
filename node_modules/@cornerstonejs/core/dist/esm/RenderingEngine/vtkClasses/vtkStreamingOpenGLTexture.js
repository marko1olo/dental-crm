import macro from '@kitware/vtk.js/macros';
import vtkOpenGLTexture from '@kitware/vtk.js/Rendering/OpenGL/Texture';
import cache from '../../cache/cache';
import { getConstructorFromType } from '../../utilities/getBufferConfiguration';
function convertDataType(data, targetDataType) {
    const Constructor = getConstructorFromType(targetDataType);
    const convertedData = new Constructor(data.length);
    convertedData.set(data);
    return convertedData;
}
function vtkStreamingOpenGLTexture(publicAPI, model) {
    model.classHierarchy.push('vtkStreamingOpenGLTexture');
    model.updatedFrames = [];
    model.volumeId = null;
    const superCreate3DFilterableFromRaw = publicAPI.create3DFilterableFromRaw;
    publicAPI.create3DFilterableFromRaw = ({ width, height, depth, numberOfComponents, dataType, data, preferSizeOverAccuracy, }) => {
        model.inputDataType = dataType;
        model.inputNumComps = numberOfComponents;
        superCreate3DFilterableFromRaw({
            width,
            height,
            depth,
            numberOfComponents,
            dataType,
            data,
            preferSizeOverAccuracy,
        });
    };
    const superUpdate = publicAPI.updateVolumeInfoForGL;
    publicAPI.updateVolumeInfoForGL = (dataType, numComps) => {
        const isScalingApplied = superUpdate(dataType, numComps);
        model.volumeInfo.dataComputedScale = [1];
        model.volumeInfo.dataComputedOffset = [0];
        return isScalingApplied;
    };
    publicAPI.update3DFromRaw = () => {
        const { volumeId } = model;
        if (!volumeId) {
            return;
        }
        const volume = cache.getVolume(volumeId);
        if (!volume) {
            return;
        }
        model._openGLRenderWindow.activateTexture(publicAPI);
        publicAPI.createTexture();
        publicAPI.bind();
        if (volume.isDynamicVolume()) {
            updateDynamicVolumeTexture();
            return;
        }
        return (publicAPI.hasUpdatedFrames() && updateTextureImagesUsingVoxelManager());
    };
    const superModified = publicAPI.modified;
    publicAPI.setUpdatedFrame = (frameIndex) => {
        model.updatedFrames[frameIndex] = true;
        superModified();
    };
    publicAPI.modified = () => {
        superModified();
        const volume = cache.getVolume(model.volumeId);
        if (!volume) {
            return;
        }
        const imageIds = volume.imageIds;
        for (let i = 0; i < imageIds.length; i++) {
            model.updatedFrames[i] = true;
        }
    };
    function updateTextureImagesUsingVoxelManager() {
        const volume = cache.getVolume(model.volumeId);
        const imageIds = volume.imageIds;
        for (let i = 0; i < model.updatedFrames.length; i++) {
            if (model.updatedFrames[i]) {
                const image = cache.getImage(imageIds[i]);
                if (!image) {
                    continue;
                }
                let data = image.voxelManager.getScalarData();
                const gl = model.context;
                if (volume.dataType !== data.constructor.name) {
                    data = convertDataType(data, volume.dataType);
                }
                const [pixData] = publicAPI.updateArrayDataTypeForGL(volume.dataType, [
                    data,
                ]);
                publicAPI.bind();
                const zOffset = i;
                gl.texSubImage3D(model.target, 0, 0, 0, zOffset, model.width, model.height, 1, model.format, model.openGLDataType, pixData);
                publicAPI.deactivate();
                model.updatedFrames[i] = null;
            }
        }
        if (model.generateMipmap) {
            model.context.generateMipmap(model.target);
        }
        publicAPI.deactivate();
        return true;
    }
    function updateDynamicVolumeTexture() {
        const volume = cache.getVolume(model.volumeId);
        const imageIds = volume.getCurrentDimensionGroupImageIds();
        if (!imageIds.length) {
            return false;
        }
        let constructor;
        for (let i = 0; i < imageIds.length; i++) {
            const imageId = imageIds[i];
            const image = cache.getImage(imageId);
            let data;
            if (!image) {
                constructor = getConstructorFromType(volume.dataType, true);
                data = new constructor(model.width * model.height);
            }
            else {
                data = image.voxelManager.getScalarData();
                constructor = data.constructor;
            }
            const gl = model.context;
            if (volume.dataType !== data.constructor.name) {
                data = convertDataType(data, volume.dataType);
            }
            const [pixData] = publicAPI.updateArrayDataTypeForGL(volume.dataType, [
                data,
            ]);
            publicAPI.bind();
            let zOffset = i;
            gl.texSubImage3D(model.target, 0, 0, 0, zOffset, model.width, model.height, 1, model.format, model.openGLDataType, pixData);
            publicAPI.deactivate();
        }
        if (model.generateMipmap) {
            model.context.generateMipmap(model.target);
        }
        publicAPI.deactivate();
        return true;
    }
    publicAPI.hasUpdatedFrames = () => !model.updatedFrames.length || model.updatedFrames.some((frame) => frame);
    publicAPI.getUpdatedFrames = () => model.updatedFrames;
    publicAPI.setVolumeId = (volumeId) => {
        model.volumeId = volumeId;
    };
    publicAPI.getVolumeId = () => model.volumeId;
    publicAPI.setTextureParameters = ({ width, height, depth, numberOfComponents, dataType, }) => {
        model.width ??= width;
        model.height ??= height;
        model.depth ??= depth;
        model.inputNumComps ??= numberOfComponents;
        model.inputDataType ??= dataType;
    };
    publicAPI.getTextureParameters = () => ({
        width: model.width,
        height: model.height,
        depth: model.depth,
        numberOfComponents: model.inputNumComps,
        dataType: model.inputDataType,
    });
}
const DEFAULT_VALUES = {
    updatedFrames: [],
};
export function extend(publicAPI, model, initialValues = {}) {
    Object.assign(model, DEFAULT_VALUES, initialValues);
    vtkOpenGLTexture.extend(publicAPI, model, initialValues);
    vtkStreamingOpenGLTexture(publicAPI, model);
}
export const newInstance = macro.newInstance(extend, 'vtkStreamingOpenGLTexture');
export default { newInstance, extend };
