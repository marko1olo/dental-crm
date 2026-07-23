import { MeshType } from '../../../enums';
export function validateMesh(meshData) {
    if (!meshData.id) {
        throw new Error('Mesh must have an id');
    }
    if (!meshData.arrayBuffer) {
        throw new Error('Mesh must have an arrayBuffer');
    }
    if (!(meshData.format in MeshType)) {
        throw new Error(`Mesh format must be one of the following: ${Object.values(MeshType).join(', ')}`);
    }
}
