import { distanceToPoint } from '../point';
export default function getCanvasCircleRadius(circleCanvasPoints) {
    const [center, end] = circleCanvasPoints;
    return distanceToPoint(center, end);
}
