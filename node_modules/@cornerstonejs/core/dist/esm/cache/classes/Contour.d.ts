import type { Point3, ContourData } from '../../types';
import type { ContourType } from '../../enums';
interface ContourProps {
    id: string;
    data: ContourData;
    color: Point3;
    segmentIndex: number;
}
export declare class Contour {
    readonly id: string;
    readonly sizeInBytes: number;
    private _points;
    private _color;
    private _type;
    private _segmentIndex;
    constructor(props: ContourProps);
    private _getSizeInBytes;
    get points(): Point3[];
    set points(value: Point3[]);
    get color(): Point3;
    set color(value: Point3);
    get type(): ContourType;
    set type(value: ContourType);
    get segmentIndex(): number;
    set segmentIndex(value: number);
    get flatPointsArray(): number[];
}
export default Contour;
