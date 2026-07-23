export class Surface {
    constructor(props) {
        this._color = [200, 0, 0];
        this.id = props.id;
        this._points = props.points;
        this._polys = props.polys;
        this._color = props.color ?? this._color;
        this.frameOfReferenceUID = props.frameOfReferenceUID;
        this._segmentIndex = props.segmentIndex;
        this.sizeInBytes = this._getSizeInBytes();
        this._updateCentroid();
        this._visible = true;
    }
    _getSizeInBytes() {
        return this._points.length * 4 + this._polys.length * 4;
    }
    _updateCentroid() {
        const numberOfPoints = this._points.length / 3;
        let sumX = 0, sumY = 0, sumZ = 0;
        for (let i = 0; i < this._points.length; i += 3) {
            sumX += this._points[i];
            sumY += this._points[i + 1];
            sumZ += this._points[i + 2];
        }
        this._centroid = [
            sumX / numberOfPoints,
            sumY / numberOfPoints,
            sumZ / numberOfPoints,
        ];
    }
    get color() {
        return this._color;
    }
    set color(color) {
        this._color = color;
    }
    get points() {
        return this._points;
    }
    set points(points) {
        this._points = points;
        this._updateCentroid();
    }
    get polys() {
        return this._polys;
    }
    set polys(polys) {
        this._polys = polys;
    }
    get segmentIndex() {
        return this._segmentIndex;
    }
    get visible() {
        return this._visible;
    }
    set visible(visible) {
        this._visible = visible;
    }
    get centroid() {
        return this._centroid;
    }
    get flatPointsArray() {
        return this._points;
    }
    get totalNumberOfPoints() {
        return this._points.length / 3;
    }
}
