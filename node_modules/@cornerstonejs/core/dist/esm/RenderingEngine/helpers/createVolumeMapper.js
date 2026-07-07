import { vtkSharedVolumeMapper } from '../vtkClasses';
import { getConfiguration } from '../../init';
import vtkVolumeMapper from '@kitware/vtk.js/Rendering/Core/VolumeMapper';
import vtkDataArray from '@kitware/vtk.js/Common/Core/DataArray';
export default function createVolumeMapper(imageData, vtkOpenGLTexture) {
    const volumeMapper = vtkSharedVolumeMapper.newInstance();
    volumeMapper.setInputData(imageData);
    const spacing = imageData.getSpacing();
    const sampleDistanceMultiplier = getConfiguration().rendering?.volumeRendering?.sampleDistanceMultiplier ||
        1;
    const sampleDistance = (sampleDistanceMultiplier * (spacing[0] + spacing[1] + spacing[2])) / 6;
    volumeMapper.setMaximumSamplesPerRay(4000);
    volumeMapper.setSampleDistance(sampleDistance);
    volumeMapper.setScalarTexture(vtkOpenGLTexture);
    return volumeMapper;
}
export function convertMapperToNotSharedMapper(sharedMapper) {
    const volumeMapper = vtkVolumeMapper.newInstance();
    volumeMapper.setBlendMode(sharedMapper.getBlendMode());
    const imageData = sharedMapper.getInputData();
    const { voxelManager } = imageData.get('voxelManager');
    const values = voxelManager.getCompleteScalarDataArray();
    const scalarArray = vtkDataArray.newInstance({
        name: `Pixels`,
        values,
    });
    imageData.getPointData().setScalars(scalarArray);
    volumeMapper.setInputData(imageData);
    volumeMapper.setMaximumSamplesPerRay(sharedMapper.getMaximumSamplesPerRay());
    volumeMapper.setSampleDistance(sharedMapper.getSampleDistance());
    return volumeMapper;
}
