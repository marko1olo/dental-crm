import { getSignedArea } from '../math/polyline';
export default function reverseIfAntiClockwise(points, ...otherListsToReverse) {
    const signedArea = getSignedArea(points);
    if (signedArea < 0) {
        if (otherListsToReverse) {
            otherListsToReverse.forEach((list) => list.reverse());
        }
        return points.slice().reverse();
    }
    return points;
}
