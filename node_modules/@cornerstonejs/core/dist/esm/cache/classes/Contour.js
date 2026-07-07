export class Contour {
    constructor(props) {
        const { points, type } = props.data;
        this.id = props.id;
        this._points = points;
        this._type = type;
        this._color = props.color;
        this._segmentIndex = props.segmentIndex;
        this.sizeInBytes = this._getSizeInBytes();
    }
    _getSizeInBytes() {
        return this._points.length * 3;
    }
    get points() {
        return this._points;
    }
    set points(value) {
        this._points = value;
    }
    get color() {
        return this._color;
    }
    set color(value) {
        this._color = value;
    }
    get type() {
        return this._type;
    }
    set type(value) {
        this._type = value;
    }
    get segmentIndex() {
        return this._segmentIndex;
    }
    set segmentIndex(value) {
        this._segmentIndex = value;
    }
    get flatPointsArray() {
        return this._points.map((point) => [...point]).flat();
    }
}
export default Contour;
