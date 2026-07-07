import Contour from './Contour';
export class ContourSet {
    constructor(props) {
        this._color = [200, 0, 0];
        this.id = props.id;
        this._contours = [];
        this._color = props.color ?? this._color;
        this.frameOfReferenceUID = props.frameOfReferenceUID;
        this._segmentIndex = props.segmentIndex;
        this._createEachContour(props.data);
        this.sizeInBytes = this._getSizeInBytes();
    }
    _createEachContour(contourDataArray) {
        contourDataArray.forEach((contourData) => {
            const { points, type, color } = contourData;
            const contour = new Contour({
                id: `${this.id}-segment-${this._segmentIndex}`,
                data: {
                    points,
                    type,
                    segmentIndex: this._segmentIndex,
                    color: color ?? this._color,
                },
                segmentIndex: this._segmentIndex,
                color: color ?? this._color,
            });
            this._contours.push(contour);
        });
        this._updateContourSetCentroid();
    }
    _updateContourSetCentroid() {
        const numberOfPoints = this.totalNumberOfPoints;
        const flatPointsArray = this.flatPointsArray;
        const sumOfPoints = flatPointsArray.reduce((acc, point) => {
            return [acc[0] + point[0], acc[1] + point[1], acc[2] + point[2]];
        }, [0, 0, 0]);
        const centroid = [
            sumOfPoints[0] / numberOfPoints,
            sumOfPoints[1] / numberOfPoints,
            sumOfPoints[2] / numberOfPoints,
        ];
        const closestPoint = flatPointsArray.reduce((closestPoint, point) => {
            const distanceToPoint = this._getDistance(centroid, point);
            const distanceToClosestPoint = this._getDistance(centroid, closestPoint);
            if (distanceToPoint < distanceToClosestPoint) {
                return point;
            }
            else {
                return closestPoint;
            }
        }, flatPointsArray[0]);
        this._centroid = closestPoint;
    }
    _getSizeInBytes() {
        return this._contours.reduce((sizeInBytes, contour) => {
            return sizeInBytes + contour.sizeInBytes;
        }, 0);
    }
    _getDistance(pointA, pointB) {
        return Math.sqrt((pointA[0] - pointB[0]) ** 2 +
            (pointA[1] - pointB[1]) ** 2 +
            (pointA[2] - pointB[2]) ** 2);
    }
    get centroid() {
        return this._centroid;
    }
    get segmentIndex() {
        return this._segmentIndex;
    }
    get color() {
        return this._color;
    }
    set color(value) {
        this._color = value;
        this._contours.forEach((contour) => {
            if (contour instanceof Contour) {
                contour.color = value;
            }
        });
    }
    get contours() {
        return this._contours;
    }
    get flatPointsArray() {
        return this._contours.flatMap((contour) => contour.points);
    }
    get numberOfContours() {
        return this._contours.length;
    }
    get totalNumberOfPoints() {
        return this._contours.reduce((numberOfPoints, contour) => {
            return numberOfPoints + contour.points.length;
        }, 0);
    }
    get numberOfPointsArray() {
        return this._contours.map((contour) => contour.points.length);
    }
    getPointsInContour(contourIndex) {
        return this._contours[contourIndex].points;
    }
    getNumberOfPointsInAContour(contourIndex) {
        return this.getPointsInContour(contourIndex).length;
    }
}
export default ContourSet;
