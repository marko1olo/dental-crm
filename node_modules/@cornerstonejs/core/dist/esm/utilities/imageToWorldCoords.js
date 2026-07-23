import { vec3 } from 'gl-matrix';
import { get } from '../metaData';
export default function imageToWorldCoords(imageId, imageCoords) {
    const imagePlaneModule = get('imagePlaneModule', imageId);
    if (!imagePlaneModule) {
        throw new Error(`No imagePlaneModule found for imageId: ${imageId}`);
    }
    const { columnCosines, rowCosines, imagePositionPatient: origin, } = imagePlaneModule;
    let { columnPixelSpacing, rowPixelSpacing } = imagePlaneModule;
    columnPixelSpacing ||= 1;
    rowPixelSpacing ||= 1;
    const imageCoordsInWorld = vec3.create();
    vec3.scaleAndAdd(imageCoordsInWorld, origin, rowCosines, rowPixelSpacing * (imageCoords[0] - 0.5));
    vec3.scaleAndAdd(imageCoordsInWorld, imageCoordsInWorld, columnCosines, columnPixelSpacing * (imageCoords[1] - 0.5));
    return Array.from(imageCoordsInWorld);
}
