import { vec3 } from 'gl-matrix';
declare function getVolumeDirectionVectors(imageData: any, camera: any): {
    worldVecRowDir: vec3;
    worldVecColDir: vec3;
    worldVecSliceDir: vec3;
    ijkVecRowDir: vec3;
    ijkVecColDir: vec3;
    ijkVecSliceDir: vec3;
};
export { getVolumeDirectionVectors as default, getVolumeDirectionVectors };
