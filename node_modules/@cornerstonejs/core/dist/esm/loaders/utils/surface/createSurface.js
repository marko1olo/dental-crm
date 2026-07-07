import { GeometryType } from '../../../enums';
import { validateSurface } from './validateSurface';
import { Surface } from '../../../cache/classes/Surface';
export function createSurface(geometryId, surfaceData) {
    validateSurface(surfaceData);
    const surface = new Surface({
        id: surfaceData.id,
        points: surfaceData.points,
        polys: surfaceData.polys,
        color: surfaceData.color,
        frameOfReferenceUID: surfaceData.frameOfReferenceUID,
        segmentIndex: surfaceData.segmentIndex ?? 1,
    });
    const geometry = {
        id: geometryId,
        type: GeometryType.SURFACE,
        data: surface,
        sizeInBytes: surface.sizeInBytes,
    };
    return geometry;
}
