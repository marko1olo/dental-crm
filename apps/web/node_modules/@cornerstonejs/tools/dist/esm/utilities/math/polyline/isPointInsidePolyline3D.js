import containsPoint from './containsPoint';
import { projectTo2D } from './projectTo2D';
export function isPointInsidePolyline3D(point, polyline, options = {}) {
    const { sharedDimensionIndex, projectedPolyline } = projectTo2D(polyline);
    const { holes } = options;
    const projectedHoles = [];
    if (holes) {
        for (let i = 0; i < holes.length; i++) {
            const hole = holes[i];
            const hole2D = [];
            for (let j = 0; j < hole.length; j++) {
                hole2D.push([
                    hole[j][(sharedDimensionIndex + 1) % 3],
                    hole[j][(sharedDimensionIndex + 2) % 3],
                ]);
            }
            projectedHoles.push(hole2D);
        }
    }
    const point2D = [
        point[(sharedDimensionIndex + 1) % 3],
        point[(sharedDimensionIndex + 2) % 3],
    ];
    return containsPoint(projectedPolyline, point2D, { holes: projectedHoles });
}
