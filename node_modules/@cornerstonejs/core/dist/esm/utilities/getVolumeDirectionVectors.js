import { vec3 } from 'gl-matrix';
import { transformWorldToIndexContinuous } from './transformWorldToIndex';
function getVolumeDirectionVectors(imageData, camera) {
    const { viewUp, viewPlaneNormal } = camera;
    const ijkOrigin = transformWorldToIndexContinuous(imageData, [0, 0, 0]);
    const worldVecColDir = vec3.negate(vec3.create(), viewUp);
    const worldVecSliceDir = vec3.negate(vec3.create(), viewPlaneNormal);
    const worldVecRowDir = vec3.cross(vec3.create(), worldVecColDir, worldVecSliceDir);
    const ijkVecColDir = vec3.sub(vec3.create(), transformWorldToIndexContinuous(imageData, worldVecColDir), ijkOrigin);
    const ijkVecSliceDir = vec3.sub(vec3.create(), transformWorldToIndexContinuous(imageData, worldVecSliceDir), ijkOrigin);
    vec3.normalize(ijkVecColDir, ijkVecColDir);
    vec3.normalize(ijkVecSliceDir, ijkVecSliceDir);
    const ijkVecRowDir = vec3.cross(vec3.create(), ijkVecColDir, ijkVecSliceDir);
    return {
        worldVecRowDir,
        worldVecColDir,
        worldVecSliceDir,
        ijkVecRowDir,
        ijkVecColDir,
        ijkVecSliceDir,
    };
}
export { getVolumeDirectionVectors as default, getVolumeDirectionVectors };
