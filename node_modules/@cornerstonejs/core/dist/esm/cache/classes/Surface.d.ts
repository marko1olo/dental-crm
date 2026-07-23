import type { SurfaceData, Point3, RGB } from '../../types';
type SurfaceProps = SurfaceData;
export declare class Surface {
    readonly id: string;
    readonly sizeInBytes: number;
    readonly frameOfReferenceUID: string;
    private _color;
    private _points;
    private _polys;
    private _segmentIndex;
    private _centroid;
    private _visible;
    constructor(props: SurfaceProps);
    private _getSizeInBytes;
    private _updateCentroid;
    get color(): RGB;
    set color(color: RGB);
    get points(): number[];
    set points(points: number[]);
    get polys(): number[];
    set polys(polys: number[]);
    get segmentIndex(): number;
    get visible(): boolean;
    set visible(visible: boolean);
    get centroid(): Point3;
    get flatPointsArray(): number[];
    get totalNumberOfPoints(): number;
}
export {};
