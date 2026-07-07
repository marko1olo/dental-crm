import type { Point3, IContour, ContourData } from '../../types';
interface ContourSetProps {
    id: string;
    data: ContourData[];
    frameOfReferenceUID: string;
    segmentIndex: number;
    color?: Point3;
}
export declare class ContourSet {
    readonly id: string;
    readonly sizeInBytes: number;
    readonly frameOfReferenceUID: string;
    private _color;
    private _segmentIndex;
    private _centroid;
    private _contours;
    constructor(props: ContourSetProps);
    private _createEachContour;
    private _updateContourSetCentroid;
    private _getSizeInBytes;
    private _getDistance;
    get centroid(): Point3;
    get segmentIndex(): number;
    get color(): Point3;
    set color(value: Point3);
    get contours(): IContour[];
    get flatPointsArray(): Point3[];
    get numberOfContours(): number;
    get totalNumberOfPoints(): number;
    get numberOfPointsArray(): number[];
    getPointsInContour(contourIndex: number): Point3[];
    getNumberOfPointsInAContour(contourIndex: number): number;
}
export default ContourSet;
