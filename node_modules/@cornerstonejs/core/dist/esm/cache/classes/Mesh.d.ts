import vtkActor from '@kitware/vtk.js/Rendering/Core/Actor';
import type { MeshData, RGB } from '../../types';
type MeshProps = MeshData;
export declare class Mesh {
    readonly id: string;
    readonly sizeInBytes: number;
    private _color;
    private _actors;
    private _format;
    constructor(props: MeshProps);
    private _getSizeInBytes;
    get defaultActor(): vtkActor;
    get actors(): vtkActor[];
    get color(): RGB;
    get format(): string;
}
export {};
