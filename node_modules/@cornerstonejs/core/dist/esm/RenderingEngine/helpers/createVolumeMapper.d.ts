import type vtkImageData from '@kitware/vtk.js/Common/DataModel/ImageData';
import type vtkOpenGLTexture from '@kitware/vtk.js/Rendering/OpenGL/Texture';
import vtkVolumeMapper from '@kitware/vtk.js/Rendering/Core/VolumeMapper';
export default function createVolumeMapper(imageData: vtkImageData, vtkOpenGLTexture: vtkOpenGLTexture): vtkVolumeMapper;
export declare function convertMapperToNotSharedMapper(sharedMapper: vtkVolumeMapper): vtkVolumeMapper;
