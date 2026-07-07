import { glMatrix, vec3 } from 'gl-matrix';
import { transformCanvasToIJK } from './transformCanvasToIJK';
function getCurrentVolumeViewportSlice(viewport) {
    const { width: canvasWidth, height: canvasHeight } = viewport.getCanvas();
    const { sliceToIndexMatrix, indexToSliceMatrix } = viewport.getSliceViewInfo();
    const ijkOriginPoint = transformCanvasToIJK(viewport, [0, 0]);
    const ijkRowPoint = transformCanvasToIJK(viewport, [canvasWidth - 1, 0]);
    const ijkColPoint = transformCanvasToIJK(viewport, [0, canvasHeight - 1]);
    const ijkRowVec = vec3.sub(vec3.create(), ijkRowPoint, ijkOriginPoint);
    const ijkColVec = vec3.sub(vec3.create(), ijkColPoint, ijkOriginPoint);
    const ijkSliceVec = vec3.cross(vec3.create(), ijkRowVec, ijkColVec);
    vec3.normalize(ijkRowVec, ijkRowVec);
    vec3.normalize(ijkColVec, ijkColVec);
    vec3.normalize(ijkSliceVec, ijkSliceVec);
    const maxIJKRowVec = Math.max(Math.abs(ijkRowVec[0]), Math.abs(ijkRowVec[1]), Math.abs(ijkRowVec[2]));
    const maxIJKColVec = Math.max(Math.abs(ijkColVec[0]), Math.abs(ijkColVec[1]), Math.abs(ijkColVec[2]));
    if (!glMatrix.equals(1, maxIJKRowVec) || !glMatrix.equals(1, maxIJKColVec)) {
        throw new Error('Livewire is not available for rotate/oblique viewports');
    }
    const { voxelManager } = viewport.getImageData();
    const sliceViewInfo = viewport.getSliceViewInfo();
    const scalarData = voxelManager.getSliceData(sliceViewInfo);
    return {
        width: sliceViewInfo.width,
        height: sliceViewInfo.height,
        scalarData,
        sliceToIndexMatrix,
        indexToSliceMatrix,
    };
}
export { getCurrentVolumeViewportSlice as default, getCurrentVolumeViewportSlice, };
